import asyncio
import hashlib
import logging
from typing import Optional, Tuple
from uuid import UUID

from web3 import Web3
from web3.exceptions import ContractLogicError, TransactionNotFound
from eth_account import Account
from eth_account.signers.local import LocalAccount

from core.config import get_settings

logger = logging.getLogger(__name__)

# ABI for ContractRegistry (minimal - only functions we use)
CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "contractId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "documentHash", "type": "bytes32"}
        ],
        "name": "storeHash",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "contractId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "documentHash", "type": "bytes32"}
        ],
        "name": "verifyHash",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "contractId", "type": "bytes32"}],
        "name": "getHash",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "contractId", "type": "bytes32"}],
        "name": "isStored",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "contractId", "type": "bytes32"},
            {"indexed": False, "internalType": "bytes32", "name": "documentHash", "type": "bytes32"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "ContractHashStored",
        "type": "event"
    }
]


class BlockchainService:
    """Service for interacting with Ethereum Sepolia testnet."""

    def __init__(self):
        self.settings = get_settings()
        self._web3: Optional[Web3] = None
        self._account: Optional[LocalAccount] = None
        self._contract = None

    @property
    def is_enabled(self) -> bool:
        """Check if blockchain integration is enabled and properly configured."""
        return (
            self.settings.BLOCKCHAIN_ENABLED and
            bool(self.settings.ETHEREUM_RPC_URL) and
            bool(self.settings.ETHEREUM_PRIVATE_KEY) and
            bool(self.settings.CONTRACT_REGISTRY_ADDRESS)
        )

    def _get_web3(self) -> Web3:
        """Get or create Web3 instance."""
        if self._web3 is None:
            self._web3 = Web3(Web3.HTTPProvider(self.settings.ETHEREUM_RPC_URL))
            if not self._web3.is_connected():
                raise ConnectionError("Failed to connect to Ethereum node")
        return self._web3

    def _get_account(self) -> LocalAccount:
        """Get or create account from private key."""
        if self._account is None:
            self._account = Account.from_key(self.settings.ETHEREUM_PRIVATE_KEY)
        return self._account

    def _get_contract(self):
        """Get or create contract instance."""
        if self._contract is None:
            web3 = self._get_web3()
            self._contract = web3.eth.contract(
                address=Web3.to_checksum_address(self.settings.CONTRACT_REGISTRY_ADDRESS),
                abi=CONTRACT_ABI
            )
        return self._contract

    def generate_document_hash(self, pdf_data: bytes, contract_id: UUID, metadata: dict) -> str:
        """
        Generate SHA-256 hash of contract data.

        Args:
            pdf_data: Raw PDF bytes
            contract_id: Contract UUID
            metadata: Dict with filename, created_at, parties info

        Returns:
            Hex string of SHA-256 hash (with 0x prefix)
        """
        # Create deterministic hash from PDF + metadata
        hash_input = pdf_data + str(contract_id).encode() + str(sorted(metadata.items())).encode()
        hash_bytes = hashlib.sha256(hash_input).digest()
        return "0x" + hash_bytes.hex()

    def _uuid_to_bytes32(self, contract_id: UUID) -> bytes:
        """Convert UUID to bytes32 for smart contract."""
        return contract_id.bytes.ljust(32, b'\x00')

    async def store_hash_on_chain(
        self,
        contract_id: UUID,
        document_hash: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Store document hash on Ethereum Sepolia testnet.

        Args:
            contract_id: Contract UUID
            document_hash: SHA-256 hash (0x-prefixed hex string)

        Returns:
            Tuple of (success, transaction_hash, error_message)
        """
        logger.info(f"🔗 [BLOCKCHAIN] Starting hash storage for contract: {contract_id}")
        logger.info(f"🔗 [BLOCKCHAIN] Document hash: {document_hash[:18]}...")

        if not self.is_enabled:
            logger.warning("🔗 [BLOCKCHAIN] Integration is disabled - skipping on-chain storage")
            return False, None, "Blockchain integration is disabled"

        try:
            logger.info("🔗 [BLOCKCHAIN] Connecting to Ethereum Sepolia...")
            web3 = self._get_web3()
            account = self._get_account()
            contract = self._get_contract()
            logger.info(f"🔗 [BLOCKCHAIN] Connected! Wallet: {account.address}")

            # Convert inputs to bytes32
            contract_id_bytes = self._uuid_to_bytes32(contract_id)
            hash_bytes = Web3.to_bytes(hexstr=document_hash)

            # Build transaction
            logger.info("🔗 [BLOCKCHAIN] Building transaction...")
            nonce = web3.eth.get_transaction_count(account.address)
            gas_price = web3.eth.gas_price
            logger.info(f"🔗 [BLOCKCHAIN] Nonce: {nonce}, Gas Price: {gas_price} wei")

            tx = contract.functions.storeHash(
                contract_id_bytes,
                hash_bytes
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': self.settings.BLOCKCHAIN_GAS_LIMIT,
                'gasPrice': gas_price,
                'chainId': 11155111  # Sepolia chain ID
            })

            # Sign and send transaction
            logger.info("🔗 [BLOCKCHAIN] Signing transaction...")
            signed_tx = web3.eth.account.sign_transaction(tx, account.key)
            logger.info("🔗 [BLOCKCHAIN] Sending transaction to network...")
            tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash_hex = "0x" + tx_hash.hex()
            logger.info(f"🔗 [BLOCKCHAIN] Transaction sent! TX Hash: {tx_hash_hex}")

            # Wait for transaction receipt with retries
            logger.info("🔗 [BLOCKCHAIN] Waiting for transaction confirmation...")
            for attempt in range(self.settings.BLOCKCHAIN_MAX_RETRIES):
                try:
                    receipt = web3.eth.wait_for_transaction_receipt(
                        tx_hash,
                        timeout=60
                    )
                    if receipt['status'] == 1:
                        logger.info(f"✅ [BLOCKCHAIN] Transaction confirmed! Block: {receipt['blockNumber']}")
                        logger.info(f"✅ [BLOCKCHAIN] Gas used: {receipt['gasUsed']}")
                        logger.info(f"✅ [BLOCKCHAIN] Etherscan: https://sepolia.etherscan.io/tx/{tx_hash_hex}")
                        return True, tx_hash_hex, None
                    else:
                        logger.error("❌ [BLOCKCHAIN] Transaction reverted on-chain")
                        return False, None, "Transaction reverted"
                except TransactionNotFound:
                    logger.info(f"🔗 [BLOCKCHAIN] Waiting for confirmation (attempt {attempt + 1}/{self.settings.BLOCKCHAIN_MAX_RETRIES})...")
                    if attempt < self.settings.BLOCKCHAIN_MAX_RETRIES - 1:
                        await asyncio.sleep(self.settings.BLOCKCHAIN_RETRY_DELAY)
                    continue

            logger.error("❌ [BLOCKCHAIN] Transaction not confirmed in time")
            return False, None, "Transaction not confirmed in time"

        except ContractLogicError as e:
            error_msg = str(e)
            if "already stored" in error_msg.lower():
                # Hash already stored - this is OK
                logger.info(f"🔗 [BLOCKCHAIN] Hash already stored for contract {contract_id}")
                return True, None, "Hash already stored"
            logger.error(f"❌ [BLOCKCHAIN] Contract error: {error_msg}")
            return False, None, error_msg
        except Exception as e:
            logger.error(f"❌ [BLOCKCHAIN] Error: {str(e)}", exc_info=True)
            return False, None, str(e)

    async def verify_hash_on_chain(
        self,
        contract_id: UUID,
        document_hash: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify a document hash against on-chain storage.

        Args:
            contract_id: Contract UUID
            document_hash: SHA-256 hash to verify

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.is_enabled:
            return False, "Blockchain integration is disabled"

        try:
            contract = self._get_contract()

            contract_id_bytes = self._uuid_to_bytes32(contract_id)
            hash_bytes = Web3.to_bytes(hexstr=document_hash)

            is_valid = contract.functions.verifyHash(
                contract_id_bytes,
                hash_bytes
            ).call()

            return is_valid, None

        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            return False, str(e)

    def get_etherscan_url(self, tx_hash: str) -> str:
        """Get Etherscan URL for a transaction hash."""
        return f"https://sepolia.etherscan.io/tx/{tx_hash}"


# Singleton instance
blockchain_service = BlockchainService()
