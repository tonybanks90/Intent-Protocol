
const { Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

const pk = "0x03cd8f6265bd3cb1ad9567fa2cc3f58b196cd8c8a9562464bf3be413d306874f";
const privateKey = new Ed25519PrivateKey(pk);
const account = Account.fromPrivateKey({ privateKey });

console.log("Relayer Address:", account.accountAddress.toString());
