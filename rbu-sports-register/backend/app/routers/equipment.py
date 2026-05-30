from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.equipment import Equipment
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from app.routers.auth import get_current_user, get_admin_user
from typing import List
from uuid import UUID

router = APIRouter(prefix="/equipment", tags=["Sports Equipment"])

@router.get("/", response_model=List[EquipmentResponse])
async def list_equipment(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Equipment).order_by(Equipment.name))
    return result.scalars().all()

@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    eq_in: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    # Check if exists by name
    result = await db.execute(select(Equipment).where(Equipment.name == eq_in.name))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sports equipment item already exists by that name."
        )

    db_item = Equipment(
        name=eq_in.name,
        category=eq_in.category,
        total_quantity=eq_in.total_quantity,
        available_quantity=eq_in.total_quantity, # Init available as total
        condition=eq_in.condition
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: UUID,
    eq_in: EquipmentUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment inventory record not found."
        )

    # If updating quantity, align available quantity
    if eq_in.total_quantity is not None:
        diff = eq_in.total_quantity - db_item.total_quantity
        new_avail = db_item.available_quantity + diff
        if new_avail < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New total quantity is too small given currently active loans."
            )
        db_item.total_quantity = eq_in.total_quantity
        db_item.available_quantity = new_avail

    if eq_in.name is not None:
        db_item.name = eq_in.name
    if eq_in.category is not None:
        db_item.category = eq_in.category
    if eq_in.condition is not None:
        db_item.condition = eq_in.condition

    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    equipment_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    result = await db.execute(select(Equipment).where(Equipment.id == equipment_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment record not found."
        )
    
    if db_item.available_quantity != db_item.total_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete equipment item that is currently issued/loaned out."
        )

    await db.delete(db_item)
    await db.commit()
    return None
