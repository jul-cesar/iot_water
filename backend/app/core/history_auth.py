import hashlib
import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.config import settings

_SALT_BYTES = 16
_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_DKLEN = 32


def _invalid_history_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid history credentials",
        headers={"WWW-Authenticate": "Basic"},
    )


class _GenericHTTPBasic(HTTPBasic):
    async def __call__(self, request: Request) -> HTTPBasicCredentials | None:
        try:
            return await super().__call__(request)
        except HTTPException:
            raise _invalid_history_credentials() from None


_security = _GenericHTTPBasic(auto_error=False)


def hash_history_password(password: str, *, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(_SALT_BYTES)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=_DKLEN
    )
    return f"scrypt${salt.hex()}${digest.hex()}"


def _password_matches(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = encoded_hash.split("$", 2)
        if algorithm != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        actual = hashlib.scrypt(
            password.encode(),
            salt=salt,
            n=_SCRYPT_N,
            r=_SCRYPT_R,
            p=_SCRYPT_P,
            dklen=len(expected),
        )
    except (TypeError, ValueError):
        return False
    return secrets.compare_digest(actual, expected)


def require_history_access(
    credentials: Annotated[HTTPBasicCredentials | None, Depends(_security)],
) -> None:
    username_matches = credentials is not None and secrets.compare_digest(
        credentials.username.encode(), settings.history_username.encode()
    )
    password_matches = credentials is not None and _password_matches(
        credentials.password, settings.history_password_hash
    )
    if not (username_matches and password_matches):
        raise _invalid_history_credentials()
