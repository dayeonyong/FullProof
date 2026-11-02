import ast
import unittest
from pathlib import Path

class BrowserStepRouteTests(unittest.TestCase):
    def test_step_prepare_and_confirm_routes(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        methods = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        self.assertIn("prepare_browser_step", methods)
        self.assertIn("confirm_browser_step", methods)
        self.assertIn("StepAdded", methods["confirm_browser_step"])
        self.assertIn("get_transaction_receipt", methods["confirm_browser_step"])

if __name__ == "__main__":
    unittest.main()
