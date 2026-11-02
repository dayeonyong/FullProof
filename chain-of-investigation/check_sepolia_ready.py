"""Read-only Sepolia demo readiness check. Never signs or sends a transaction."""
import json
import os
from pathlib import Path

from web3 import Web3

DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com"
DEFAULT_CONTRACT = "0x2f68D6252ABb893f07DbFcEe9e2d924786558669"
DEFAULT_SERVER = "0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494"


def main():
    rpc = os.getenv("RPC_URL", DEFAULT_RPC)
    address = Web3.to_checksum_address(os.getenv("CONTRACT_ADDRESS", DEFAULT_CONTRACT))
    server = Web3.to_checksum_address(os.getenv("SEPOLIA_TX_ADDRESS", DEFAULT_SERVER))
    abi_path = Path(__file__).with_name("abi") / "ChainOfInvestigation.json"
    artifact = json.loads(abi_path.read_text(encoding="utf-8"))
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 20}))
    if not w3.is_connected():
        raise SystemExit("FAIL: Sepolia RPC not reachable")
    if w3.eth.chain_id != 11155111:
        raise SystemExit(f"FAIL: unexpected chain ID {w3.eth.chain_id}")
    if not w3.eth.get_code(address):
        raise SystemExit("FAIL: contract not deployed at configured address")
    contract = w3.eth.contract(address=address, abi=artifact["abi"])
    admin = contract.functions.admin().call()
    print("PASS: Sepolia contract is reachable")
    print(f"Contract: {address}")
    print(f"Admin: {admin}")
    print(f"Server: {server}")
    print(f"Server balance (Sepolia ETH): {w3.from_wei(w3.eth.get_balance(server), 'ether')}")
    police = contract.functions.isPolice(server).call()
    recorder = contract.functions.isVerificationRecorder(server).call()
    print(f"Server police permission (required for case/Claim): {police}")
    print(f"Server verification recorder permission: {recorder}")
    print(f"Admin balance (Sepolia ETH): {w3.from_wei(w3.eth.get_balance(admin), 'ether')}")
    if not police:
        print("BLOCKER: Server cannot create cases or anchor Claims with current permissions.")
    if not recorder:
        print("BLOCKER: Server cannot anchor verification results.")
    if not os.getenv("SEPOLIA_TX_PRIVATE_KEY"):
        print("BLOCKER: Server signing key not configured in this local environment.")
    print("NOTE: This check only reads public blockchain state; it makes no transactions.")


if __name__ == "__main__":
    main()
