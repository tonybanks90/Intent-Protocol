import { Order, OrderStatus } from '@intent-protocol/common';
export interface OrderFilter {
    sellToken?: string;
    buyToken?: string;
    maker?: string;
    status?: OrderStatus;
}
export declare class ResolverAPI {
    private baseUrl;
    constructor(baseUrl: string);
    getOpenOrders(filter?: OrderFilter): Promise<Order[]>;
    updateOrderStatus(id: string, status: OrderStatus, txHash?: string): Promise<void>;
}
