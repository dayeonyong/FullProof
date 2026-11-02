"""Fail-closed public Sepolia write guard.

A browser role toggle is not authentication. Until a proper authenticated
authorization layer exists, server-funded Sepolia writes are disabled on
public deployments. Local Hardhat continues to operate normally.
"""
from fastapi import HTTPException


def require_public_write_authorization(chain_id: int, environ: dict) -> None:
    if chain_id != 11155111:
        return
    raise HTTPException(
        status_code=503,
        detail="Public Sepolia server-funded transactions are disabled until authenticated authorization is deployed",
    )
