import { Intent } from './types';
export declare const DOMAIN_SEPARATOR = "MOVE_INTENT_SWAP_V1";
export declare function computeIntentHash(intent: Intent): Uint8Array;
export declare function hexToBytes(hex: string): Uint8Array;
export declare function bigintToBytes(value: bigint): Uint8Array;
export declare function bytesToHex(bytes: Uint8Array): string;
