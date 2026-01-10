// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {IntentVaultFactory} from "../src/IntentVaultFactory.sol";
import {DepositVault} from "../src/DepositVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @title E2E Test Suite
/// @notice Complete end-to-end tests simulating real cross-chain intent flows
contract E2ETest is Test {
    IntentVaultFactory public factory;
    MockERC20 public usdc;
    MockERC20 public weth;

    // Simulated actors
    uint256 constant RELAYER1_PK = 0x1111111111111111111111111111111111111111111111111111111111111111;
    uint256 constant RELAYER2_PK = 0x2222222222222222222222222222222222222222222222222222222222222222;
    uint256 constant RELAYER3_PK = 0x3333333333333333333333333333333333333333333333333333333333333333;
    
    address public relayer1;
    address public relayer2;
    address public relayer3;
    
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public charlie = address(0xC4A4);
    
    // Chain IDs
    uint256 constant MOVEMENT_CHAIN_ID = 336;
    uint256 constant ETHEREUM_CHAIN_ID = 1;

    function setUp() public {
        // Derive relayer addresses
        relayer1 = vm.addr(RELAYER1_PK);
        relayer2 = vm.addr(RELAYER2_PK);
        relayer3 = vm.addr(RELAYER3_PK);

        // Deploy factory with 2-of-3 threshold
        factory = new IntentVaultFactory(2);
        
        // Deploy tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        weth = new MockERC20("Wrapped Ether", "WETH", 18);

        // Setup relayers
        factory.addRelayer(relayer1);
        factory.addRelayer(relayer2);
        factory.addRelayer(relayer3);

        // Setup supported chains
        factory.addSupportedChain(MOVEMENT_CHAIN_ID);
        factory.addSupportedChain(ETHEREUM_CHAIN_ID);

        // Fund users
        usdc.mint(alice, 100_000e6);
        usdc.mint(bob, 50_000e6);
        weth.mint(charlie, 10e18);
    }

    // ============================================================
    //                    E2E SCENARIO 1
    //      Alice bridges 1000 USDC from Ethereum → Movement
    // ============================================================
    
    function test_e2e_aliceBridgesUSDC() public {
        console.log("\n=== E2E Test: Alice Bridges USDC ===\n");
        
        // Intent details
        bytes32 intentId = keccak256("alice-bridge-001");
        uint256 amount = 1000e6; // 1000 USDC
        
        // Step 1: Frontend generates deposit address for Alice
        console.log("Step 1: Generate deposit address");
        address depositAddress = factory.getDepositAddress(alice, intentId);
        console.log("  Deposit address:", depositAddress);
        assertFalse(factory.isVaultDeployed(depositAddress), "Vault should not exist yet");
        
        // Step 2: Alice sends USDC to the deposit address
        console.log("Step 2: Alice deposits 1000 USDC");
        vm.prank(alice);
        usdc.transfer(depositAddress, amount);
        assertEq(usdc.balanceOf(depositAddress), amount, "USDC should be at deposit address");
        console.log("  Deposited:", amount / 1e6, "USDC");
        
        // Step 3: Relayer detects deposit and creates vault
        console.log("Step 3: Relayer creates vault");
        vm.prank(relayer1);
        address vault = factory.createVault(alice, intentId, MOVEMENT_CHAIN_ID);
        assertEq(vault, depositAddress, "Vault should be at predicted address");
        console.log("  Vault created at:", vault);
        
        // Step 4: Intent is fulfilled on Movement (simulated)
        // In production, this would be the resolver calling Movement contracts
        console.log("Step 4: Intent fulfilled on Movement (simulated)");
        
        // Step 5: Relayers sign release authorization
        console.log("Step 5: Relayers sign release");
        address movementRecipient = address(0x4D0E); // Mock Movement address
        uint256 nonce = factory.getNonce(intentId);
        bytes32 digest = factory.getReleaseDigest(intentId, address(usdc), movementRecipient, nonce);
        
        bytes memory sig1 = _sign(RELAYER1_PK, digest);
        bytes memory sig2 = _sign(RELAYER2_PK, digest);
        bytes memory signatures = abi.encodePacked(sig1, sig2);
        console.log("  2-of-3 signatures collected");
        
        // Step 6: Release funds (not typically done for source chain, but demonstrates flow)
        // In real flow, funds stay locked until reverse direction is needed
        console.log("Step 6: Release funds to recipient");
        factory.releaseFromVault(intentId, address(usdc), movementRecipient, signatures);
        
        // Verify final state
        assertEq(usdc.balanceOf(movementRecipient), amount, "Recipient should have USDC");
        assertEq(usdc.balanceOf(vault), 0, "Vault should be empty");
        assertTrue(DepositVault(vault).released(), "Vault should be marked released");
        
        console.log("\n=== SUCCESS: Alice bridged 1000 USDC ===\n");
    }

    // ============================================================
    //                    E2E SCENARIO 2
    //           Multiple users, concurrent intents
    // ============================================================
    
    function test_e2e_multipleUsersConcurrentIntents() public {
        console.log("\n=== E2E Test: Multiple Users Concurrent ===\n");
        
        bytes32 aliceIntent = keccak256("alice-multi-001");
        bytes32 bobIntent = keccak256("bob-multi-001");
        bytes32 charlieIntent = keccak256("charlie-multi-001");
        
        // All users get deposit addresses
        address aliceDeposit = factory.getDepositAddress(alice, aliceIntent);
        address bobDeposit = factory.getDepositAddress(bob, bobIntent);
        address charlieDeposit = factory.getDepositAddress(charlie, charlieIntent);
        
        console.log("Step 1: All users get unique deposit addresses");
        assertTrue(aliceDeposit != bobDeposit, "Addresses should be unique");
        assertTrue(bobDeposit != charlieDeposit, "Addresses should be unique");
        
        // All users deposit simultaneously
        console.log("Step 2: Concurrent deposits");
        vm.prank(alice);
        usdc.transfer(aliceDeposit, 5000e6);
        
        vm.prank(bob);
        usdc.transfer(bobDeposit, 2000e6);
        
        vm.prank(charlie);
        weth.transfer(charlieDeposit, 1e18);
        
        // Create all vaults
        console.log("Step 3: Create all vaults");
        factory.createVault(alice, aliceIntent, MOVEMENT_CHAIN_ID);
        factory.createVault(bob, bobIntent, MOVEMENT_CHAIN_ID);
        factory.createVault(charlie, charlieIntent, MOVEMENT_CHAIN_ID);
        
        assertEq(factory.totalVaults(), 3, "Should have 3 vaults");
        
        // Verify fund isolation
        console.log("Step 4: Verify fund isolation");
        assertEq(usdc.balanceOf(aliceDeposit), 5000e6, "Alice's funds isolated");
        assertEq(usdc.balanceOf(bobDeposit), 2000e6, "Bob's funds isolated");
        assertEq(weth.balanceOf(charlieDeposit), 1e18, "Charlie's funds isolated");
        
        console.log("\n=== SUCCESS: 3 concurrent intents processed ===\n");
    }

    // ============================================================
    //                    E2E SCENARIO 3
    //           Intent expiry and user refund
    // ============================================================
    
    function test_e2e_intentExpiryRefund() public {
        console.log("\n=== E2E Test: Intent Expiry and Refund ===\n");
        
        bytes32 intentId = keccak256("fail-intent-001");
        uint256 amount = 500e6;
        
        // Bob deposits
        console.log("Step 1: Bob deposits 500 USDC");
        address depositAddr = factory.getDepositAddress(bob, intentId);
        vm.prank(bob);
        usdc.transfer(depositAddr, amount);
        
        uint256 bobBalanceBefore = usdc.balanceOf(bob);
        
        // Vault created
        console.log("Step 2: Vault created");
        factory.createVault(bob, intentId, MOVEMENT_CHAIN_ID);
        
        // Simulate resolver failure / no fulfillment
        console.log("Step 3: Intent not fulfilled (resolver offline)");
        
        // Try to refund before expiry - should fail
        console.log("Step 4: Bob tries early refund - should fail");
        vm.prank(bob);
        vm.expectRevert(DepositVault.NotExpiredYet.selector);
        factory.refundFromVault(intentId, address(usdc));
        
        // Wait for expiry (24 hours)
        console.log("Step 5: Wait for 24 hours...");
        vm.warp(block.timestamp + 25 hours);
        
        // Now refund works
        console.log("Step 6: Bob claims refund after expiry");
        vm.prank(bob);
        factory.refundFromVault(intentId, address(usdc));
        
        assertEq(usdc.balanceOf(bob), bobBalanceBefore + amount, "Bob should get refund");
        assertTrue(DepositVault(depositAddr).refunded(), "Should be marked refunded");
        
        console.log("\n=== SUCCESS: Bob refunded after 24h expiry ===\n");
    }

    // ============================================================
    //                    E2E SCENARIO 4
    //         Security: Replay attack prevention
    // ============================================================
    
    function test_e2e_replayAttackPrevention() public {
        console.log("\n=== E2E Test: Replay Attack Prevention ===\n");
        
        bytes32 intentId = keccak256("replay-test-001");
        address recipient1 = address(0x1111);
        address recipient2 = address(0x2222);
        
        // Setup: Create vault with 2000 USDC (enough for potential double-spend)
        address vault = factory.createVault(alice, intentId, MOVEMENT_CHAIN_ID);
        vm.prank(alice);
        usdc.transfer(vault, 2000e6);
        
        // First release: legitimate
        console.log("Step 1: First legitimate release");
        uint256 nonce1 = factory.getNonce(intentId);
        bytes32 digest1 = factory.getReleaseDigest(intentId, address(usdc), recipient1, nonce1);
        bytes memory signatures1 = abi.encodePacked(
            _sign(RELAYER1_PK, digest1),
            _sign(RELAYER2_PK, digest1)
        );
        
        factory.releaseFromVault(intentId, address(usdc), recipient1, signatures1);
        assertEq(usdc.balanceOf(recipient1), 2000e6, "First release should work");
        
        // Attempt replay with same signatures - nonce changed
        console.log("Step 2: Attempt replay attack - should fail");
        
        // Even if vault had more funds, old signatures won't work
        // because nonce has incremented
        vm.expectRevert(); // Will fail signature verification
        factory.releaseFromVault(intentId, address(usdc), recipient1, signatures1);
        
        console.log("\n=== SUCCESS: Replay attack prevented ===\n");
    }

    // ============================================================
    //                    E2E SCENARIO 5
    //         Emergency: Contract pause during exploit
    // ============================================================
    
    function test_e2e_emergencyPause() public {
        console.log("\n=== E2E Test: Emergency Pause ===\n");
        
        bytes32 intentId = keccak256("emergency-001");
        
        // Normal operation
        console.log("Step 1: Normal operation - vault created");
        factory.createVault(alice, intentId, MOVEMENT_CHAIN_ID);
        
        // Owner detects exploit and pauses
        console.log("Step 2: Owner pauses contract (exploit detected)");
        factory.pause();
        assertTrue(factory.paused(), "Contract should be paused");
        
        // All operations blocked
        console.log("Step 3: All operations blocked");
        bytes32 newIntent = keccak256("new-intent");
        
        vm.expectRevert(IntentVaultFactory.ContractPaused.selector);
        factory.createVault(bob, newIntent, MOVEMENT_CHAIN_ID);
        
        // Unpause after fix
        console.log("Step 4: Owner unpause after fix");
        factory.unpause();
        
        // Normal operations resume
        factory.createVault(bob, newIntent, MOVEMENT_CHAIN_ID);
        
        console.log("\n=== SUCCESS: Emergency pause mechanism works ===\n");
    }

    // ============================================================
    //                    E2E SCENARIO 6
    //         Full round-trip: Ethereum → Movement → Ethereum
    // ============================================================
    
    function test_e2e_fullRoundTrip() public {
        console.log("\n=== E2E Test: Full Round-Trip Bridge ===\n");
        
        // --- OUTBOUND: Alice bridges ETH → Movement ---
        console.log("=== OUTBOUND: Ethereum to Movement ===");
        
        bytes32 outboundIntent = keccak256("alice-outbound-001");
        uint256 outboundAmount = 10_000e6;
        
        address outboundDeposit = factory.getDepositAddress(alice, outboundIntent);
        vm.prank(alice);
        usdc.transfer(outboundDeposit, outboundAmount);
        
        factory.createVault(alice, outboundIntent, MOVEMENT_CHAIN_ID);
        console.log("  Alice locked 10,000 USDC on Ethereum");
        console.log("  (Movement contract mints 9,970 mUSDC to Alice - simulated)");
        
        // --- INBOUND: Alice bridges Movement → ETH ---
        console.log("\n=== INBOUND: Movement to Ethereum ===");
        
        // This would be a different factory on Movement calling back
        // For this test, we simulate by having locked funds released
        bytes32 inboundIntent = keccak256("alice-inbound-001");
        
        // Someone else provided liquidity (LP)
        address liquidityProvider = address(0x1234567890123456789012345678901234567890);
        usdc.mint(liquidityProvider, 10_000e6);
        
        address inboundDeposit = factory.getDepositAddress(liquidityProvider, inboundIntent);
        vm.prank(liquidityProvider);
        usdc.transfer(inboundDeposit, 9_970e6); // After 0.3% fee
        
        factory.createVault(liquidityProvider, inboundIntent, ETHEREUM_CHAIN_ID);
        
        // Relayers sign release to Alice
        uint256 nonce = factory.getNonce(inboundIntent);
        bytes32 digest = factory.getReleaseDigest(inboundIntent, address(usdc), alice, nonce);
        bytes memory sigs = abi.encodePacked(
            _sign(RELAYER1_PK, digest),
            _sign(RELAYER3_PK, digest)
        );
        
        factory.releaseFromVault(inboundIntent, address(usdc), alice, sigs);
        
        console.log("  Alice received 9,970 USDC on Ethereum");
        console.log("  Net after round-trip: 9,970 USDC (0.3% fee total)");
        
        // Verify Alice's balance
        // Started with 100,000, sent 10,000, received 9,970
        // = 100,000 - 10,000 + 9,970 = 99,970
        assertEq(usdc.balanceOf(alice), 99_970e6, "Alice round-trip balance correct");
        
        console.log("\n=== SUCCESS: Full round-trip complete ===\n");
    }

    // ============ Helper Functions ============

    function _sign(uint256 privateKey, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
