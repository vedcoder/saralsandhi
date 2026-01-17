// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ContractRegistry
 * @notice Stores SHA-256 hashes of finalized contracts for verification
 * @dev Simple storage contract for SaralSandhi contract hashes
 */
contract ContractRegistry {
    // Owner of the contract (deployer)
    address public owner;

    // Mapping from contract UUID (as bytes32) to document hash (bytes32)
    mapping(bytes32 => bytes32) public contractHashes;

    // Mapping to track if a contract ID already has a hash stored
    mapping(bytes32 => bool) public isStored;

    // Timestamp when hash was stored
    mapping(bytes32 => uint256) public storedAt;

    // Event emitted when a contract hash is stored
    event ContractHashStored(
        bytes32 indexed contractId,
        bytes32 documentHash,
        uint256 timestamp
    );

    // Modifier to restrict certain functions to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Store a contract hash on-chain
     * @param contractId The UUID of the contract (converted to bytes32)
     * @param documentHash The SHA-256 hash of the contract data
     */
    function storeHash(bytes32 contractId, bytes32 documentHash) external onlyOwner {
        require(!isStored[contractId], "Contract hash already stored");
        require(documentHash != bytes32(0), "Invalid document hash");

        contractHashes[contractId] = documentHash;
        isStored[contractId] = true;
        storedAt[contractId] = block.timestamp;

        emit ContractHashStored(contractId, documentHash, block.timestamp);
    }

    /**
     * @notice Verify if a document hash matches the stored hash
     * @param contractId The UUID of the contract
     * @param documentHash The hash to verify
     * @return bool True if hashes match
     */
    function verifyHash(bytes32 contractId, bytes32 documentHash) external view returns (bool) {
        return isStored[contractId] && contractHashes[contractId] == documentHash;
    }

    /**
     * @notice Get stored hash for a contract
     * @param contractId The UUID of the contract
     * @return bytes32 The stored document hash
     */
    function getHash(bytes32 contractId) external view returns (bytes32) {
        return contractHashes[contractId];
    }

    /**
     * @notice Transfer ownership
     * @param newOwner Address of new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
