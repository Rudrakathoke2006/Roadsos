from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional
from app.schemas.student import StudentResponse
from app.schemas.equipment import EquipmentResponse

class IssuanceCreate(BaseModel):
    student_id: UUID
    equipment_id: UUID
    quantity: int = 1
    return_due_at: datetime

class IssuanceResponse(BaseModel):
    id: UUID
    student_id: UUID
    equipment_id: UUID
    quantity: int
    issued_by_user_id: UUID
    issued_at: datetime
    return_due_at: datetime
    returned_at: Optional[datetime] = None
    status: str
    qr_token: Optional[str] = None
    student: Optional[StudentResponse] = None
    equipment: Optional[EquipmentResponse] = None

    class Config:
        from_attributes = True
