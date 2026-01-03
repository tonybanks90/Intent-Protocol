// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Clones
/// @author OpenZeppelin (simplified version)
/// @notice Library for deploying and predicting addresses of EIP-1167 minimal proxies
library Clones {
    /// @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
    /// @param implementation The address of the implementation contract
    /// @param salt The salt used for CREATE2 deterministic deployment
    /// @return instance The address of the deployed clone
    function cloneDeterministic(
        address implementation,
        bytes32 salt
    ) internal returns (address instance) {
        /// @solidity memory-safe-assembly
        assembly {
            // Stores the bytecode after address
            mstore(0x20, 0x5af43d82803e903d91602b57fd5bf3)
            // implementation address
            mstore(0x11, implementation)
            // Packs the first 3 bytes of the `implementation` address with the bytecode before the address.
            mstore(0x00, or(shr(0x88, implementation), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
            instance := create2(0, 0x09, 0x37, salt)
        }
        require(instance != address(0), "ERC1167: create2 failed");
    }

    /// @dev Computes the address of a clone deployed using CREATE2
    /// @param implementation The address of the implementation contract
    /// @param salt The salt used for CREATE2 deterministic deployment
    /// @param deployer The address of the deployer (factory contract)
    /// @return predicted The predicted address of the clone
    function predictDeterministicAddress(
        address implementation,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        /// @solidity memory-safe-assembly
        assembly {
            let ptr := mload(0x40)
            mstore(add(ptr, 0x38), deployer)
            mstore(add(ptr, 0x24), 0x5af43d82803e903d91602b57fd5bf3ff)
            mstore(add(ptr, 0x14), implementation)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73)
            mstore(add(ptr, 0x58), salt)
            mstore(add(ptr, 0x78), keccak256(add(ptr, 0x0c), 0x37))
            predicted := keccak256(add(ptr, 0x43), 0x55)
        }
    }

    /// @dev Computes the address of a clone deployed using CREATE2 (simplified version)
    /// @param implementation The address of the implementation contract
    /// @param salt The salt used for CREATE2 deterministic deployment
    /// @return predicted The predicted address of the clone
    function predictDeterministicAddress(
        address implementation,
        bytes32 salt
    ) internal view returns (address predicted) {
        return predictDeterministicAddress(implementation, salt, address(this));
    }
}
