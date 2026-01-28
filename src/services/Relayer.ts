import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from "@aptos-labs/ts-sdk";
import chalk from "chalk";
import axios from "axios";
import { OrderBook } from "./OrderBook";
import { PriceService } from "./PriceService";

const REGISTRY_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";

export class RelayerService {
    private client: Aptos;
    public account: Account;
    public orderHistory: any[] = [];
    public orderBook: OrderBook; // [NEW] OrderBook
    public priceService: PriceService; // [NEW] PriceService
    public matchingInterval: NodeJS.Timeout | null = null;

    constructor() {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: "https://testnet.movementnetwork.xyz/v1"
        });
        this.client = new Aptos(config);

        // Load Relayer Account from Env or Generate (for demo purposes)
        // In prod this would be process.env.RELAYER_PRIVATE_KEY
        if (process.env.RELAYER_PRIVATE_KEY) {
            const privateKey = new Ed25519PrivateKey(process.env.RELAYER_PRIVATE_KEY);
            this.account = Account.fromPrivateKey({ privateKey });
        } else {
            // For demo, generate a random one if not set
            this.account = Account.generate();
            console.log(chalk.yellow("⚠️  No RELAYER_PRIVATE_KEY set, using ephemeral account. Funding needed for execution!"));
        }

        console.log(chalk.blue(`🤖 Relayer Service Initialized: ${this.account.accountAddress.toString()}`));

        this.orderBook = new OrderBook();
        this.priceService = new PriceService();

        this.checkBalanceAndFund();
        this.startMatchingLoop();
    }

    /**
     * Start the matching loop to check and fill orders
     */
    startMatchingLoop() {
        if (this.matchingInterval) return;

        console.log(chalk.magenta("🔄 Starting Matching Loop..."));
        this.matchingInterval = setInterval(async () => {
            await this.processOpenOrders();
        }, 5000); // Check every 5 seconds
    }

    async processOpenOrders() {
        const orders = this.orderBook.getOrders();
        if (orders.length === 0) return;

        const now = Math.floor(Date.now() / 1000);
        this.orderBook.prune(now);

        for (const order of orders) {
            // Re-check profitability and try to execute
            try {
                // 0. Check Maker Escrow Balance
                // If they withdrew funds, we can't fill it. Prune it.
                const makerBalance = await this.getMakerEscrowBalance(order.intent.maker, order.intent.sell_token_type);
                if (makerBalance < Number(order.intent.sell_amount)) {
                    console.log(chalk.red(`❌ Order ${order.id.slice(0, 8)} invalidated: Insufficient Escrow Balance. Pruning.`));
                    this.orderBook.removeOrder(order.id);
                    continue;
                }

                // 1. Check Profitability (routes to correct check for limit vs market)
                const isProfitable = await this.checkProfitability(order.intent);
                if (!isProfitable) {
                    process.stdout.write("."); // tick
                    continue;
                }

                // Detect order type to call correct execution function
                const isLimitOrder = order.intent.start_buy_amount === undefined && order.intent.buy_amount !== undefined;

                console.log(chalk.green(`\n💰 Found Fillable ${isLimitOrder ? 'LIMIT' : 'MARKET'} Order! Executing ${order.id.slice(0, 8)}...`));

                // 2. Execute with correct function
                if (isLimitOrder) {
                    await this.executeLimitOrder(order.intent, order.signature, order.publicKey, order.signingNonce);
                } else {
                    await this.executeOrder(order.intent, order.signature, order.publicKey, order.signingNonce);
                }

                // 3. Remove if successful
                this.orderBook.removeOrder(order.id);

            } catch (e: any) {
                console.warn(chalk.yellow(`Warning: Failed to fill order ${order.id.slice(0, 8)}: ${e.message}`));
                // Keep in book to retry unless it's a permanent error
            }
        }
    }

    /**
     * Check if an order is profitable for the Relayer
     * Routes to appropriate check based on order type
     */
    async checkProfitability(intent: any): Promise<boolean> {
        // Detect if this is a limit order
        const isLimitOrder = intent.start_buy_amount === undefined && intent.buy_amount !== undefined;

        if (isLimitOrder) {
            return this.checkLimitOrderProfitability(intent);
        } else {
            return this.checkMarketOrderProfitability(intent);
        }
    }

    /**
     * Check if a LIMIT ORDER should be filled
     * Compares the user's limit price with current Pyth market price
     * Fills if market price is within ±0.5% of the limit price
     */
    async checkLimitOrderProfitability(intent: any): Promise<boolean> {
        const sellType = intent.sell_token_type;
        const buyType = intent.buy_token_type;

        const sellPrice = await this.priceService.getPrice(sellType);
        const buyPrice = await this.priceService.getPrice(buyType);

        if (sellPrice === 0 || buyPrice === 0) {
            console.log(chalk.yellow(`⚠️ Limit Order: Price unavailable for ${sellType} or ${buyType}`));
            return false;
        }

        const sellDecimals = this.getDecimals(sellType);
        const buyDecimals = this.getDecimals(buyType);

        // Calculate the user's stated limit rate (what they want)
        const sellAmountNormalized = Number(intent.sell_amount) / Math.pow(10, sellDecimals);
        const buyAmountNormalized = Number(intent.buy_amount) / Math.pow(10, buyDecimals);

        // User's limit: How much they want to receive per unit sold
        const userLimitRate = buyAmountNormalized / sellAmountNormalized; // e.g. 3100 USDC per 1 WETH

        // Current market rate from Pyth (how much buy token per sell token)
        // marketRate = sellPrice / buyPrice (e.g. WETH=3050, USDC=1 -> 3050 USDC per WETH)
        const marketRate = sellPrice / buyPrice;

        // For a SELL order (user selling sell_token to get buy_token):
        // Fill if marketRate >= userLimitRate (market gives at least what user wants)
        // But we allow ±0.5% tolerance for slight price movements

        const deviation = (marketRate - userLimitRate) / userLimitRate;
        const TOLERANCE = 0.005; // ±0.5%

        // Fill if the market rate is: 
        // - At or above the limit price (profitable for user)
        // - Or within 0.5% below the limit price (acceptable slippage)
        const shouldFill = deviation >= -TOLERANCE;

        console.log(chalk.cyan(`📊 Limit Order Check:`));
        console.log(chalk.cyan(`   User Limit Rate: ${userLimitRate.toFixed(4)}`));
        console.log(chalk.cyan(`   Market Rate (Pyth): ${marketRate.toFixed(4)}`));
        console.log(chalk.cyan(`   Deviation: ${(deviation * 100).toFixed(4)}%`));

        if (shouldFill) {
            console.log(chalk.green(`✅ Limit Order FILLABLE (within ±0.5% tolerance)`));
        } else {
            console.log(chalk.red(`❌ Limit Order NOT fillable (market ${(deviation * 100).toFixed(2)}% below limit)`));
        }

        return shouldFill;
    }

    /**
     * Check if a MARKET ORDER (Dutch Auction) is profitable for the Relayer
     * Profit = (SellAmount * SellPrice) - (BuyAmount * BuyPrice) - GasCost
     */
    async checkMarketOrderProfitability(intent: any): Promise<boolean> {
        const sellType = intent.sell_token_type;
        const buyType = intent.buy_token_type;

        const sellPrice = await this.priceService.getPrice(sellType);
        const buyPrice = await this.priceService.getPrice(buyType);

        if (sellPrice === 0 || buyPrice === 0) return false; // Price unavailable

        // Calculate Values in USD terms
        const sellDecimals = this.getDecimals(sellType);
        const buyDecimals = this.getDecimals(buyType);

        const sellValue = (intent.sell_amount / Math.pow(10, sellDecimals)) * sellPrice;

        // Calculate required buy amount at current time (Dutch Auction)
        const currentBuyAmount = this.calculateDutchAuctionPrice(intent);
        const buyValue = (currentBuyAmount / Math.pow(10, buyDecimals)) * buyPrice;

        // Profit Threshold:
        // Allow up to 3% loss for market orders (smoothness for demos)
        const margin = sellValue - buyValue;
        const marginPercent = margin / sellValue;

        const isProfitableOrWithinTolerance = marginPercent > -0.03;

        if (isProfitableOrWithinTolerance) {
            console.log(chalk.green(`✅ Market Order Accepted (Margin: ${(marginPercent * 100).toFixed(4)}%)`));
        } else {
            console.log(chalk.red(`❌ Market Order Rejected (Margin: ${(marginPercent * 100).toFixed(4)}% < -3%)`));
        }

        return isProfitableOrWithinTolerance;
    }

    calculateDutchAuctionPrice(intent: any, timestampOverride?: number): number {
        const now = timestampOverride || Math.floor(Date.now() / 1000);
        const start = intent.start_time;
        const end = intent.end_time;
        const startAmount = intent.start_buy_amount;
        const endAmount = intent.end_buy_amount;

        if (now <= start) return startAmount;
        if (now >= end) return endAmount;

        const duration = end - start;
        const elapsed = now - start;
        const drop = startAmount - endAmount;

        return Math.floor(startAmount - (drop * elapsed / duration));
    }

    getDecimals(type: string): number {
        const t = this.TOKENS.find(t => t.type === type);
        return t ? t.decimals : 8; // Default to 8
    }

    async submitOrder(intent: any, signatureStr: string, publicKeyStr: string, signingNonceStr: string, intentHash?: string) {
        // Detect Order Type
        // Limit Orders have 'buy_amount' but NO 'start_buy_amount'/'end_buy_amount'
        const isLimitOrder = intent.start_buy_amount === undefined && intent.buy_amount !== undefined;

        console.log(chalk.yellow(`📝 Received ${isLimitOrder ? 'LIMIT' : 'MARKET'} Order Submission...`));

        // STRATEGY:
        // 1. LIMIT ORDERS: Must be profitable (match price) to execute. If not, add to OrderBook.
        // 2. MARKET ORDERS: Execute IMMEDIATELY. Do not check profitability first (mimic old behavior).
        //    The Relayer assumes the risk/cost to ensure good UX.

        try {
            if (isLimitOrder) {
                // --- LIMIT ORDER LOGIC ---
                const isProfitable = await this.checkProfitability(intent);
                if (isProfitable) {
                    console.log(chalk.green(`💰 Limit Order Matched! Executing...`));
                    return await this.executeLimitOrder(intent, signatureStr, publicKeyStr, signingNonceStr);
                } else {
                    console.log(chalk.gray(`Limit Order price not matched yet. Adding to OrderBook.`));
                    throw new Error("Limit Order not profitable for immediate execution");
                }
            } else {
                // --- MARKET ORDER LOGIC ---
                console.log(chalk.green(`🚀 Market Order: Attempting IMMEDIATE execution (Bypassing profit check)...`));

                // Optional: Just log profitability for introspection, don't block
                this.checkMarketOrderProfitability(intent).then(isProf => {
                    if (!isProf) console.log(chalk.yellow("⚠️  Note: Market Order execution might be unprofitable for Relayer, but proceeding."));
                });

                return await this.executeOrder(intent, signatureStr, publicKeyStr, signingNonceStr);
            }
        } catch (error: any) {
            // Execution failed or Limit Order not ready -> OrderBook

            // For Market Orders, if execution failed (reverted), we still might want to add to OrderBook 
            // incase it was a temporary network issue, OR just fail. 
            // But standard behavior is: "If it fails now, add to book to retry later"

            const isExecutionError = error.message.includes("INSUFFICIENT_balance") ||
                error.message.includes("Sequence number too old") ||
                error.message.includes("Not profitable") ||
                true; // Catch-all for now to be safe

            if (isExecutionError) {
                // Use frontend-provided intentHash for consistency, fallback to random if not provided
                const orderHash = intentHash || ("0x" + Math.random().toString(16).slice(2));

                console.log(chalk.cyan(`⚠️  Immediate execution failed or deferred. Storing as Order with hash: ${orderHash.slice(0, 16)}...`));
                this.orderBook.addOrder(orderHash, intent, signatureStr, publicKeyStr, signingNonceStr);

                return {
                    status: "PENDING",
                    message: "Order queued in OrderBook",
                    orderHash
                };
            }
            throw error;
        }
    }

    // Market / Dutch Auction Execution
    async executeOrder(intent: any, signatureStr: string, publicKeyStr: string, signingNonceStr: string) {
        return this.executeOrderInternal(intent, signatureStr, publicKeyStr, signingNonceStr, false);
    }

    // Limit Order Execution
    async executeLimitOrder(intent: any, signatureStr: string, publicKeyStr: string, signingNonceStr: string) {
        return this.executeOrderInternal(intent, signatureStr, publicKeyStr, signingNonceStr, true);
    }

    // Shared Internal Execution Logic
    async executeOrderInternal(intent: any, signatureStr: string, publicKeyStr: string, signingNonceStr: string, isLimit: boolean) {
        try {
            await this.checkBalanceAndFund();

            const isSellFA = !intent.sell_token_type.includes("::");
            const isBuyFA = !intent.buy_token_type.includes("::");

            let funcName = "";
            let moduleName = isLimit ? "limit_order" : "swap"; // Route to correct module

            // Base function name prefix
            const prefix = isLimit ? "fill_limit_order" : "fill_order_v2"; // Note: v2 is for market, limit has its own

            let typeArguments: string[] = [intent.sell_token_type, intent.buy_token_type];

            // Base args common to all
            const baseArgs = [
                REGISTRY_ADDR,
                intent.maker,
                intent.nonce,
                this.hexToBytes(intent.sell_token),
                this.hexToBytes(intent.buy_token),
                intent.sell_amount
            ];

            if (isLimit) {
                // Limit Order Specific Args
                baseArgs.push(intent.buy_amount);
                baseArgs.push(intent.expiry_time); // Limit order uses expiry_time
            } else {
                // Market Order Specific Args
                baseArgs.push(intent.start_buy_amount);
                baseArgs.push(intent.end_buy_amount);
                baseArgs.push(intent.start_time);
                baseArgs.push(intent.end_time);
            }

            // Fill Amount - For Market it's usually "buy_amount" calculated or min?
            // Actually 'fill_order_v2' takes 'buy_amount' as the amount getting SWAPPED TO USER. (i.e. what relayer pays)
            // The limit contract `fill_limit_order` expects `fill_buy_amount`.

            // We need to calculate what we are paying.
            let payAmount = 0;
            if (isLimit) {
                payAmount = intent.buy_amount;
            } else {
                // Use a 'safety buffer' time for payment calculation.
                // If Relayer clock > Chain clock (common), we might calculate a LOWER price than required.
                // We use (now - 10s) to simulate being "earlier" in the auction, thus paying a HIGHER/SAFER price.
                payAmount = this.calculateDutchAuctionPrice(intent, Math.floor(Date.now() / 1000) - 10);
            }

            // Add the pay amount to args
            baseArgs.push(payAmount);

            // Add Signature stuff at the end
            baseArgs.push(this.hexToBytes(signatureStr));
            // Normalize public key (strip 0x00 prefix if 33 bytes)
            const normalizedPubKey = this.normalizePublicKey(publicKeyStr);
            baseArgs.push(this.hexToBytes(normalizedPubKey));
            baseArgs.push(this.hexToBytes(signingNonceStr));

            // Suffix logic for FA/Coin variants
            if (isSellFA && isBuyFA) {
                funcName = isLimit ? "fill_limit_order_fa_to_fa" : "fill_order_fa_to_fa";
                typeArguments = [];
                baseArgs.push(intent.sell_token_type);
                baseArgs.push(intent.buy_token_type);
            } else if (!isSellFA && isBuyFA) {
                funcName = isLimit ? "fill_limit_order_coin_to_fa" : "fill_order_coin_to_fa";
                typeArguments = [intent.sell_token_type];
                baseArgs.push(intent.buy_token_type);
            } else if (isSellFA && !isBuyFA) {
                funcName = isLimit ? "fill_limit_order_fa_to_coin" : "fill_order_fa_to_coin";
                typeArguments = [intent.buy_token_type];
                baseArgs.push(intent.sell_token_type);
            } else {
                // Coin-to-Coin
                funcName = isLimit ? "fill_limit_order" : "fill_order_v2";
                // typeArguments already set
            }

            console.log(`Calling ${moduleName}::${funcName} with types:`, typeArguments);

            const transaction = await this.client.transaction.build.simple({
                sender: this.account.accountAddress,
                data: {
                    function: `${REGISTRY_ADDR}::${moduleName}::${funcName}`,
                    typeArguments: typeArguments,
                    functionArguments: baseArgs
                },
                options: {
                    maxGasAmount: 200000,
                }
            });

            const startBalance = await this.getBalance();

            console.log("🚀 Submitting Transaction...");
            const commitedTxn = await this.client.signAndSubmitTransaction({
                signer: this.account,
                transaction,
            });

            console.log(chalk.green(`✅ Transaction Submitted: ${commitedTxn.hash}`));

            const executedTxn = await this.client.waitForTransaction({ transactionHash: commitedTxn.hash });
            console.log(`🎉 Transaction Confirmed! Status: ${(executedTxn as any).success ? 'Success' : 'Failed'}`);

            const endBalance = await this.getBalance();

            const sellDecimals = this.getDecimals(intent.sell_token_type);
            const buyDecimals = this.getDecimals(intent.buy_token_type);
            const sellVal = Number(intent.sell_amount) / Math.pow(10, sellDecimals);
            const buyVal = payAmount / Math.pow(10, buyDecimals);

            // Rate Calc
            const isSellStable = intent.sell_token_type.includes("USDC") || intent.sell_token_type.includes("USDT");
            const isBuyStable = intent.buy_token_type.includes("USDC") || intent.buy_token_type.includes("USDT");

            let executionPrice = 0;
            let executionRateLabel = "";

            if (isBuyStable && !isSellStable) {
                executionPrice = buyVal / sellVal;
                executionRateLabel = `${(buyVal / sellVal).toFixed(4)}`;
            } else if (isSellStable && !isBuyStable) {
                executionPrice = sellVal / buyVal;
                executionRateLabel = `${(sellVal / buyVal).toFixed(4)}`;
            } else {
                executionPrice = buyVal / sellVal;
                executionRateLabel = `${(buyVal / sellVal).toFixed(4)}`;
            }

            const result = {
                hash: commitedTxn.hash,
                success: (executedTxn as any).success,
                timestamp: Date.now(),
                intent: intent,
                executionPrice: executionPrice,
                executionRateLabel: executionRateLabel
            };
            this.orderHistory.unshift(result);
            if (this.orderHistory.length > 50) this.orderHistory.pop();

            return result;

        } catch (error: any) {
            console.error(chalk.red("❌ Error execution order:"), error);
            this.orderHistory.unshift({
                hash: null,
                success: false,
                error: error.message || "Unknown error",
                timestamp: Date.now(),
                intent: intent
            });
            throw error;
        }
    }

    // Helper to convert hex to bytes
    private hexToBytes(hex: string): Uint8Array {
        if (!hex) return new Uint8Array();
        hex = hex.replace(/^0x/, '');
        return new Uint8Array(Buffer.from(hex, 'hex'));
    }

    // Helper to normalize Ed25519 public key (strip 0x00 prefix if 33 bytes)
    private normalizePublicKey(pubKeyHex: string): string {
        let hex = pubKeyHex.replace(/^0x/, '');
        const bytes = Buffer.from(hex, 'hex');

        // Ed25519 public keys are 32 bytes. If 33, first byte is likely a prefix
        if (bytes.length === 33) {
            console.log(chalk.yellow(`⚠️  Stripping prefix byte from 33-byte public key`));
            return '0x' + bytes.subarray(1).toString('hex');
        }

        return '0x' + hex;
    }

    // Token Definitions
    private TOKENS = [
        { symbol: "MOVE", type: "0x1::aptos_coin::AptosCoin", decimals: 8 },
        { symbol: "WETH.e", type: "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb", decimals: 8 },
        { symbol: "USDC.e", type: "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489", decimals: 6 },
        { symbol: "USDT.e", type: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de", decimals: 6 }
    ];

    // Get all token balances (public for /health endpoint)
    public async getAllBalances(): Promise<{ symbol: string; balance: number; decimals: number }[]> {
        const balances = [];
        for (const token of this.TOKENS) {
            const balance = await this.getBalance(token.type);
            balances.push({
                symbol: token.symbol,
                balance: balance,
                decimals: token.decimals
            });
        }
        return balances;
    }

    public async getBalance(tokenType: string = "0x1::aptos_coin::AptosCoin"): Promise<number> {
        return this.getAccountBalance(this.account.accountAddress.toString(), tokenType);
    }

    /**
     * Get balance for any account (checking Escrow contract first, or Wallet?)
     * Actually, for the Maker, we MUST check the ESCROW interact, not their wallet.
     * The Intent Protocol Escrow holds the funds.
     */
    public async getMakerEscrowBalance(maker: string, tokenType: string): Promise<number> {
        try {
            const isStruct = tokenType.includes("::");
            let balance = 0;

            if (isStruct) {
                // View function: intent_swap::escrow::get_balance<CoinType>(user)
                const res = await this.client.view({
                    payload: {
                        function: `${REGISTRY_ADDR}::escrow::get_balance`,
                        typeArguments: [tokenType],
                        functionArguments: [maker]
                    }
                });
                balance = Number(res[0]);
            } else {
                // View function: intent_swap::escrow::get_fa_balance(user, asset)
                const res = await this.client.view({
                    payload: {
                        function: `${REGISTRY_ADDR}::escrow::get_fa_balance`,
                        typeArguments: [],
                        functionArguments: [maker, tokenType]
                    }
                });
                balance = Number(res[0]);
            }
            return balance;
        } catch (e) {
            // console.warn(`Could not fetch escrow balance for ${maker}:`, e);
            return 0;
        }
    }

    // Keep this for Relayer's own wallet balance (for gas/filling)
    public async getAccountBalance(address: string, tokenType: string): Promise<number> {
        try {
            const isStruct = tokenType.includes("::");

            if (isStruct) {
                const resources = await this.client.getAccountResources({ accountAddress: address });
                const coinStore = resources.find((r) => r.type === `0x1::coin::CoinStore<${tokenType}>`);
                return coinStore ? parseInt((coinStore.data as any).coin.value) : 0;
            } else {
                // FA Logic specific for Primary Store
                const balance = await this.client.view({
                    payload: {
                        function: "0x1::primary_fungible_store::balance",
                        typeArguments: ["0x1::fungible_asset::Metadata"], // generic T is Metadata
                        functionArguments: [address, tokenType] // owner, asset
                    }
                });
                return Number(balance[0]);
            }
        } catch (e) {
            // console.warn("Could not fetch balance:", e);
            return 0;
        }
    }

    // Check Balance and Fund if needed
    private async checkBalanceAndFund() {
        console.log(chalk.cyan("💰 Checking Relayer Balances..."));

        for (const token of this.TOKENS) {
            try {
                const balance = await this.getBalance(token.type);
                const displayBalance = balance / Math.pow(10, token.decimals);
                console.log(chalk.cyan(`   - ${token.symbol}: ${displayBalance.toFixed(4)}`));

                // Auto-faucet only for MOVE (AptosCoin)
                if (token.symbol === "MOVE" && balance < 10000000) {
                    console.log(chalk.yellow("⚠️  MOVE Balance low! Requesting faucet funds..."));
                    await axios.post("https://faucet.testnet.movementnetwork.xyz/mint", null, {
                        params: {
                            amount: 100000000,
                            address: this.account.accountAddress.toString()
                        }
                    });
                    console.log(chalk.green("💸 Faucet request sent!"));
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (e) {
                console.warn(`   - ${token.symbol}: Error fetching balance`);
            }
        }
    }
}

