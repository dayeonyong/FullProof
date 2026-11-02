import unittest
from unittest.mock import Mock, patch
from browser_tx import BrowserTransactionError, prepare_contract_transaction


class BrowserTxTests(unittest.TestCase):
    def test_requires_sepolia(self):
        w3 = Mock()
        w3.eth.chain_id = 1
        with self.assertRaises(BrowserTransactionError):
            prepare_contract_transaction(w3, Mock(), "0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494")

    def test_rejects_invalid_address(self):
        w3 = Mock()
        w3.eth.chain_id = 11155111
        with self.assertRaises(BrowserTransactionError):
            prepare_contract_transaction(w3, Mock(), "not-an-address")

    def test_builds_unsigned_transaction_without_broadcast(self):
        w3 = Mock()
        w3.eth.chain_id = 11155111
        w3.eth.get_transaction_count.return_value = 4
        fn = Mock()
        fn.estimate_gas.return_value = 50000
        tx = {"to": "0x2f68D6252ABb893f07DbFcEe9e2d924786558669"}
        fn.build_transaction.return_value = tx
        result = prepare_contract_transaction(w3, fn, "0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494")
        self.assertEqual(result, tx)
        fn.build_transaction.assert_called_once()
        params = fn.build_transaction.call_args.args[0]
        self.assertEqual(params["chainId"], 11155111)
        self.assertEqual(params["nonce"], 4)
        self.assertEqual(params["gas"], 60000)
        w3.eth.send_raw_transaction.assert_not_called()


if __name__ == "__main__":
    unittest.main()
