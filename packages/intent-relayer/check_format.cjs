const { Aptos, AptosConfig, Network, AccountAddress } = require("@aptos-labs/ts-sdk");

const config = new AptosConfig({ network: Network.CUSTOM, fullnode: "https://testnet.movementnetwork.xyz/v1" });
const client = new Aptos(config);

async function main() {
    // The USDT.e FA address
    const faAddress = "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de";

    // What we're sending in the intent (canonical form)
    const canonical = AccountAddress.from(faAddress).toStringLong();
    console.log("Frontend sends (canonical):", canonical);

    // What type_info::type_name<AptosCoin> returns (for buy token)
    const aptosType = "0x0000000000000000000000000000000000000000000000000000000000000001::aptos_coin::AptosCoin";
    console.log("Expected AptosCoin type:", aptosType);

    // The question is: what does string_utils::to_string(&address) return?
    // According to Move docs, it should return the address in "@0x..." format
    // But let's also check if it might use a different format

    // Try calling a view function that uses string_utils::to_string on an address
    // We don't have one, but we can infer from the error

    // The frontend sends: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de"
    // Move might expect:   "@0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de"

    console.log("\nIf Move uses @ prefix, the intent should contain:");
    console.log("sell_token:", "@" + canonical);
}

main().catch(console.error);
