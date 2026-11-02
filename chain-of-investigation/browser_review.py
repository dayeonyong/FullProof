"""Read-only preflight for administrator review transactions.

No browser signatures, private keys, or blockchain writes are handled here.
"""
import hashlib
from browser_tx import prepare_contract_transaction


ACTIONS = {"ACCEPTED": 1, "ACKNOWLEDGED": 2, "REVISION_REQUESTED": 3}


def prepare_review_transaction(w3, contract, verification, verification_id, review_status, admin_address):
    if review_status not in ACTIONS:
        raise ValueError("Unknown review status")
    if verification.get("processing_status") != "COMPLETED":
        raise ValueError("Verification not completed")
    if review_status == "ACCEPTED" and verification.get("verdict") != "SUPPORTED":
        raise ValueError("Only SUPPORTED results can be approved")
    verification_id_hash = "0x" + hashlib.sha256(verification_id.encode("utf-8")).hexdigest()
    fn = contract.functions.recordVerificationReview(
        int.from_bytes(hashlib.sha256(verification["case_id"].encode("utf-8")).digest(), "big"),
        verification["step_id"],
        verification_id_hash,
        verification["verification_hash"],
        ACTIONS[review_status],
    )
    return prepare_contract_transaction(w3, fn, admin_address)
