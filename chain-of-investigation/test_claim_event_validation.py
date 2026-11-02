import ast
import unittest
from pathlib import Path


class ClaimEventValidationTests(unittest.TestCase):
    def test_claim_event_checks_identity_and_origin(self):
        tree = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
        methods = {n.name: ast.unparse(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        body = methods["confirm_browser_claim"]
        for field in ("claimIdHash", "claimVersion", "claimHash", "authorIdHash", "inputAt", "recorder"):
            self.assertIn(field, body)
        self.assertIn("save_case(record)", body)


if __name__ == "__main__":
    unittest.main()
