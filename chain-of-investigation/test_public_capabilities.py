import ast
import unittest
from pathlib import Path


class PublicCapabilitiesTests(unittest.TestCase):
    def test_sepolia_write_capabilities_require_server_signer(self):
        tree = ast.parse(Path(__file__).with_name("frontend_server.py").read_text(encoding="utf-8"))
        functions = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        status = functions["public_config"]
        self.assertIn("core.w3.eth.chain_id == 11155111", status)
        self.assertIn("server_transactions_ready = False", status)
        self.assertIn("claim_anchor=server_transactions_ready", status)
        self.assertIn("verification_anchor=server_transactions_ready", status)


if __name__ == "__main__":
    unittest.main()
