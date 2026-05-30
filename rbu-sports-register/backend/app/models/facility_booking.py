import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from sqlalchemy.orm import relationship

class FacilityBooking(Base):
    __tablename__ = "facility_bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    facility_name = Column(String(100), nullable=False) # e.g., Tennis Court, Cricket Nets, Football Ground
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="BOOKED") # BOOKED, COMPLETED, CANCELLED
    booked_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    student = relationship("Student", back_populates="bookings")
    approved_by_user = relationship("User", back_populates="bookings")
