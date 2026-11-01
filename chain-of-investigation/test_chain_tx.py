"""Offline tests: no real blockchain calls, no keys, no gas spent."""
import os
import unittest
from unittest.mock import Mock, patch

from chain_tx import (
    HARDHAT_CHAIN_ID, SEPOLIA_CHAIN_ID,
    TransactionConfigurationError, submit_transaction,
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

    def test_admin_role_cannot_use_generic_server_wallet(self):
        w3 = Mock()
        w3.eth.chain_id = SEPOLIA_CHAIN_ID
        with self.assertRaises(TransactionConfigurationError):
            submit_transaction(w3, Mock(), role="admin")


if __name__ == "__main__":
    unittest.main()
