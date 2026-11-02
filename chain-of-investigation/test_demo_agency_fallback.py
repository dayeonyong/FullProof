import ast
import unittest
from pathlib import Path


class DemoAgencyFallbackTests(unittest.TestCase):
    def test_registered_agency_fallback_is_sepolia_only(self):
        source = Path(__file__).with_name("frontend_server.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        methods = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        body = methods["public_config"]
        self.assertIn("core.w3.eth.chain_id == 11155111", body)
        self.assertIn("0x4A8641Dc48C3fFE74fc02034e80910402833f9B1", body)
        self.assertIn("bool(info[1])", body)
        self.assertIn("int(info[0]) in (2, 3)", body)


if __name__ == "__main__":
    unittest.main()
