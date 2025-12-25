
import { RelayerService } from './src/services/Relayer';

async function main() {
    console.log("Starting Relayer Balance Check...");
    const relayer = new RelayerService();
    // Allow init time
    await new Promise(r => setTimeout(r, 2000));
    console.log("Relayer initialized. Balances should be logged above.");
}

main().catch(console.error);
