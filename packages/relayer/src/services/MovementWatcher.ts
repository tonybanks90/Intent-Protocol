import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { SignerService } from './Signer.js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

// Contract Address from Move.toml
const PACKAGE_ADDRESS = process.env.MOVEMENT_REGISTRY_ADDRESS || "0xd096763b2fbbbf7175a3aca30917719d8041a4ad61b85e64410c9353aa79b96d";
const MODULE_NAME = "events";
const EVENT_STRUCT = "IntentFulfilled";

export class MovementWatcher {
    client: Aptos;
    signer: SignerService;
    registryAddress: string;
    lastSequenceNumber: number;

    constructor(signer: SignerService) {
        this.signer = signer;
        // Default to a testnet config
        const config = new AptosConfig({
            network: Network.TESTNET,
            fullnode: process.env.MOVEMENT_RPC_URL // Allow override
        });
        this.client = new Aptos(config);

        this.registryAddress = PACKAGE_ADDRESS;
        this.lastSequenceNumber = 0;

        console.log(`👀 Movement Watcher initialized for ${this.registryAddress}`);
    }

    async start() {
        console.log("🚀 Starting Movement Watcher...");

        // Polling loop
        setInterval(() => this.checkEvents(), 5000);
    }

    async checkEvents() {
        try {
            // Construct the full event type string
            // e.g. 0xAddr::events::IntentFulfilled
            const eventType = `${this.registryAddress}::${MODULE_NAME}::${EVENT_STRUCT}`;

            // Fetch events (using Aptos SDK v2 getEvents)
            // Note: In real production, we'd use an Indexer or specific event handle
            // For MVP on devnet/testnet, getting events by creation number or account is common
            // Here we use a safe fallback logic mock or a known working view function if available.
            // Since `getEvents` is deprecated or specific in v2, we use explicit `getModuleEventsByEventType`

            const events = await (this.client as any).getModuleEventsByEventType({
                eventType: eventType as `${string}::${string}::${string}`,
                options: {
                    start: this.lastSequenceNumber,
                    limit: 10
                }
            });

            if (events.length > 0) {
                console.log(chalk.blue(`Found ${events.length} new Movement events`));
            }

            for (const event of events) {
                // Update sequence number to avoid reprocessing
                const seq = parseInt(event.sequence_number);
                if (seq >= this.lastSequenceNumber) {
                    this.lastSequenceNumber = seq + 1;
                    await this.handleIntentFulfilled(event.data);
                }
            }

        } catch (error) {
            // Ignore minor network errors during polling
            // console.error("Error checking Movement events:", error);
        }
    }

    async handleIntentFulfilled(data: any) {
        console.log(chalk.green("\n🔔 Intent Fulfilled on Movement!"));
        console.log(`   Intent ID: ${data.intent_id}`);
        console.log(`   Recipient: ${data.recipient}`);
        console.log(`   Amount: ${data.amount}`);

        try {
            const intentId = data.intent_id;
            const token = data.source_token || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // Default USDC for now if not in event
            const recipient = data.recipient;

            // Nonce would typically come from querying the EVM factory for the next nonce
            // For simplicity in this loop, we'll fetch it or just log the readiness
            console.log("   📝 Signing release for EVM...");

            // In a real flow, we need to fetch the nonce from EVM first
            // We can add a method to Signer to getNonce, or just sign 0 for test
            const nonce = 0n; // Placeholder: Fetch real nonce in integration

            const signature = await this.signer.signRelease(
                intentId,
                token,
                recipient,
                nonce
            );

            console.log(`   ✅ Signature generated: ${signature.substring(0, 20)}...`);

            // Submit to EVM (Executor logic)
            // this.signer.submitRelease(intentId, token, recipient, signature);

        } catch (err) {
            console.error("   ❌ Failed to sign release:", err);
        }
    }
}
