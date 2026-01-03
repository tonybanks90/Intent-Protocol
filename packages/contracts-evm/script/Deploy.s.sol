// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IntentVaultFactory} from "../src/IntentVaultFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying IntentVaultFactory...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        IntentVaultFactory factory = new IntentVaultFactory(2); // 2-of-N threshold

        console.log("IntentVaultFactory deployed at:", address(factory));
        console.log("VaultImplementation at:", factory.vaultImplementation());

        vm.stopBroadcast();

        // Log deployment info
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Factory:", address(factory));
        console.log("Owner:", factory.owner());
        console.log("");
        console.log("Next steps:");
        console.log("1. Add relayers: factory.addRelayer(relayerAddress)");
        console.log("2. Verify on explorer");
    }
}

contract AddRelayerScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address relayerAddress = vm.envAddress("RELAYER_ADDRESS");

        console.log("Adding relayer to factory...");
        console.log("Factory:", factoryAddress);
        console.log("Relayer:", relayerAddress);

        vm.startBroadcast(deployerPrivateKey);

        IntentVaultFactory factory = IntentVaultFactory(factoryAddress);
        factory.addRelayer(relayerAddress);

        console.log("Relayer added successfully!");

        vm.stopBroadcast();
    }
}
