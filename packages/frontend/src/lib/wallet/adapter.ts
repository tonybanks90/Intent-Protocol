import { getAptosWallets, AptosWallet, NetworkInfo } from '@aptos-labs/wallet-standard';
import { DEFAULT_NETWORK } from './networks';

let _wallet: AptosWallet | undefined;

// Wait for wallet to be injected with retries
export const waitForWallet = async (maxRetries = 10, delayMs = 200): Promise<AptosWallet | undefined> => {
    for (let i = 0; i < maxRetries; i++) {
        const wallet = getWallet();
        if (wallet) {
            return wallet;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return undefined;
};

export const getWallet = (): AptosWallet | undefined => {
    if (_wallet) return _wallet;

    // Try to get Nightly wallet from window.nightly.aptos
    const nightlyAptos = (window as any).nightly?.aptos;
    if (nightlyAptos) {
        // Nightly injects a standardWallet property
        if (nightlyAptos.standardWallet) {
            _wallet = nightlyAptos.standardWallet as AptosWallet;
            return _wallet;
        }
        // Alternatively, try to use it directly if it has the AptosWallet interface
        if (nightlyAptos.features && nightlyAptos.features['aptos:connect']) {
            _wallet = nightlyAptos as AptosWallet;
            return _wallet;
        }
    }

    // Fallback: Use wallet-standard to detect all Aptos wallets
    try {
        const { aptosWallets } = getAptosWallets();

        // Find Nightly wallet
        const nightlyWallet = aptosWallets.find(w =>
            w.name.toLowerCase().includes('nightly')
        );

        if (nightlyWallet) {
            _wallet = nightlyWallet;
            return _wallet;
        }

        // Return first available wallet if Nightly not found
        if (aptosWallets.length > 0) {
            _wallet = aptosWallets[0];
            return _wallet;
        }
    } catch (e) {
        console.warn('Failed to get Aptos wallets via wallet-standard:', e);
    }

    return undefined;
};

export const connectWallet = async (wallet: AptosWallet): Promise<any> => {
    const connectFeature = wallet.features['aptos:connect'];
    if (!connectFeature) {
        throw new Error('Wallet does not support connect');
    }

    const networkInfo: NetworkInfo = {
        chainId: DEFAULT_NETWORK.chainId,
        name: DEFAULT_NETWORK.name as any,
        url: DEFAULT_NETWORK.url,
    };

    const response = await connectFeature.connect(false, networkInfo);
    return response;
};

export const disconnectWallet = async (wallet: AptosWallet): Promise<void> => {
    const disconnectFeature = wallet.features['aptos:disconnect'];
    if (disconnectFeature) {
        await disconnectFeature.disconnect();
    }
};

export const getWalletNetwork = async (wallet: AptosWallet): Promise<NetworkInfo | undefined> => {
    const networkFeature = wallet.features['aptos:network'];
    if (networkFeature) {
        return networkFeature.network as unknown as NetworkInfo;
    }
    return undefined;
};

export const changeWalletNetwork = async (wallet: AptosWallet, networkInfo: NetworkInfo): Promise<any> => {
    const changeNetworkFeature = wallet.features['aptos:changeNetwork'];
    if (!changeNetworkFeature) {
        throw new Error('Wallet does not support network change');
    }
    return changeNetworkFeature.changeNetwork(networkInfo);
};

export const signAndSubmitTransaction = async (wallet: AptosWallet, payload: any): Promise<any> => {
    const signFeature = wallet.features['aptos:signAndSubmitTransaction'];
    if (!signFeature) {
        throw new Error('Wallet does not support signAndSubmitTransaction');
    }
    // standard aptos:signAndSubmitTransaction often requires { payload: ... } structure
    // or sometimes just the payload itself. The error 'serialize of undefined' suggests 
    // it might be looking for a property that doesn't exist on the passed object.
    // Let's try wrapping it, as this is a common variance.
    return signFeature.signAndSubmitTransaction({ payload } as any);
};

export const signMessage = async (wallet: AptosWallet, message: any): Promise<any> => {
    const signFeature = wallet.features['aptos:signMessage'];
    if (!signFeature) {
        throw new Error('Wallet does not support signMessage');
    }
    return signFeature.signMessage(message);
};
