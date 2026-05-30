from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional
from app.schemas.student import StudentResponse

class FacilityBookingCreate(BaseModel):
    student_id: UUID
    facility_name: str
    start_time: datetime
    end_time: datetime

class FacilityBookingResponse(BaseModel):
    id: UUID
    student_id: UUID
    facility_name: str
    start_time: datetime
    end_time: datetime
    status: str
    booked_at: datetime
    approved_by_user_id: Optional[UUID] = None
    student: Optional[StudentResponse] = None

    class Config:
        from_attributes = True
