// Network configurations for Movement
// Using string literals to avoid type conflicts between different @aptos-labs/ts-sdk versions

export interface INetwork {
    chainId: number;
    name: string;
    url: string;
    buttonName: string;
    uiQueue: number;
}

export const NETWORK_MAP: Record<string, INetwork> = {
    "177": {
        uiQueue: 1,
        chainId: 177,
        name: "custom",
        buttonName: "Porto Testnet",
        url: "https://aptos.testnet.porto.movementlabs.xyz/v1",
    },
    "250": {
        uiQueue: 2,
        chainId: 250,
        name: "custom",
        buttonName: "Bardock Testnet",
        url: "https://testnet.movementnetwork.xyz/v1",
    },
    "126": {
        uiQueue: 3,
        chainId: 126,
        name: "custom",
        buttonName: "Move Mainnet",
        url: "https://mainnet.movementnetwork.xyz/v1",
    },
};

export const MOVEMENT_CHAIN_IDS = [177, 250, 126];

// Default network for connection
export const DEFAULT_NETWORK = NETWORK_MAP["250"]; // Bardock Testnet

export const MOVEMENT_NETWORK = "Movement";
