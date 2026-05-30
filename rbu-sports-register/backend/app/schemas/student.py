from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
from typing import Optional

class StudentBase(BaseModel):
    name: str
    roll_number: str
    email: EmailStr
    phone: str
    branch: Optional[str] = None
    year_of_study: int = 1

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
