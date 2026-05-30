import uuid
from sqlalchemy import Column, String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from sqlalchemy.orm import relationship

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False) # INDOOR, OUTDOOR, ACCESSORY
    total_quantity = Column(Integer, nullable=False, default=0)
    available_quantity = Column(Integer, nullable=False, default=0)
    condition = Column(String(50), default="GOOD") # EXCELLENT, GOOD, WEAK, DAMAGED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    issuances = relationship("Issuance", back_populates="equipment")
