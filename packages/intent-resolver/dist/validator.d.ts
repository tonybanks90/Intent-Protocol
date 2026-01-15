import { Intent } from '@intent-protocol/common';
export declare class OrderValidator {
    static validateHash(intent: Intent, signatureDetails?: {
        hash?: string;
    }): boolean;
    static isExpired(intent: Intent): boolean;
    static isStarted(intent: Intent): boolean;
}
