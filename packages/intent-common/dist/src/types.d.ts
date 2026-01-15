export interface Intent {
    maker: string;
    nonce: string;
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    startBuyAmount: string;
    endBuyAmount: string;
    startTime: string;
    endTime: string;
}
export interface SignedIntent extends Intent {
    signature: string;
}
export type OrderStatus = 'open' | 'filled' | 'expired' | 'cancelled';
export interface Order {
    id: string;
    maker: string;
    intent: Intent;
    signature: string;
    status: OrderStatus;
    createdAt: number;
    fillTxHash?: string;
    filledAt?: number;
}
