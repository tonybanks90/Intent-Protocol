
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
});
const client = new Aptos(config);

const addr = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";

async function main() {
    console.log(`Inspecting ${addr}...`);
    try {
        const resources = await client.getAccountResources({ accountAddress: addr });
        console.log("\nResources found:", resources.length);
        resources.forEach(r => {
            if (r.type.includes("EscrowRegistry")) {
                console.log(`- ${r.type}`);
                console.log(JSON.stringify(r.data, null, 2));
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
