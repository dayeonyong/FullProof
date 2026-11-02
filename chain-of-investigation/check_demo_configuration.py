"""Read-only readiness report for the deployed FullProof Sepolia demo.

Usage: python check_demo_configuration.py
No keys, transactions, or account secrets are used.
"""
import os
from web3 import Web3

RPC = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
CONTRACT = os.getenv("CONTRACT_ADDRESS", "0x2f68D6252ABb893f07DbFcEe9e2d924786558669")
SERVER = os.getenv("SEPOLIA_TX_ADDRESS", "0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494")


def main():
    from pathlib import Path
    import json
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 20}))
    if not w3.is_connected() or w3.eth.chain_id != 11155111:
        raise SystemExit("BLOCKER: Sepolia RPC unavailable")
    abi_path = Path(__file__).with_name("abi") / "ChainOfInvestigation.json"
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT), abi=json.loads(abi_path.read_text(encoding="utf-8"))["abi"])
    print("Chain: Sepolia")
    print("Contract deployed:", bool(w3.eth.get_code(contract.address)))
    print("Server police:", contract.functions.isPolice(Web3.to_checksum_address(SERVER)).call())
    print("Server verification recorder:", contract.functions.isVerificationRecorder(Web3.to_checksum_address(SERVER)).call())
    print("Admin address:", contract.functions.admin().call())
    agency = os.getenv("UI_AGENCY_ADDRESS", "")
    if not agency:
        print("LOCAL CONFIG MISSING: UI_AGENCY_ADDRESS (Render may be configured separately)")
    elif not Web3.is_address(agency):
        print("BLOCKER: UI_AGENCY_ADDRESS invalid")
    else:
        info = contract.functions.agencies(Web3.to_checksum_address(agency)).call()
        print("Agency type:", int(info[0]))
        print("Agency active:", bool(info[1]))
        print("Agency signer:", info[2])
        if not info[1] or int(info[0]) not in (2, 3):
            print("BLOCKER: Agency requires an active TELECOM or CCTV registration")
    print("Note: Local environment does not represent Render variables.")
    print("Note: Agency setup must be checked in Render or the deployed status API.")
    print("Note: This tool does not prove the full UI workflow works.")


if __name__ == "__main__":
    main()
