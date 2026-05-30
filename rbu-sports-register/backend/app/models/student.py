import uuid
from sqlalchemy import Column, String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from sqlalchemy.orm import relationship

class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    roll_number = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False)
    phone = Column(String(15), nullable=False)
    branch = Column(String(100))
    year_of_study = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    issuances = relationship("Issuance", back_populates="student", cascade="all, delete-orphan")
    bookings = relationship("FacilityBooking", back_populates="student", cascade="all, delete-orphan")
