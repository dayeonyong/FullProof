"""Offline tests: no real blockchain calls, no keys, no gas spent."""
import os
import unittest
from unittest.mock import Mock, patch

from chain_tx import (
    HARDHAT_CHAIN_ID, SEPOLIA_CHAIN_ID,
    TransactionConfigurationError, get_server_address, submit_transaction,
)


class TransactionHelperTests(unittest.TestCase):
    def test_local_sender_uses_first_unlocked_account(self):
        w3 = Mock()
        w3.eth.chain_id = HARDHAT_CHAIN_ID
        w3.eth.accounts = ["0xlocal0", "0xlocal1"]
        contract_fn = Mock()
        contract_fn.transact.return_value = b"tx"
        self.assertEqual(submit_transaction(w3, contract_fn), b"tx")
        contract_fn.transact.assert_called_once_with({"from": "0xlocal0"})

    def test_local_verification_uses_second_account(self):
        w3 = Mock()
        w3.eth.chain_id = HARDHAT_CHAIN_ID
        w3.eth.accounts = ["0xlocal0", "0xlocal1"]
        fn = Mock()
        submit_transaction(w3, fn, role="verification")
        fn.transact.assert_called_once_with({"from": "0xlocal1"})

    def test_other_network_is_rejected(self):
        w3 = Mock()
        w3.eth.chain_id = 1
        with self.assertRaises(TransactionConfigurationError):
            submit_transaction(w3, Mock())

    def test_missing_sepolia_key_is_rejected(self):
        w3 = Mock()
        w3.eth.chain_id = SEPOLIA_CHAIN_ID
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(TransactionConfigurationError):
                submit_transaction(w3, Mock())

    def test_mismatched_expected_signer_address_is_rejected(self):
        wallet = Mock()
        wallet.address = "0x123"
        with patch.dict(os.environ, {
            "SEPOLIA_TX_PRIVATE_KEY": "placeholder",
            "SEPOLIA_TX_ADDRESS": "0x456",
        }, clear=True):
            with patch("chain_tx.Account.from_key", return_value=wallet):
                with self.assertRaises(TransactionConfigurationError):
                    get_server_address()

    def test_mismatched_signer_does_not_broadcast(self):
        w3 = Mock()
        w3.eth.chain_id = SEPOLIA_CHAIN_ID
        wallet = Mock()
        wallet.address = "0x123"
        with patch.dict(os.environ, {
            "SEPOLIA_TX_PRIVATE_KEY": "placeholder",
            "SEPOLIA_TX_ADDRESS": "0x456",
        }, clear=True):
            with patch("chain_tx.Account.from_key", return_value=wallet):
                with self.assertRaises(TransactionConfigurationError):
                    submit_transaction(w3, Mock())
        w3.eth.send_raw_transaction.assert_not_called()

    def test_sepolia_server_wallet_cannot_submit_review_or_close(self):
        w3 = Mock()
        w3.eth.chain_id = SEPOLIA_CHAIN_ID
        for role in ("admin", "review", "close"):
            with self.subTest(role=role):
                with self.assertRaises(TransactionConfigurationError):
                    submit_transaction(w3, Mock(), role=role)

    def test_admin_endpoints_have_sepolia_guard(self):
        # Static regression check: never silently remove the admin-only guard
        # without also adding a real wallet-signed Ethereum transaction flow.
        import ast
        from pathlib import Path
        source = Path(__file__).with_name("main.py").read_text(encoding="utf-8")
        module = ast.parse(source)
        funcs = {n.name: n for n in module.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
        for name in ("close_case_endpoint", "create_v11_review"):
            with self.subTest(endpoint=name):
                calls = [
                    node.func.id
                    for node in ast.walk(funcs[name])
                    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                ]
                self.assertIn("require_admin_transaction_wallet", calls)

    def test_admin_role_cannot_use_generic_server_wallet(self):
        w3 = Mock()
        w3.eth.chain_id = SEPOLIA_CHAIN_ID
        with self.assertRaises(TransactionConfigurationError):
            submit_transaction(w3, Mock(), role="admin")


if __name__ == "__main__":
    unittest.main()
