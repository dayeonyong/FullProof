"""Read-only Sepolia agency-registration verification (no private keys needed)."""
import json
import os
from pathlib import Path
from web3 import Web3

AGENCY = "0x4A8641Dc48C3fFE74fc02034e80910402833f9B1"
RPC = os.getenv("RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
CONTRACT = os.getenv("CONTRACT_ADDRESS", "0x2f68D6252ABb893f07DbFcEe9e2d924786558669")


def main():
    w3 = Web3(Web3.HTTPProvider(RPC, request_kwargs={"timeout": 20}))
    if not w3.is_connected() or w3.eth.chain_id != 11155111:
        raise SystemExit("Sepolia connection failed")
    abi = json.loads((Path(__file__).parent / "abi" / "ChainOfInvestigation.json").read_text(encoding="utf-8"))["abi"]
    contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT), abi=abi)
    kind, active, signer = contract.functions.agencies(Web3.to_checksum_address(AGENCY)).call()
    print("Agency:", AGENCY)
    print("Type:", int(kind), "(2 means TELECOM)")
    print("Active:", bool(active))
    print("Signer:", signer)
    print("READY:", int(kind) == 2 and bool(active) and signer.lower() == AGENCY.lower())


if __name__ == "__main__":
    main()
