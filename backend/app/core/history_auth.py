import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.config import settings


def _invalid_history_credentials() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid history credentials",
    )


class _GenericHTTPBasic(HTTPBasic):
    async def __call__(self, request: Request) -> HTTPBasicCredentials | None:
        try:
            return await super().__call__(request)
        except HTTPException:
            raise _invalid_history_credentials() from None


_security = _GenericHTTPBasic(auto_error=False)


def require_history_access(
    credentials: Annotated[HTTPBasicCredentials | None, Depends(_security)],
) -> None:
    configured = bool(settings.history_username and settings.history_password)
    username_matches = configured and credentials is not None and secrets.compare_digest(
        credentials.username.encode(), settings.history_username.encode()
    )
    password_matches = configured and credentials is not None and secrets.compare_digest(
        credentials.password.encode(), settings.history_password.encode()
    )
    if not (username_matches and password_matches):
        raise _invalid_history_credentials()
