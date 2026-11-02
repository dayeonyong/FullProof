import ast
import unittest
from pathlib import Path


class BrowserPoliceCaseTests(unittest.TestCase):
    def test_prepare_and_confirm_routes_present(self):
        source = Path(__file__).with_name("main.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        functions = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        self.assertIn("prepare_browser_case_creation", functions)
        self.assertIn("confirm_browser_case_creation", functions)
        confirm = functions["confirm_browser_case_creation"]
        self.assertIn("get_transaction_receipt", confirm)
        self.assertIn("CaseCreated", confirm)
        self.assertIn("save_case(record)", confirm)


if __name__ == "__main__":
    unittest.main()
