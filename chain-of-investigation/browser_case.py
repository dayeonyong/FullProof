"""Build unsigned Sepolia case creation for a registered police wallet."""
from web3 import Web3
from browser_tx import prepare_contract_transaction, BrowserTransactionError


def prepare_police_case_creation(w3, contract, case_id, police_address):
    if not isinstance(case_id, str) or not case_id.strip():
        raise ValueError("Case ID required")
    if not Web3.is_address(police_address):
        raise ValueError("Invalid police wallet")
    police = Web3.to_checksum_address(police_address)
    if not contract.functions.isPolice(police).call() and police.lower() != contract.functions.admin().call().lower():
        raise PermissionError("Registered police wallet required")
    import hashlib
    case_number = int.from_bytes(hashlib.sha256(case_id.encode("utf-8")).digest(), "big")
    return prepare_contract_transaction(w3, contract.functions.createCase(case_number), police)
