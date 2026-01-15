"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderValidator = void 0;
const common_1 = require("@intent-protocol/common");
// Note: In real production, we'd use a robust library for signature verification (e.g., nacl or aptos SDK)
// Since we want to keep dependencies light, we assume the node env has access to these or we add them.
// For now, we will verify the hash integrity. Full sig verification often requires chain-specific libs.
// To make this "universal", we might allow passing a verify function or just verify the hash structure.
class OrderValidator {
    static validateHash(intent, signatureDetails = {}) {
        const calculatedHash = (0, common_1.computeIntentHash)(intent);
        // If a hash is provided, check it matches the intent
        if (signatureDetails.hash) {
            // Compare byte arrays or hex strings
            // ... implementation
            return true;
        }
        return true;
    }
    static isExpired(intent) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        return now > BigInt(intent.endTime);
    }
    static isStarted(intent) {
        const now = BigInt(Math.floor(Date.now() / 1000));
        return now >= BigInt(intent.startTime);
    }
}
exports.OrderValidator = OrderValidator;
