from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models.facility_booking import FacilityBooking
from app.models.student import Student
from app.schemas.facility_booking import FacilityBookingCreate, FacilityBookingResponse
from app.routers.auth import get_current_user, get_admin_user
from typing import List
from uuid import UUID

router = APIRouter(prefix="/bookings", tags=["Facility Bookings Register"])

@router.get("/", response_model=List[FacilityBookingResponse])
async def list_bookings(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(
        select(FacilityBooking)
        .options(
            joinedload(FacilityBooking.student),
            joinedload(FacilityBooking.approved_by_user)
        )
        .order_by(FacilityBooking.start_time.desc())
    )
    return result.scalars().all()

@router.post("/", response_model=FacilityBookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    book_in: FacilityBookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify student exists
    stud_res = await db.execute(select(Student).where(Student.id == book_in.student_id))
    student = stud_res.scalars().first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student borrower profile not found"
        )

    # Simple time validation
    if book_in.start_time >= book_in.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking start time cannot be greater than or equal to end time."
        )

    db_item = FacilityBooking(
        student_id=book_in.student_id,
        facility_name=book_in.facility_name,
        start_time=book_in.start_time,
        end_time=book_in.end_time,
        status="BOOKED"
    )
    db.add(db_item)
    await db.commit()

    # Eager reload for presentation mapping
    final_res = await db.execute(
        select(FacilityBooking)
        .where(FacilityBooking.id == db_item.id)
        .options(
            joinedload(FacilityBooking.student),
            joinedload(FacilityBooking.approved_by_user)
        )
    )
    return final_res.scalars().first()

@router.post("/approve/{booking_id}", response_model=FacilityBookingResponse)
async def approve_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(get_current_user) # Any staff member can signoff approvals
):
    result = await db.execute(
        select(FacilityBooking)
        .where(FacilityBooking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Facility reservation booking records not found"
        )

    booking.status = "APPROVED"
    booking.approved_by_user_id = admin_user.id
    await db.commit()

    # Reload representation
    final_res = await db.execute(
        select(FacilityBooking)
        .where(FacilityBooking.id == booking_id)
        .options(
            joinedload(FacilityBooking.student),
            joinedload(FacilityBooking.approved_by_user)
        )
    )
    return final_res.scalars().first()

@router.post("/cancel/{booking_id}", response_model=FacilityBookingResponse)
async def cancel_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(FacilityBooking)
        .where(FacilityBooking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation booking record not found."
        )

    booking.status = "CANCELLED"
    await db.commit()

    # Reload representation
    final_res = await db.execute(
        select(FacilityBooking)
        .where(FacilityBooking.id == booking_id)
        .options(
            joinedload(FacilityBooking.student),
            joinedload(FacilityBooking.approved_by_user)
        )
    )
    return final_res.scalars().first()
