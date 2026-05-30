from pydantic import BaseModel, conint
from datetime import datetime
from uuid import UUID
from typing import Optional

class EquipmentBase(BaseModel):
    name: str
    category: str # INDOOR, OUTDOOR, ACCESSORY
    total_quantity: int
    condition: str = "GOOD" # EXCELLENT, GOOD, WEAK, DAMAGED

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    total_quantity: Optional[int] = None
    condition: Optional[str] = None

class EquipmentResponse(EquipmentBase):
    id: UUID
    available_quantity: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
