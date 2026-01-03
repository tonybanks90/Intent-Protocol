// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {IntentVaultFactory} from "../src/IntentVaultFactory.sol";
import {DepositVault} from "../src/DepositVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract IntentVaultFactoryTest is Test {
    IntentVaultFactory public factory;
    MockERC20 public usdc;

    address public owner = address(this);
    
    // Test private keys for signing
    uint256 public relayer1Pk = 0x1234;
    uint256 public relayer2Pk = 0x5678;
    uint256 public relayer3Pk = 0x9abc;
    
    address public relayer1;
    address public relayer2;
    address public relayer3;
    
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public recipient = address(0xDAD);

    bytes32 public intentId1 = keccak256("intent-001");
    bytes32 public intentId2 = keccak256("intent-002");

    // Movement chain ID for testing
    uint256 public constant MOVEMENT_CHAIN_ID = 336;

    function setUp() public {
        // Derive addresses from private keys
        relayer1 = vm.addr(relayer1Pk);
        relayer2 = vm.addr(relayer2Pk);
        relayer3 = vm.addr(relayer3Pk);

        // Deploy with threshold = 2 (2-of-3 multisig)
        factory = new IntentVaultFactory(2);
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Add relayers
        factory.addRelayer(relayer1);
        factory.addRelayer(relayer2);
        factory.addRelayer(relayer3);

        // Add supported chain
        factory.addSupportedChain(MOVEMENT_CHAIN_ID);

        // Mint USDC to users
        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);
    }

    // ============ Deployment Tests ============

    function test_deployment() public view {
        assertEq(factory.owner(), owner);
        assertEq(factory.totalVaults(), 0);
        assertEq(factory.signatureThreshold(), 2);
        assertEq(factory.relayerCount(), 3);
        assertTrue(factory.authorizedRelayers(relayer1));
        assertTrue(factory.authorizedRelayers(relayer2));
        assertTrue(factory.authorizedRelayers(relayer3));
        assertTrue(factory.supportedChains(MOVEMENT_CHAIN_ID));
        assertTrue(factory.vaultImplementation() != address(0));
        assertFalse(factory.paused());
    }

    // ============ Address Derivation Tests ============

    function test_getDepositAddress_deterministic() public view {
        address vault1 = factory.getDepositAddress(alice, intentId1);
        address vault2 = factory.getDepositAddress(alice, intentId1);

        assertEq(vault1, vault2, "Same inputs should give same address");
    }

    function test_getDepositAddress_uniquePerUser() public view {
        address aliceVault = factory.getDepositAddress(alice, intentId1);
        address bobVault = factory.getDepositAddress(bob, intentId1);

        assertTrue(aliceVault != bobVault, "Different users should get different addresses");
    }

    function test_getDepositAddress_uniquePerIntent() public view {
        address vault1 = factory.getDepositAddress(alice, intentId1);
        address vault2 = factory.getDepositAddress(alice, intentId2);

        assertTrue(vault1 != vault2, "Different intents should get different addresses");
    }

    // ============ Vault Creation Tests ============

    function test_createVault_success() public {
        address predictedAddress = factory.getDepositAddress(alice, intentId1);

        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);

        assertEq(vault, predictedAddress, "Vault should be at predicted address");
        assertTrue(factory.isVaultDeployed(vault), "Vault should be deployed");
        assertEq(factory.intentToVault(intentId1), vault, "Intent should map to vault");
        assertEq(factory.totalVaults(), 1, "Total vaults should be 1");
    }

    function test_createVault_returnsExisting() public {
        address vault1 = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        address vault2 = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);

        assertEq(vault1, vault2, "Should return existing vault");
        assertEq(factory.totalVaults(), 1, "Should not double count");
    }

    function test_createVault_initializesCorrectly() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        DepositVault v = DepositVault(vault);

        assertEq(v.user(), alice, "User should be alice");
        assertEq(v.intentId(), intentId1, "Intent ID should match");
        assertEq(v.factory(), address(factory), "Factory should be set");
        assertTrue(v.createdAt() > 0, "CreatedAt should be set");
        assertFalse(v.released(), "Should not be released");
        assertFalse(v.refunded(), "Should not be refunded");
    }

    function test_createVault_revertZeroAddress() public {
        vm.expectRevert(IntentVaultFactory.ZeroAddress.selector);
        factory.createVault(address(0), intentId1, MOVEMENT_CHAIN_ID);
    }

    function test_createVault_revertUnsupportedChain() public {
        vm.expectRevert(IntentVaultFactory.UnsupportedChain.selector);
        factory.createVault(alice, intentId1, 999);
    }

    function test_createVault_revertWhenPaused() public {
        factory.pause();
        vm.expectRevert(IntentVaultFactory.ContractPaused.selector);
        factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
    }

    // ============ Deposit Flow Tests ============

    function test_depositFlow_userCanSendTokens() public {
        // Get deposit address before vault exists
        address depositAddress = factory.getDepositAddress(alice, intentId1);

        // Alice sends USDC to the predicted address
        vm.prank(alice);
        usdc.transfer(depositAddress, 1000e6);

        // Verify balance at address (even before vault deployment)
        assertEq(usdc.balanceOf(depositAddress), 1000e6);

        // Now create the vault
        factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);

        // Verify vault has the tokens
        DepositVault vault = DepositVault(depositAddress);
        assertEq(vault.getBalance(address(usdc)), 1000e6);
    }

    // ============ Release Tests with Threshold Signatures ============

    function test_releaseFromVault_success() public {
        // Setup: create vault with funds
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        // Get release digest
        uint256 nonce = factory.getNonce(intentId1);
        bytes32 digest = factory.getReleaseDigest(intentId1, address(usdc), recipient, nonce);

        // Sign with 2 relayers (meets threshold)
        bytes memory sig1 = _sign(relayer1Pk, digest);
        bytes memory sig2 = _sign(relayer2Pk, digest);
        bytes memory signatures = abi.encodePacked(sig1, sig2);

        // Release funds
        factory.releaseFromVault(intentId1, address(usdc), recipient, signatures);

        // Verify
        assertEq(usdc.balanceOf(recipient), 1000e6, "Recipient should receive funds");
        assertEq(usdc.balanceOf(vault), 0, "Vault should be empty");
        assertTrue(DepositVault(vault).released(), "Should be marked released");
        assertEq(factory.getNonce(intentId1), 1, "Nonce should increment");
    }

    function test_releaseFromVault_revertInsufficientSignatures() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        uint256 nonce = factory.getNonce(intentId1);
        bytes32 digest = factory.getReleaseDigest(intentId1, address(usdc), recipient, nonce);

        // Sign with only 1 relayer (below threshold of 2)
        bytes memory sig1 = _sign(relayer1Pk, digest);

        vm.expectRevert(IntentVaultFactory.InsufficientSignatures.selector);
        factory.releaseFromVault(intentId1, address(usdc), recipient, sig1);
    }

    function test_releaseFromVault_revertDuplicateSigner() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        uint256 nonce = factory.getNonce(intentId1);
        bytes32 digest = factory.getReleaseDigest(intentId1, address(usdc), recipient, nonce);

        // Sign twice with same relayer
        bytes memory sig1 = _sign(relayer1Pk, digest);
        bytes memory signatures = abi.encodePacked(sig1, sig1);

        vm.expectRevert(IntentVaultFactory.DuplicateSigner.selector);
        factory.releaseFromVault(intentId1, address(usdc), recipient, signatures);
    }

    function test_releaseFromVault_revertSignerNotRelayer() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        uint256 nonce = factory.getNonce(intentId1);
        bytes32 digest = factory.getReleaseDigest(intentId1, address(usdc), recipient, nonce);

        // Sign with unauthorized key
        uint256 unauthorizedPk = 0xDEAD;
        bytes memory sig1 = _sign(relayer1Pk, digest);
        bytes memory sig2 = _sign(unauthorizedPk, digest);
        bytes memory signatures = abi.encodePacked(sig1, sig2);

        vm.expectRevert(IntentVaultFactory.SignerNotRelayer.selector);
        factory.releaseFromVault(intentId1, address(usdc), recipient, signatures);
    }

    function test_releaseFromVault_revertVaultNotFound() public {
        bytes memory signatures = new bytes(130); // Empty signatures

        vm.expectRevert(IntentVaultFactory.VaultNotFound.selector);
        factory.releaseFromVault(intentId1, address(usdc), recipient, signatures);
    }

    // ============ Refund Tests ============

    function test_refundFromVault_success() public {
        // Setup: create vault with funds
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        // Fast forward past expiry
        vm.warp(block.timestamp + 25 hours);

        // Refund
        vm.prank(alice);
        factory.refundFromVault(intentId1, address(usdc));

        // Verify
        assertEq(usdc.balanceOf(alice), 10_000e6, "Alice should get refund");
        assertEq(usdc.balanceOf(vault), 0, "Vault should be empty");
        assertTrue(DepositVault(vault).refunded(), "Should be marked refunded");
    }

    function test_refundFromVault_revertNotExpired() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        vm.prank(alice);
        vm.expectRevert(DepositVault.NotExpiredYet.selector);
        factory.refundFromVault(intentId1, address(usdc));
    }

    function test_refundFromVault_revertNotOriginalUser() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 1000e6);

        vm.warp(block.timestamp + 25 hours);

        vm.prank(bob);
        vm.expectRevert(DepositVault.NotOriginalUser.selector);
        factory.refundFromVault(intentId1, address(usdc));
    }

    // ============ Pause Tests ============

    function test_pause_blocksOperations() public {
        factory.pause();
        assertTrue(factory.paused());

        vm.expectRevert(IntentVaultFactory.ContractPaused.selector);
        factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
    }

    function test_unpause_restoresOperations() public {
        factory.pause();
        factory.unpause();
        assertFalse(factory.paused());

        // Should work now
        factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);
    }

    // ============ Admin Tests ============

    function test_addRelayer() public {
        address newRelayer = address(0x5678);
        factory.addRelayer(newRelayer);
        assertTrue(factory.authorizedRelayers(newRelayer));
        assertEq(factory.relayerCount(), 4);
    }

    function test_removeRelayer() public {
        factory.removeRelayer(relayer1);
        assertFalse(factory.authorizedRelayers(relayer1));
        assertEq(factory.relayerCount(), 2);
    }

    function test_setSignatureThreshold() public {
        factory.setSignatureThreshold(1);
        assertEq(factory.signatureThreshold(), 1);
    }

    function test_setSignatureThreshold_revertInvalid() public {
        vm.expectRevert(IntentVaultFactory.InvalidThreshold.selector);
        factory.setSignatureThreshold(0);

        vm.expectRevert(IntentVaultFactory.InvalidThreshold.selector);
        factory.setSignatureThreshold(10); // More than relayer count
    }

    function test_transferOwnership() public {
        factory.transferOwnership(alice);
        assertEq(factory.owner(), alice);
    }

    function test_adminFunctions_revertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(IntentVaultFactory.NotOwner.selector);
        factory.addRelayer(bob);
    }

    // ============ View Function Tests ============

    function test_getVaultDetails() public {
        address vault = factory.createVault(alice, intentId1, MOVEMENT_CHAIN_ID);

        (
            address vaultAddr,
            address user,
            bool isExpired,
            bool isProcessed
        ) = factory.getVaultDetails(intentId1);

        assertEq(vaultAddr, vault);
        assertEq(user, alice);
        assertFalse(isExpired);
        assertFalse(isProcessed);
    }

    // ============ Helper Functions ============

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
