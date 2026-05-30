from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentResponse
from app.routers.auth import get_current_user, get_admin_user
from typing import List
from uuid import UUID

router = APIRouter(prefix="/students", tags=["Students Registration"])

@router.get("/", response_model=List[StudentResponse])
async def list_students(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Student).order_by(Student.name))
    return result.scalars().all()

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    stud_in: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify unique roll number
    result = await db.execute(select(Student).where(Student.roll_number == stud_in.roll_number))
    existing_roll = result.scalars().first()
    if existing_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student already registered with this roll number."
        )

    # Verify unique email
    result = await db.execute(select(Student).where(Student.email == stud_in.email))
    existing_email = result.scalars().first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student already registered with this email address."
        )

    db_item = Student(
        name=stud_in.name,
        roll_number=stud_in.roll_number,
        email=stud_in.email,
        phone=stud_in.phone,
        branch=stud_in.branch,
        year_of_study=stud_in.year_of_study
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(get_admin_user)
):
    result = await db.execute(select(Student).where(Student.id == student_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found."
        )

    await db.delete(db_item)
    await db.commit()
    return None
