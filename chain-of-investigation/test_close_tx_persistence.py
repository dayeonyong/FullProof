import ast
import unittest
from pathlib import Path


class CloseTransactionPersistenceTests(unittest.TestCase):
    def test_close_confirmation_persists_chain_transaction_reference(self):
        source = Path(__file__).with_name("main.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        methods = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        body = methods["confirm_browser_case_close"]
        self.assertIn('record[\'close_tx_hash\']', body)
        self.assertIn("save_case(record)", body)

    def test_frontend_uses_persisted_close_hash(self):
        source = Path(__file__).with_name("frontend_server.py").read_text(encoding="utf-8")
        self.assertIn("c.get('close_tx_hash')", source)


if __name__ == "__main__":
    unittest.main()
