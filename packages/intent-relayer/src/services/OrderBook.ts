import chalk from 'chalk';

export interface QueuedOrder {
    id: string; // Order Hash
    intent: any;
    signature: string;
    publicKey: string;
    signingNonce: string;
    createdAt: number;
    nextRetry: number;
}

export class OrderBook {
    private orders: Map<string, QueuedOrder> = new Map();

    constructor() { }

    addOrder(orderHash: string, intent: any, signature: string, publicKey: string, signingNonce: string) {
        if (this.orders.has(orderHash)) return;

        console.log(chalk.blue(`📥 Adding order to Book: ${orderHash.slice(0, 10)}...`));
        this.orders.set(orderHash, {
            id: orderHash,
            intent,
            signature,
            publicKey,
            signingNonce,
            createdAt: Date.now(),
            nextRetry: Date.now()
        });
    }

    removeOrder(orderHash: string) {
        if (this.orders.delete(orderHash)) {
            console.log(chalk.gray(`🗑️  Removed order: ${orderHash.slice(0, 10)}...`));
        }
    }

    getOrders(): QueuedOrder[] {
        return Array.from(this.orders.values());
    }

    getOrdersCount(): number {
        return this.orders.size;
    }

    /**
     * Remove expired orders
     */
    prune(currentTimeSeconds: number) {
        for (const [hash, order] of this.orders) {
            // Check expiry
            if (order.intent.end_time < currentTimeSeconds) {
                console.log(chalk.red(`⌛ Order Expired in Book: ${hash.slice(0, 10)}...`));
                this.orders.delete(hash);
            }
        }
    }
}
