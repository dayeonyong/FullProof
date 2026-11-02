import ast
import unittest
from pathlib import Path


class VerificationCalldataTests(unittest.TestCase):
    def test_onchain_submission_uses_one_canonical_builder(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        functions = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        self.assertIn("build_verification_anchor_function", functions)
        self.assertIn("build_verification_anchor_function(result, verification_hash)", functions["anchor_v11_verification"])
        builder = functions["build_verification_anchor_function"]
        for field in ("claim_ref", "proof_refs_hash", "policy_hash", "verification_id", "anchorVerification"):
            self.assertIn(field, builder)


if __name__ == "__main__":
    unittest.main()
