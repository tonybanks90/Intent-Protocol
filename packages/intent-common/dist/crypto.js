"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAIN_SEPARATOR = void 0;
exports.computeIntentHash = computeIntentHash;
exports.hexToBytes = hexToBytes;
exports.bigintToBytes = bigintToBytes;
exports.bytesToHex = bytesToHex;
const sha3_1 = require("@noble/hashes/sha3");
exports.DOMAIN_SEPARATOR = 'MOVE_INTENT_SWAP_V1';
function computeIntentHash(intent) {
    const encoder = new TextEncoder();
    const data = new Uint8Array([
        ...encoder.encode(exports.DOMAIN_SEPARATOR),
        ...hexToBytes(intent.maker),
        ...bigintToBytes(BigInt(intent.nonce)),
        ...hexToBytes(intent.sellToken),
        ...hexToBytes(intent.buyToken),
        ...bigintToBytes(BigInt(intent.sellAmount)),
        ...bigintToBytes(BigInt(intent.startBuyAmount)),
        ...bigintToBytes(BigInt(intent.endBuyAmount)),
        ...bigintToBytes(BigInt(intent.startTime)),
        ...bigintToBytes(BigInt(intent.endTime)),
    ]);
    return (0, sha3_1.sha3_256)(data);
}
function hexToBytes(hex) {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (cleanHex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
}
function bigintToBytes(value) {
    // Little-endian 64-bit integer
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, value, true); // true for little-endian
    return new Uint8Array(buffer);
}
function bytesToHex(bytes) {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
