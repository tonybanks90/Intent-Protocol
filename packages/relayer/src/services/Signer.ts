import { createWalletClient, createPublicClient, http, hexToBytes, type PrivateKeyAccount } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, foundry } from 'viem/chains'; // Import foundry chain
import dotenv from 'dotenv';

dotenv.config();

export class SignerService {
    account: PrivateKeyAccount;
    walletClient: any;
    publicClient: any; // Add public client
    chainId: number;
    verifyingContract: `0x${string}`;

    constructor() {
        const pk = process.env.RELAYER_PRIVATE_KEY;
        if (!pk) throw new Error("Missing RELAYER_PRIVATE_KEY");

        this.account = privateKeyToAccount(pk as `0x${string}`);
        this.chainId = parseInt(process.env.EVM_CHAIN_ID || "31337");
        this.verifyingContract = (process.env.EVM_FACTORY_ADDRESS || "0x") as `0x${string}`;

        // Select chain based on ID
        const chain = this.chainId === 31337 ? foundry : mainnet;

        this.walletClient = createWalletClient({
            account: this.account,
            chain: chain,
            transport: http(process.env.EVM_RPC_URL)
        });

        this.publicClient = createPublicClient({
            chain: chain,
            transport: http(process.env.EVM_RPC_URL)
        });

        console.log(`🔑 Signer initialized: ${this.account.address}`);
    }

    async signRelease(intentId: `0x${string}`, token: `0x${string}`, recipient: `0x${string}`, nonce: bigint) {
        const domain = {
            name: "IntentVaultFactory",
            version: "1",
            chainId: this.chainId,
            verifyingContract: this.verifyingContract
        } as const;

        const types = {
            Release: [
                { name: "intentId", type: "bytes32" },
                { name: "token", type: "address" },
                { name: "recipient", type: "address" },
                { name: "nonce", type: "uint256" }
            ]
        } as const;

        const signature = await this.walletClient.signTypedData({
            account: this.account,
            domain,
            types,
            primaryType: 'Release',
            message: { intentId, token, recipient, nonce }
        });

        return signature;
    }

    async submitRelease(intentId: `0x${string}`, token: `0x${string}`, recipient: `0x${string}`, signature: `0x${string}`) {
        const { request } = await this.publicClient.simulateContract({
            address: this.verifyingContract,
            abi: [
                {
                    "type": "function",
                    "name": "releaseFromVault",
                    "inputs": [
                        { "name": "intentId", "type": "bytes32" },
                        { "name": "token", "type": "address" },
                        { "name": "recipient", "type": "address" },
                        { "name": "signatures", "type": "bytes" }
                    ],
                    "outputs": [],
                    "stateMutability": "nonpayable"
                },
                { type: 'error', name: 'InsufficientSignatures', inputs: [] },
                { type: 'error', name: 'InvalidSignature', inputs: [] },
                { type: 'error', name: 'SignerNotRelayer', inputs: [] },
                { type: 'error', name: 'DuplicateSigner', inputs: [] },
                { type: 'error', name: 'VaultNotFound', inputs: [] }
            ],
            functionName: 'releaseFromVault',
            args: [intentId, token, recipient, signature],
            account: this.account
        });

        const hash = await this.walletClient.writeContract(request);
        console.log(`Relayer submitted releaseFromVault: ${hash}`);
        return hash;
    }
}
