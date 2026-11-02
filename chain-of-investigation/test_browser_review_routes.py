import ast
import unittest
from pathlib import Path

class ReviewRouteTests(unittest.TestCase):
    def test_review_transaction_routes(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        methods = {node.name: ast.unparse(node) for node in tree.body if isinstance(node, ast.FunctionDef)}
        self.assertIn("prepare_browser_review", methods)
        self.assertIn("confirm_browser_review", methods)
        body = methods["confirm_browser_review"]
        self.assertIn("get_transaction_receipt", body)
        self.assertIn("VerificationReviewAnchored", body)
        self.assertIn("save_v11_store", body)

if __name__ == "__main__":
    unittest.main()
