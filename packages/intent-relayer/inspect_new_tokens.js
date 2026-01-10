
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
});
const client = new Aptos(config);

const addrs = [
    "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb",
    "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de",
    "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489"
];

async function main() {
    for (const addr of addrs) {
        console.log(`Address: ${addr}`);
        try {
            const name = await client.view({ payload: { function: "0x1::fungible_asset::name", functionArguments: [addr], typeArguments: ["0x1::fungible_asset::Metadata"] } });
            const symbol = await client.view({ payload: { function: "0x1::fungible_asset::symbol", functionArguments: [addr], typeArguments: ["0x1::fungible_asset::Metadata"] } });
            const decimals = await client.view({ payload: { function: "0x1::fungible_asset::decimals", functionArguments: [addr], typeArguments: ["0x1::fungible_asset::Metadata"] } });
            console.log(`  Name: ${name[0]}`);
            console.log(`  Symbol: ${symbol[0]}`);
            console.log(`  Decimals: ${decimals[0]}`);
        } catch (e) {
            console.log("  View function failed:", e.message);
        }
        console.log("---");
    }
}

main();
