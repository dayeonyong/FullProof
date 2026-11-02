import unittest
from fastapi import HTTPException
from public_write_guard import require_public_write_authorization


class PublicWriteGuardTests(unittest.TestCase):
    def test_sepolia_fails_closed(self):
        with self.assertRaises(HTTPException) as raised:
            require_public_write_authorization(11155111, {})
        self.assertEqual(raised.exception.status_code, 503)

    def test_local_hardhat_is_not_blocked(self):
        require_public_write_authorization(31337, {})


if __name__ == "__main__":
    unittest.main()
