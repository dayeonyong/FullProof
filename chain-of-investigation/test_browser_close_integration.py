"""Structural checks for browser-approved Sepolia case closure."""
import ast
import unittest
from pathlib import Path


class BrowserCloseIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        cls.functions = {
            n.name: ast.unparse(n) for n in tree.body
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

    def test_prepare_and_confirm_routes_exist(self):
        self.assertIn("prepare_browser_case_close", self.functions)
        self.assertIn("confirm_browser_case_close", self.functions)

    def test_confirmation_reads_real_receipt_and_event(self):
        body = self.functions["confirm_browser_case_close"]
        self.assertIn("get_transaction_receipt", body)
        self.assertIn("get_transaction(", body)
        self.assertIn("CaseClosed", body)
        self.assertIn("save_case(record)", body)

    def test_prepare_cannot_mark_case_closed(self):
        body = self.functions["prepare_browser_case_close"]
        self.assertNotIn("save_case(", body)
        self.assertIn("prepare_contract_transaction", body)


if __name__ == "__main__":
    unittest.main()
