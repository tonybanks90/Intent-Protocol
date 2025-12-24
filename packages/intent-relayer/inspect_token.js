
const { Aptos, AptosConfig, Network } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
});
const client = new Aptos(config);

const addr = "0xb89077cfd2a82a0c1450534d49cfd5f2707643155273069bc23a912bcfefdee7";

async function main() {
    console.log(`Inspecting ${addr}...`);
    try {
        const modules = await client.getAccountModules({ accountAddress: addr });
        console.log("Modules found:", modules.length);
        modules.forEach(m => {
            console.log(`- ${m.abi?.address}::${m.abi?.name}`);
            m.abi?.structs.forEach(s => console.log(`   Struct: ${s.name}`));
        });

        const resources = await client.getAccountResources({ accountAddress: addr });
        console.log("\nResources found:", resources.length);
        resources.forEach(r => {
            if (r.type.includes("CoinInfo") || r.type.includes("Metadata")) {
                console.log(`- ${r.type}`);
                console.log(JSON.stringify(r.data, null, 2));
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
