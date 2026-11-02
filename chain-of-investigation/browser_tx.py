"""Read-only contract transaction preparation for browser-wallet signing.

Never accepts private keys. Never broadcasts transactions. The returned
transaction must be reviewed and signed by the active MetaMask account.
"""
from web3 import Web3

SEPOLIA_CHAIN_ID = 11155111


class BrowserTransactionError(ValueError):
    pass


def prepare_contract_transaction(w3, contract_function, wallet_address):
    """Build an unsigned transaction for the connected browser wallet."""
    if w3.eth.chain_id != SEPOLIA_CHAIN_ID:
        raise BrowserTransactionError("Expected Sepolia network")
    if not Web3.is_address(wallet_address):
        raise BrowserTransactionError("Invalid wallet address")
    sender = Web3.to_checksum_address(wallet_address)
    gas = contract_function.estimate_gas({"from": sender})
    return contract_function.build_transaction({
        "from": sender,
        "chainId": SEPOLIA_CHAIN_ID,
        "nonce": w3.eth.get_transaction_count(sender, "pending"),
        "gas": gas + max(10000, gas // 5),
    })
