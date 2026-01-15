"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResolverAPI = void 0;
class ResolverAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async getOpenOrders(filter) {
        const searchParams = new URLSearchParams();
        if (filter?.sellToken)
            searchParams.set('sellToken', filter.sellToken);
        if (filter?.buyToken)
            searchParams.set('buyToken', filter.buyToken);
        if (filter?.maker)
            searchParams.set('maker', filter.maker);
        if (filter?.status)
            searchParams.set('status', filter.status);
        else
            searchParams.set('status', 'open'); // Default to open
        const response = await fetch(`${this.baseUrl}/orders?${searchParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        return response.json();
    }
    async updateOrderStatus(id, status, txHash) {
        const body = { status };
        if (txHash)
            body.fillTxHash = txHash;
        const response = await fetch(`${this.baseUrl}/orders/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Failed to update order: ${response.statusText}`);
        }
    }
}
exports.ResolverAPI = ResolverAPI;
