from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.issuance import Issuance
from app.models.equipment import Equipment
from app.models.student import Student
from app.schemas.issuance import IssuanceCreate, IssuanceResponse
from app.routers.auth import get_current_user, get_admin_user
from app.services.qr_service import generate_qr_token
from app.services.excel_export import export_issuances_to_excel
from typing import List
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter(prefix="/issuances", tags=["Equipment Issuances Register"])

@router.get("/", response_model=List[IssuanceResponse])
async def list_all_issuances(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(
        select(Issuance)
        .options(
            joinedload(Issuance.student),
            joinedload(Issuance.equipment),
            joinedload(Issuance.issued_by_user)
        )
        .order_by(Issuance.issued_at.desc())
    )
    return result.scalars().all()

@router.get("/active", response_model=List[IssuanceResponse])
async def list_active_issuances(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(
        select(Issuance)
        .where(Issuance.status == "ISSUED")
        .options(
            joinedload(Issuance.student),
            joinedload(Issuance.equipment),
            joinedload(Issuance.issued_by_user)
        )
        .order_by(Issuance.issued_at.desc())
    )
    return result.scalars().all()

@router.post("/issue", response_model=IssuanceResponse, status_code=status.HTTP_201_CREATED)
async def issue_equipment(
    iss_in: IssuanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Fetch Student
    student_res = await db.execute(select(Student).where(Student.id == iss_in.student_id))
    student = student_res.scalars().first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student registration profile not found."
        )

    # Fetch Equipment
    eq_res = await db.execute(select(Equipment).where(Equipment.id == iss_in.equipment_id))
    equipment = eq_res.scalars().first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment inventory record not found."
        )

    # Check Stock Availability
    if equipment.available_quantity < iss_in.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inadequate inventory. Requested {iss_in.quantity}, only {equipment.available_quantity} items in stock."
        )

    # Reduce inventory availability
    equipment.available_quantity -= iss_in.quantity

    # Create Issuance record
    new_issuance = Issuance(
        student_id=iss_in.student_id,
        equipment_id=iss_in.equipment_id,
        quantity=iss_in.quantity,
        issued_by_user_id=current_user.id,
        return_due_at=iss_in.return_due_at,
        status="ISSUED"
    )
    db.add(new_issuance)
    await db.flush() # Flushes to database to populate ID field for the QR generator

    # Generate QR secure token
    qr_res = generate_qr_token(str(new_issuance.id))
    new_issuance.qr_token = qr_res["token"]

    await db.commit()

    # Dynamic reload with joined attributes for response serializing
    final_res = await db.execute(
        select(Issuance)
        .where(Issuance.id == new_issuance.id)
        .options(
            joinedload(Issuance.student),
            joinedload(Issuance.equipment),
            joinedload(Issuance.issued_by_user)
        )
    )
    return final_res.scalars().first()

@router.post("/return/{issuance_id}", response_model=IssuanceResponse)
async def return_equipment(
    issuance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Fetch Issuance
    result = await db.execute(
        select(Issuance)
        .where(Issuance.id == issuance_id)
        .options(joinedload(Issuance.equipment))
    )
    issuance = result.scalars().first()
    if not issuance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan issuance record register not found."
        )

    if issuance.status == "RETURNED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Equipment has already been returned and checked."
        )

    # Return items to stock pool
    equipment = issuance.equipment
    equipment.available_quantity += issuance.quantity

    # Close the status
    issuance.returned_at = datetime.now(timezone.utc)
    issuance.status = "RETURNED"
    issuance.qr_token = None

    await db.commit()

    # Reload and return
    final_res = await db.execute(
        select(Issuance)
        .where(Issuance.id == issuance_id)
        .options(
            joinedload(Issuance.student),
            joinedload(Issuance.equipment),
            joinedload(Issuance.issued_by_user)
        )
    )
    return final_res.scalars().first()

@router.get("/export")
async def export_excel(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(
        select(Issuance)
        .options(
            joinedload(Issuance.student),
            joinedload(Issuance.equipment),
            joinedload(Issuance.issued_by_user)
        )
        .order_by(Issuance.issued_at.desc())
    )
    issuances = result.scalars().all()
    
    file_stream = export_issuances_to_excel(issuances)
    headers = {
        "Content-Disposition": "attachment; filename=rbu_sports_register_report.xlsx",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    return StreamingResponse(file_stream, headers=headers)
