import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const config = new AptosConfig({ network: Network.TESTNET, fullnode: "https://testnet.movementnetwork.xyz/v1" });
const aptos = new Aptos(config);
const SWAP_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";

async function main() {
    const typeTag = "0x1::aptos_coin::AptosCoin";
    console.log(`Fetching bytes for: ${typeTag}`);

    try {
        const result = await aptos.view({
            payload: {
                function: `${SWAP_ADDR}::swap::get_type_name_bytes`,
                typeArguments: [typeTag],
                functionArguments: []
            }
        });

        // Result is vector<u8> (array of numbers)
        // Convert to string
        const bytes = result[0] as any; // Type is usually string (hex) or array in JSON response depending on SDK
        // Aptos SDK usually returns values as they are in JSON. vector<u8> comes as "0x..." string

        console.log("Raw Result:", result);

        if (typeof bytes === 'string') {
            console.log("Hex String:", bytes);
            const ascii = Buffer.from(bytes.slice(2), 'hex').toString();
            console.log("ASCII:", ascii);
        } else {
            // If array
            console.log("Array:", bytes);
        }

    } catch (e) {
        console.error(e);
    }
}

main();
