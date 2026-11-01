"""Network-aware transaction submission for FullProof.

Hardhat uses its locally unlocked accounts. Sepolia uses a dedicated
environment-configured transaction key and never reads a key from source.
This module deliberately does not provide administrator authorization.
"""
import os

from eth_account import Account
from web3 import Web3


SEPOLIA_CHAIN_ID = 11155111
HARDHAT_CHAIN_ID = 31337


class TransactionConfigurationError(RuntimeError):
    pass


def get_server_address():
    """Get configured Sepolia server-wallet address without broadcasting."""
    key = os.getenv("SEPOLIA_TX_PRIVATE_KEY")
    if not key:
        raise TransactionConfigurationError("SEPOLIA_TX_PRIVATE_KEY is not configured")
    return Account.from_key(key).address


def submit_transaction(w3: Web3, function, *, role="sender"):
    """Submit contract call on selected chain and return its transaction hash.

    Local Hardhat preserves the existing unlocked-account behavior.
    Sepolia only permits the explicitly configured server transaction wallet.
    Caller must verify contract roles and authorization before submitting.
    """
    chain_id = w3.eth.chain_id
    if chain_id == HARDHAT_CHAIN_ID:
        accounts = w3.eth.accounts
        index = 1 if role == "verification" else 0
        if len(accounts) <= index:
            raise TransactionConfigurationError("Missing unlocked Hardhat account")
        return function.transact({"from": accounts[index]})

    if chain_id != SEPOLIA_CHAIN_ID:
        raise TransactionConfigurationError(f"Unsupported chain ID: {chain_id}")

    if role not in ("sender", "verification"):
        raise TransactionConfigurationError("Admin/reviewer transaction requires its actual authorized signer")

    key = os.getenv("SEPOLIA_TX_PRIVATE_KEY")
    if not key:
        raise TransactionConfigurationError("SEPOLIA_TX_PRIVATE_KEY is not configured")

    account = Account.from_key(key)
    gas_estimate = function.estimate_gas({"from": account.address})
    tx = function.build_transaction({
        "from": account.address,
        "chainId": SEPOLIA_CHAIN_ID,
        "nonce": w3.eth.get_transaction_count(account.address, "pending"),
        "gas": gas_estimate + max(gas_estimate // 5, 10000),
    })
    signed = account.sign_transaction(tx)
    return w3.eth.send_raw_transaction(signed.raw_transaction)
