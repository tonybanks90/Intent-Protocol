import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { RelayerService } from './services/Relayer';
import chalk from 'chalk';

dotenv.config();

const server = fastify();
server.register(cors, {
    origin: true
});
const relayer = new RelayerService();

server.get('/health', async (request, reply) => {
    const balances = await relayer.getAllBalances();
    return {
        status: 'ok',
        address: (relayer as any).account.accountAddress.toString(),
        balances: balances
    };
});
server.get('/activity', async (request, reply) => {
    return { orders: relayer.orderHistory };
});

server.get('/orders', async (request, reply) => {
    return {
        count: relayer.orderBook.getOrdersCount(),
        orders: relayer.orderBook.getOrders()
    };
});

server.get('/prices', async (request, reply) => {
    // We iterate over known tokens and fetch their price
    const prices: Record<string, number> = {};
    const tokens = [
        "0x1::aptos_coin::AptosCoin",
        "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb", // WETH
        "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489", // USDC
        "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de"  // USDT
    ];

    for (const t of tokens) {
        prices[t] = await relayer.priceService.getPrice(t);
    }
    return prices;
});


server.post('/intents', async (request, reply) => {
    const body: any = request.body;
    // schema: { intent: {...}, signature: "0x...", publicKey: "0x...", signingNonce: "0x...", intentHash: "0x..." }

    if (!body.intent || !body.signature || !body.publicKey || !body.signingNonce) {
        reply.code(400).send({ error: "Missing intent, signature, publicKey, or signingNonce" });
        return;
    }

    try {
        const result = await relayer.submitOrder(body.intent, body.signature, body.publicKey, body.signingNonce, body.intentHash);
        return result;
    } catch (err: any) {
        request.log.error(err);
        reply.code(500).send({ error: err.message });
    }
});

const start = async () => {
    try {
        await server.listen({ port: 3001, host: '0.0.0.0' });
        console.log(chalk.green(`🚀 Relayer Service running on port 3001`));
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

start();
