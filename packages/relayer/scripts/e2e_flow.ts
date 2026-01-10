import { createWalletClient, createPublicClient, http, parseEther, formatUnits, parseAbi, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import dotenv from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Import Relayer Services for in-process testing
import { SignerService } from '../src/services/Signer.js';
import { EvmWatcher } from '../src/services/EvmWatcher.js';

dotenv.config();

// Load Artifacts
const loadJSON = (p: string) => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf-8'));
// Paths relative to where the script is run (packages/relayer usually, but we'll use absolute logic or careful paths)
// Assuming run from packages/relayer via npm run test:e2e
const MockERC20Artifact = loadJSON('./src/abis/MockERC20.json');
const FactoryArtifact = loadJSON('./src/abis/IntentVaultFactoryFull.json');

// Setup Local Chain (Anvil)
const ANVIL_RPC = "http://127.0.0.1:8545";
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Anvil Account 0
const RELAYER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Anvil Account 1

async function main() {
    console.log(chalk.bold.blue("🚀 Starting Local E2E Test (Token Flow)"));

    // 1. Clients
    const client = createPublicClient({ chain: foundry, transport: http(ANVIL_RPC) });
    const wallet = createWalletClient({ chain: foundry, transport: http(ANVIL_RPC) });

    try {
        await client.getBlockNumber();
    } catch (e) {
        console.error(chalk.red("❌ Error connecting to Anvil. Is it running?"));
        console.error("Run: ~/.foundry/bin/anvil");
        process.exit(1);
    }

    const alice = privateKeyToAccount(PRIVATE_KEY);
    const relayer = privateKeyToAccount(RELAYER_KEY);

    console.log(`👤 Alice: ${alice.address}`);
    console.log(`👤 Relayer: ${relayer.address}`);

    // 2. Deploy Contracts
    console.log("\n📦 Deploying Contracts...");

    // Deploy Factory
    const factoryHash = await wallet.deployContract({
        abi: FactoryArtifact.abi,
        bytecode: FactoryArtifact.bytecode,
        account: alice,
        args: [1n] // threshold 1
    });
    const factoryReceipt = await client.waitForTransactionReceipt({ hash: factoryHash });
    const factoryAddress = factoryReceipt.contractAddress!;
    console.log(`   Factory: ${chalk.green(factoryAddress)}`);

    // Deploy Token
    const tokenHash = await wallet.deployContract({
        abi: MockERC20Artifact.abi,
        bytecode: MockERC20Artifact.bytecode,
        account: alice,
        args: ["Test USDC", "USDC", 6]
    });
    const tokenReceipt = await client.waitForTransactionReceipt({ hash: tokenHash });
    const tokenAddress = tokenReceipt.contractAddress!;
    console.log(`   Token:   ${chalk.green(tokenAddress)}`);

    // 3. Setup Relayer (In-Process)
    console.log("\n🔌 Initializing Relayer Service...");
    process.env.EVM_RPC_URL = ANVIL_RPC;
    process.env.EVM_FACTORY_ADDRESS = factoryAddress;
    process.env.RELAYER_PRIVATE_KEY = RELAYER_KEY;
    // Mock Movement config to avoid errors in Watcher init if any
    process.env.MOVEMENT_REGISTRY_ADDRESS = "0x1";

    // Add Relayer to Factory
    await wallet.writeContract({
        address: factoryAddress,
        abi: FactoryArtifact.abi,
        functionName: 'addRelayer',
        args: [relayer.address],
        account: alice
    });
    console.log("   Relayer authorized on Factory");

    // Add Supported Chain (336 for Movement)
    await wallet.writeContract({
        address: factoryAddress,
        abi: FactoryArtifact.abi,
        functionName: 'addSupportedChain',
        args: [336n],
        account: alice
    });
    console.log("   Chain 336 authorized on Factory");

    const signerService = new SignerService();
    const evmWatcher = new EvmWatcher(signerService);

    // Start watching (non-blocking)
    evmWatcher.start();

    // 4. Execute Flow
    console.log("\n💸 Executing Bridge Flow...");

    const intentId = "0x" + Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64) as `0x${string}`;
    const amount = 100_000_000n; // 100 USDC

    // Get Deposit Address
    const factoryContract = getContract({ address: factoryAddress, abi: FactoryArtifact.abi, client });
    const depositAddress = await factoryContract.read.getDepositAddress([alice.address, intentId]) as `0x${string}`;
    console.log(`   Target Deposit Address: ${depositAddress}`);

    // Mint & Transfer
    const tokenContract = getContract({ address: tokenAddress, abi: MockERC20Artifact.abi, client: wallet });

    await wallet.writeContract({
        address: tokenAddress,
        abi: MockERC20Artifact.abi,
        functionName: 'mint',
        args: [alice.address, amount],
        account: alice
    });

    console.log(`   Minted ${amount} to Alice`);

    const txHash = await wallet.writeContract({
        address: tokenAddress,
        abi: MockERC20Artifact.abi,
        functionName: 'transfer',
        args: [depositAddress, amount],
        account: alice
    });

    console.log(`   Transferred to Vault. Tx: ${txHash}`);

    // 4.5 Simulate Relayer Discovery (API Trigger)
    console.log("\n📡 Simulating Relayer Discovery (API Trigger)...");
    await evmWatcher.processDeposit(intentId, alice.address, 336n); // 336 = Movement Chain ID

    // 5. Wait for Relayer
    console.log("\n⏳ Waiting for Vault creation on-chain...");

    // Wait Loop
    let deployed = false;
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const isDeployed = await factoryContract.read.isVaultDeployed([depositAddress]);
        if (isDeployed) {
            deployed = true;
            break;
        }
        process.stdout.write(".");
    }
    console.log("");

    if (!deployed) {
        console.error(chalk.red("\n❌ FAILURE: Vault was NOT created within timeout."));
        process.exit(1);
    }

    console.log(chalk.green("✅ Vault Created!"));

    // 6. Simulate Movement Fulfillment & Settlement
    console.log("\n🌍 Simulating Movement Fulfillment (Outbound Flow)...");

    // In reality, MovementWatcher would detect event and trigger signer.
    // Here we manually call signer to represent that flow.
    const nonce = await factoryContract.read.getNonce([intentId]) as bigint;
    console.log(`   Current Nonce: ${nonce}`);

    // Relayer signs release for themselves (as LP)
    const relayerRecipient = relayer.address;

    console.log(`   Signing release for ${amount} tokens to ${relayerRecipient}...`);
    const signature = await signerService.signRelease(intentId, tokenAddress, relayerRecipient, nonce);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);

    console.log("   Submitting 'releaseFromVault' to EVM...");
    await signerService.submitRelease(intentId, tokenAddress, relayerRecipient, signature);

    // 7. Verify Funds Released
    console.log("\n💰 Verifying Settlement...");
    await new Promise(r => setTimeout(r, 2000)); // Wait for block

    const vaultBalance = await tokenContract.read.balanceOf([depositAddress]) as bigint;
    const relayerBalance = await tokenContract.read.balanceOf([relayerRecipient]) as bigint;

    console.log(`   Vault Balance: ${vaultBalance}`);
    console.log(`   Relayer Balance: ${relayerBalance}`);

    if (vaultBalance === 0n && relayerBalance >= amount) {
        console.log(chalk.green("\n✅ SUCCESS: Full Cross-Chain Lifecycle Verified!"));
        console.log("   (Lock -> Vault Created -> [Movement Event] -> Funds Released)");
    } else {
        console.error(chalk.red("\n❌ FAILURE: Funds not released correctly."));
        process.exit(1);
    }

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
