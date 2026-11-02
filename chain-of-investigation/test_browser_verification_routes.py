import ast
import unittest
from pathlib import Path


class BrowserVerificationRoutesTests(unittest.TestCase):
    def test_verification_routes_are_wallet_only(self):
        tree=ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        funcs={n.name:ast.unparse(n) for n in tree.body if isinstance(n,ast.FunctionDef)}
        prepare=funcs["prepare_browser_verification"]
        confirm=funcs["confirm_browser_verification"]
        for marker in ("row_by_id","validate_v11_verification_hashes","isVerificationRecorder","prepare_contract_transaction","getLatestClaim"):
            self.assertIn(marker,prepare)
        for marker in ("get_transaction_receipt","VerificationAnchored","verification_tx_hash","update(verification_id"):
            self.assertIn(marker,confirm)
        self.assertNotIn("submit_contract_transaction",prepare)
        self.assertNotIn("submit_contract_transaction",confirm)


if __name__=="__main__":
    unittest.main()
