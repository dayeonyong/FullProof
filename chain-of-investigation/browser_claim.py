"""Prepare signed-by-browser Claim transactions without server wallet secrets."""
import hashlib
from web3 import Web3
from hash_utils import hash_claim_text
from browser_tx import prepare_contract_transaction


def prepare_claim(w3, contract, case_id, step_id, claim_id, version, text, police):
    if not Web3.is_address(police):
        raise ValueError("Invalid police address")
    address = Web3.to_checksum_address(police)
    if not contract.functions.isPolice(address).call():
        raise PermissionError("Registered police wallet required")
    if not claim_id or not text.strip() or version < 1 or step_id < 0:
        raise ValueError("Invalid Claim")
    case_number = int.from_bytes(hashlib.sha256(case_id.encode("utf-8")).digest(), "big")
    claim_id_hash = "0x" + hashlib.sha256(claim_id.encode("utf-8")).hexdigest()
    author_hash = "0x" + hashlib.sha256(address.lower().encode("utf-8")).hexdigest()
    created_at = int(w3.eth.get_block("latest")["timestamp"])
    fn = contract.functions.anchorClaim(
        case_number, step_id, claim_id_hash, version,
        hash_claim_text(text), author_hash, created_at,
    )
    return prepare_contract_transaction(w3, fn, address), created_at
