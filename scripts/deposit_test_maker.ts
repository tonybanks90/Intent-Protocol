import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const REGISTRY_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";
const TEST_MAKER_PK = "0x51ea785118450d4fb55a61be78b5cc67ec7c2148d519f78f54bf7005d957bce6";

const TOKENS = {
    MOVE: { type: "0x1::aptos_coin::AptosCoin", decimals: 8, isFA: false },
    WETH: { type: "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb", decimals: 8, isFA: true },
    USDC: { type: "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489", decimals: 6, isFA: true },
    USDT: { type: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de", decimals: 6, isFA: true }
};

async function main() {
    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://testnet.movementnetwork.xyz/v1" });
    const client = new Aptos(config);

    const privateKey = new Ed25519PrivateKey(TEST_MAKER_PK);
    const maker = Account.fromPrivateKey({ privateKey });

    console.log(chalk.blue.bold(`\n🚀 Depositing to Escrow for Maker: ${maker.accountAddress.toString()}`));

    const deposits = [
        { symbol: "MOVE", amount: 50 },
        { symbol: "WETH", amount: 2 },
        { symbol: "USDC", amount: 5000 },
        { symbol: "USDT", amount: 5000 }
    ];

    for (const d of deposits) {
        const token = (TOKENS as any)[d.symbol];
        const rawAmount = BigInt(Math.floor(d.amount * Math.pow(10, token.decimals)));

        console.log(chalk.yellow(`Depositing ${d.amount} ${d.symbol}...`));

        try {
            let transaction;
            if (token.isFA) {
                // public entry fun deposit_fa(user: &signer, registry_addr: address, amount: u64, asset: Object<Metadata>)
                transaction = await client.transaction.build.simple({
                    sender: maker.accountAddress,
                    data: {
                        function: `${REGISTRY_ADDR}::escrow::deposit_fa`,
                        typeArguments: [],
                        functionArguments: [REGISTRY_ADDR, rawAmount, token.type]
                    }
                });
            } else {
                // public entry fun deposit<CoinType>(user: &signer, amount: u64)
                transaction = await client.transaction.build.simple({
                    sender: maker.accountAddress,
                    data: {
                        function: `${REGISTRY_ADDR}::escrow::deposit`,
                        typeArguments: [token.type],
                        functionArguments: [rawAmount]
                    }
                });
            }

            const commitedTxn = await client.signAndSubmitTransaction({
                signer: maker,
                transaction,
            });

            console.log(chalk.green(`✅ Submitted: ${commitedTxn.hash}`));
            await client.waitForTransaction({ transactionHash: commitedTxn.hash });
            console.log(chalk.green(`🎉 Confirmed!`));

        } catch (e: any) {
            console.error(chalk.red(`❌ Failed to deposit ${d.symbol}: ${e.message}`));
        }
    }

    console.log(chalk.blue.bold("\nAll deposits completed!"));
}

main();
