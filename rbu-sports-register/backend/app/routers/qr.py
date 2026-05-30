from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.issuance import Issuance
from app.models.equipment import Equipment
from app.schemas.issuance import IssuanceResponse
from app.routers.auth import get_current_user
from app.services.qr_service import verify_qr_token
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter(prefix="/qr", tags=["QR Code Verification"])

class QRScanRequest(BaseModel):
    token: str
    auto_return: bool = False

class QRVerificationResponse(BaseModel):
    success: bool
    message: str
    issuance: Optional[IssuanceResponse] = None

from typing import Optional

@router.post("/verify-scan", response_model=QRVerificationResponse)
async def verify_scanner_qr(
    req: QRScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify secure signed token structure
    issuance_id_str = verify_qr_token(req.token)
    try:
        issuance_id = UUID(issuance_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decoded token identifier contains an invalid UUID structure"
        )

    # Fetch corresponding Issuance
    result = await db.execute(
        select(Issuance)
        .where(Issuance.id == issuance_id)
        .options(
            joinedload(Issuance.student),
            joinedload(Issuance.equipment),
            joinedload(Issuance.issued_by_user)
        )
    )
    issuance = result.scalars().first()
    if not issuance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction loan session records do not match this token"
        )

    # If already returned and no auto-return is requested
    if issuance.status == "RETURNED":
        return {
            "success": True,
            "message": "Approved! However, this transaction was already checked-in and returned previously.",
            "issuance": issuance
        }

    # Perform immediate return execution if requested
    if req.auto_return:
        equipment = issuance.equipment
        equipment.available_quantity += issuance.quantity
        
        issuance.returned_at = datetime.now(timezone.utc)
        issuance.status = "RETURNED"
        issuance.qr_token = None
        
        await db.commit()
        await db.refresh(issuance)

        return {
            "success": True,
            "message": f"Success! Verification passed and equipment '{equipment.name}' checked in.",
            "issuance": issuance
        }

    return {
        "success": True,
        "message": f"Token Verified! Session holds active equipment loan for '{issuance.equipment.name}'.",
        "issuance": issuance
    }
