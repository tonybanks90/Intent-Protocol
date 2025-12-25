
const { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } = require("@aptos-labs/ts-sdk");
require("dotenv").config({ path: "../intent-relayer/.env" });

const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: "https://testnet.movementnetwork.xyz/v1"
});
const client = new Aptos(config);

async function main() {
    let pkStr = process.env.RELAYER_PRIVATE_KEY;
    if (!pkStr) throw new Error("Missing RELAYER_PRIVATE_KEY in ../intent-relayer/.env");
    pkStr = pkStr.startsWith("0x") ? pkStr.substring(2) : pkStr;

    const privateKey = new Ed25519PrivateKey(pkStr);
    const account = Account.fromPrivateKey({ privateKey });

    const addr = account.accountAddress;
    console.log(`Initializing FA Registry with account: ${addr}`);

    // Seed for resource account
    const seed = new Uint8Array([1]);

    try {
        const transaction = await client.transaction.build.simple({
            sender: addr,
            data: {
                function: `${addr}::escrow::initialize_fa`,
                functionArguments: [seed],
            },
        });

        const pendingTxn = await client.signAndSubmitTransaction({
            signer: account,
            transaction,
        });

        console.log(`Transaction submitted: ${pendingTxn.hash}`);
        const response = await client.waitForTransaction({ transactionHash: pendingTxn.hash });
        console.log("Transaction confirmed:", response.success ? "SUCCESS" : "FAILED");

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
