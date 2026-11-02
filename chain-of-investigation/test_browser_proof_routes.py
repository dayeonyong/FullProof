import ast
import unittest
from pathlib import Path


class BrowserProofRoutesTests(unittest.TestCase):
    def test_proof_paths_verify_draft_and_receipt(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        methods = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        prepare = methods["prepare_browser_proof"]
        confirm = methods["confirm_browser_proof"]
        for expected in ("v11_proof_hash", "signed", "source_bytes", "prepare_contract_transaction"):
            self.assertIn(expected, prepare)
        for expected in ("get_transaction_receipt", "AgencyProofAnchored", "expected_input", "save_v11_store"):
            self.assertIn(expected, confirm)
        self.assertNotIn("submit_contract_transaction", prepare)
        self.assertNotIn("submit_contract_transaction", confirm)


if __name__ == "__main__":
    unittest.main()
