import ast
import unittest
from pathlib import Path


class BrowserAdminRouteTests(unittest.TestCase):
    def test_prepare_route_is_defined(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        names = {node.name for node in tree.body if isinstance(node, ast.FunctionDef)}
        self.assertIn("prepare_browser_case_close", names)


if __name__ == "__main__":
    unittest.main()
