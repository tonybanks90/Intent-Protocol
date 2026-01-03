// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";

/// @title DepositVault
/// @author Intent Protocol Team
/// @notice Isolated vault for a single intent
/// @dev Deployed as EIP-1167 minimal proxy by IntentVaultFactory
contract DepositVault {
    // ============ Constants ============

    /// @notice Time after which user can claim refund
    uint256 public constant EXPIRY_TIME = 24 hours;

    // ============ State Variables ============

    /// @notice Original depositor address
    address public user;

    /// @notice Unique intent identifier
    bytes32 public intentId;

    /// @notice Factory contract that deployed this vault
    address public factory;

    /// @notice Timestamp when vault was created
    uint256 public createdAt;

    /// @notice Whether funds have been released to recipient
    bool public released;

    /// @notice Whether funds have been refunded to user
    bool public refunded;

    /// @notice Initialization flag to prevent re-initialization
    bool private _initialized;

    // ============ Events ============

    event Initialized(address indexed user, bytes32 indexed intentId, address factory);
    event Released(address indexed token, address indexed recipient, uint256 amount);
    event Refunded(address indexed token, address indexed user, uint256 amount);

    // ============ Errors ============

    error AlreadyInitialized();
    error OnlyFactory();
    error AlreadyProcessed();
    error NotOriginalUser();
    error NotExpiredYet();
    error NoBalance();

    // ============ Modifiers ============

    modifier onlyFactory() {
        if (msg.sender != factory) revert OnlyFactory();
        _;
    }

    // ============ External Functions ============

    /// @notice Initialize vault with user and intent details
    /// @dev Can only be called once by factory
    /// @param _user Original depositor address
    /// @param _intentId Unique intent identifier
    /// @param _factory Factory contract address
    function initialize(
        address _user,
        bytes32 _intentId,
        address _factory
    ) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        user = _user;
        intentId = _intentId;
        factory = _factory;
        createdAt = block.timestamp;

        emit Initialized(_user, _intentId, _factory);
    }

    /// @notice Release funds to recipient
    /// @dev Only factory can call this
    /// @param token Token address to release
    /// @param recipient Where to send funds
    function release(address token, address recipient) external onlyFactory {
        if (released || refunded) revert AlreadyProcessed();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert NoBalance();

        released = true;

        // Use safe transfer
        bool success = IERC20(token).transfer(recipient, balance);
        require(success, "Transfer failed");

        emit Released(token, recipient, balance);
    }

    /// @notice Refund funds to original user after expiry
    /// @dev Only factory can call, and only after expiry
    /// @param token Token address to refund
    /// @param caller Address that initiated the refund (must be original user)
    function refund(address token, address caller) external onlyFactory {
        if (released || refunded) revert AlreadyProcessed();
        if (caller != user) revert NotOriginalUser();
        if (block.timestamp <= createdAt + EXPIRY_TIME) revert NotExpiredYet();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert NoBalance();

        refunded = true;

        // Use safe transfer
        bool success = IERC20(token).transfer(user, balance);
        require(success, "Transfer failed");

        emit Refunded(token, user, balance);
    }

    // ============ View Functions ============

    /// @notice Get token balance in this vault
    /// @param token Token address to check
    /// @return Balance of token in vault
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @notice Check if vault has expired (24 hours since creation)
    /// @return True if expired
    function isExpired() external view returns (bool) {
        return block.timestamp > createdAt + EXPIRY_TIME;
    }

    /// @notice Check if vault has been processed (released or refunded)
    /// @return True if processed
    function isProcessed() external view returns (bool) {
        return released || refunded;
    }

    /// @notice Get time remaining until expiry
    /// @return Seconds until expiry, or 0 if already expired
    function timeUntilExpiry() external view returns (uint256) {
        uint256 expiryTime = createdAt + EXPIRY_TIME;
        if (block.timestamp >= expiryTime) {
            return 0;
        }
        return expiryTime - block.timestamp;
    }
}
