import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from sqlalchemy.orm import relationship

class Issuance(Base):
    __tablename__ = "issuances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipment.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    issued_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    return_due_at = Column(DateTime(timezone=True), nullable=False)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="ISSUED") # ISSUED, RETURNED, OVERDUE
    qr_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("Student", back_populates="issuances")
    equipment = relationship("Equipment", back_populates="issuances")
    issued_by_user = relationship("User", back_populates="issuances")
