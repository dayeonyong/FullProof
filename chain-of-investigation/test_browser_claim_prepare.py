import ast
import unittest
from pathlib import Path


class BrowserClaimPreparationTests(unittest.TestCase):
    def test_claim_preparation_endpoint_checks_case_and_versions(self):
        source = Path(__file__).with_name("main.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        methods = {node.name: ast.unparse(node) for node in tree.body if isinstance(node, ast.FunctionDef)}
        self.assertIn("prepare_browser_claim", methods)
        body = methods["prepare_browser_claim"]
        self.assertIn("prepare_claim", body)
        self.assertIn("claim_version", body)
        self.assertIn("step_id", body)
        self.assertNotIn("send_raw_transaction", body)


if __name__ == "__main__":
    unittest.main()
