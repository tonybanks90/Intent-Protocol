import { SignerService } from './services/Signer.js';
import { EvmWatcher } from './services/EvmWatcher.js';
import { MovementWatcher } from './services/MovementWatcher.js';

async function main() {
    console.log("Starting Intent Protocol Relayer...");

    try {
        const signer = new SignerService();
        const evmWatcher = new EvmWatcher(signer);
        const movementWatcher = new MovementWatcher(signer);

        await Promise.all([
            evmWatcher.start(),
            movementWatcher.start()
        ]);

        // Keep process alive
        process.stdin.resume();

    } catch (error) {
        console.error("Fatal Error:", error);
        process.exit(1);
    }
}

main();
