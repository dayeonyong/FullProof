import ast
import unittest
from pathlib import Path


class BrowserVerificationRoutesTests(unittest.TestCase):
    def test_only_one_handler_per_verification_route(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        functions = [n for n in tree.body if isinstance(n, ast.FunctionDef)]
        for name in ("prepare_browser_verification", "confirm_browser_verification"):
            self.assertEqual(sum(n.name == name for n in functions), 1, name)
        routes = []
        for node in functions:
            if node.name in ("prepare_browser_verification", "confirm_browser_verification"):
                routes.extend(ast.unparse(d) for d in node.decorator_list)
        self.assertEqual(sum("/prepare" in route for route in routes), 1)
        self.assertEqual(sum("/confirm" in route for route in routes), 1)

    def test_preparation_and_confirmation_use_staged_verdict(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        functions = {node.name: ast.unparse(node) for node in tree.body if isinstance(node, ast.FunctionDef)}
        staged = functions["staged_browser_verification"]
        prepare = functions["prepare_browser_verification"]
        confirm = functions["confirm_browser_verification"]
        for marker in ("row_by_id", "validate_v11_verification_hashes", "verification_hash"):
            self.assertIn(marker, staged)
        for marker in ("staged_browser_verification", "isVerificationRecorder", "prepare_contract_transaction"):
            self.assertIn(marker, prepare)
        for marker in ("staged_browser_verification", "get_transaction_receipt", "VerificationAnchored", "verification_tx_hash", "persist_result"):
            self.assertIn(marker, confirm)
        self.assertNotIn("submit_contract_transaction", prepare)
        self.assertNotIn("submit_contract_transaction", confirm)


if __name__ == "__main__":
    unittest.main()
