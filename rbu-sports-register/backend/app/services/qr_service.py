from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.core.config import settings

ALGORITHM = "HS256"

def generate_qr_token(issuance_id: str) -> dict:
    expires_delta = timedelta(minutes=settings.QR_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(issuance_id),
        "type": "qr_token",
        "exp": expire
    }
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return {
        "token": token,
        "expires_at": expire
    }

def verify_qr_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "qr_token":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid QR token type"
            )
        issuance_id = payload.get("sub")
        if not issuance_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR token is missing core claims"
            )
        return issuance_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR token has expired. Scanner rejected."
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted QR token."
        )
