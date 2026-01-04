import { createPublicClient, http, parseAbiItem } from 'viem';
import { SignerService } from './Signer.js';
import dotenv from 'dotenv';
import IntentVaultFactoryABI from '../abis/IntentVaultFactory.json' with { type: "json" };

dotenv.config();

export class EvmWatcher {
    client: any;
    signer: SignerService;
    factoryAddress: `0x${string}`;

    constructor(signer: SignerService) {
        this.signer = signer;
        this.factoryAddress = (process.env.EVM_FACTORY_ADDRESS || "0x") as `0x${string}`;

        this.client = createPublicClient({
            transport: http(process.env.EVM_RPC_URL),
        });

        console.log(`👀 EVM Watcher initialized for ${this.factoryAddress}`);
    }

    async start() {
        console.log("🚀 Starting EVM Watcher...");

        this.client.watchContractEvent({
            address: this.factoryAddress,
            abi: IntentVaultFactoryABI,
            eventName: 'VaultCreated',
            onLogs: (logs: any) => this.handleVaultCreated(logs),
        });
    }

    async handleVaultCreated(logs: any[]) {
        for (const log of logs) {
            const { intentId, vault, user, targetChainId } = log.args;
            console.log(`\n🔔 Vault Created detected!`);
            console.log(`   Intent ID: ${intentId}`);
            console.log(`   Vault: ${vault}`);
            console.log(`   User: ${user}`);
            console.log(`   Target Chain: ${targetChainId}`);

            // In a real flow, we would now:
            // 1. Store this intent in DB
            // 2. Notify Movement solvers
        }
    }

    async processDeposit(intentId: `0x${string}`, user: `0x${string}`, chainId: bigint) {
        console.log(`Processing deposit for intent ${intentId}...`);

        // Call createVault on Factory
        const { request } = await this.client.simulateContract({
            address: this.factoryAddress,
            abi: IntentVaultFactoryABI,
            functionName: 'createVault',
            args: [user, intentId, chainId],
            account: this.signer.account
        });

        const hash = await this.signer.walletClient.writeContract(request);
        console.log(`Relayer submitted createVault: ${hash}`);
        return hash;
    }
}
