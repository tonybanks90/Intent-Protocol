import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import chalk from "chalk";

const REGISTRY_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";
const RELAYER_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";
const MAKER_ADDR = "0x5b79d5dd49be022c888d78c8ca05385ce874d2472599130d5d760acefa2c0880";

const TOKENS = [
    { symbol: "MOVE", type: "0x1::aptos_coin::AptosCoin", decimals: 8 },
    { symbol: "WETH.e", type: "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb", decimals: 8 },
    { symbol: "USDC.e", type: "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489", decimals: 6 },
    { symbol: "USDT.e", type: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de", decimals: 6 }
];

async function getWalletBalance(client: Aptos, address: string, tokenType: string): Promise<number> {
    try {
        const isStruct = tokenType.includes("::");
        if (isStruct) {
            const resources = await client.getAccountResources({ accountAddress: address });
            const coinStore = resources.find((r) => r.type === `0x1::coin::CoinStore<${tokenType}>`);
            return coinStore ? parseInt((coinStore.data as any).coin.value) : 0;
        } else {
            const balance = await client.view({
                payload: {
                    function: "0x1::primary_fungible_store::balance",
                    typeArguments: ["0x1::fungible_asset::Metadata"],
                    functionArguments: [address, tokenType]
                }
            });
            return Number(balance[0]);
        }
    } catch (e) {
        return 0;
    }
}

async function getEscrowBalance(client: Aptos, address: string, tokenType: string): Promise<number> {
    try {
        const isStruct = tokenType.includes("::");
        if (isStruct) {
            const res = await client.view({
                payload: {
                    function: `${REGISTRY_ADDR}::escrow::get_balance`,
                    typeArguments: [tokenType],
                    functionArguments: [address]
                }
            });
            return Number(res[0]);
        } else {
            const res = await client.view({
                payload: {
                    function: `${REGISTRY_ADDR}::escrow::get_fa_balance`,
                    typeArguments: [],
                    functionArguments: [address, tokenType]
                }
            });
            return Number(res[0]);
        }
    } catch (e) {
        return 0;
    }
}

async function main() {
    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://testnet.movementnetwork.xyz/v1" });
    const client = new Aptos(config);

    console.log(chalk.blue.bold("\n🔍 Checking Relayer & Maker Balances..."));

    const addresses = [
        { label: "Relayer", addr: RELAYER_ADDR },
        { label: "Test Maker", addr: MAKER_ADDR }
    ];

    for (const { label, addr } of addresses) {
        console.log(chalk.yellow(`\n--- ${label} (${addr.slice(0, 10)}...) ---`));
        for (const token of TOKENS) {
            const wallet = await getWalletBalance(client, addr, token.type);
            const escrow = await getEscrowBalance(client, addr, token.type);

            const wDisplay = (wallet / Math.pow(10, token.decimals)).toFixed(4);
            const eDisplay = (escrow / Math.pow(10, token.decimals)).toFixed(4);

            if (wallet > 0 || escrow > 0) {
                console.log(`${chalk.white.bold(token.symbol.padEnd(8))} | Wallet: ${chalk.green(wDisplay.padStart(10))} | Escrow: ${chalk.cyan(eDisplay.padStart(10))}`);
            } else {
                console.log(`${chalk.gray(token.symbol.padEnd(8))} | Wallet: ${chalk.gray("0.0000".padStart(10))} | Escrow: ${chalk.gray("0.0000".padStart(10))}`);
            }
        }
    }
}

main();
