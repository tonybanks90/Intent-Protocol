
const { AccountAddress } = require("@aptos-labs/ts-sdk");

const addr = AccountAddress.from("0x1");
console.log("Short:", addr.toString());
// methods might be toLongString, toStringLong?
try { console.log("Long:", addr.toStringLong()); } catch (e) { console.log("No toStringLong"); }
try { console.log("To string with generic:", addr.toString()); } catch (e) { }

const hex = addr.toUint8Array();
const hexStr = "0x" + Array.from(hex).map(b => b.toString(16).padStart(2, '0')).join('');
console.log("Manual Hex:", hexStr);
