from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import numpy as np
import json
import models
from database import engine, get_db, SessionLocal
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_admin, require_student
)
import face_utils
import os
import os
import uuid

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="TechPhantom NavTac API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# AUTO-CREATE DEFAULT ADMIN ON STARTUP
# ==========================================
@app.on_event("startup")
def create_default_admin():
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == "admin@techphantom.com").first()
        if not existing:
            admin = models.User(
                email="admin@techphantom.com",
                password_hash=hash_password("admin123"),
                full_name="System Administrator",
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("[OK] Default admin created: admin@techphantom.com / admin123")
    finally:
        db.close()


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "student"
    roll_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class CourseCreate(BaseModel):
    course_code: str
    course_name: str
    description: str = ""

class CourseUpdate(BaseModel):
    course_name: Optional[str] = None
    description: Optional[str] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    roll_number: Optional[str] = None

class SessionCreate(BaseModel):
    course_id: int

class AdminStudentCreate(BaseModel):
    full_name: str
    email: str
    password: str
    roll_number: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    course_ids: Optional[List[int]] = None

class AdminStudentUpdate(BaseModel):
    full_name: Optional[str] = None
    course_ids: Optional[List[int]] = None

# Setup upload directories
UPLOAD_DIR = "uploads/profiles"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


class ProfileUpdateDetailed(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


# ==========================================
# AUTH ROUTES
# ==========================================
@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user (student or admin)."""
    if not req.email or not req.password or not req.full_name:
        raise HTTPException(status_code=400, detail="Email, password, and full name are required")
    
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if req.role not in ("student", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'student' or 'admin'")

    user = models.User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role
    )
    db.add(user)
    db.flush()

    # Auto-create student profile if role is student
    if req.role == "student":
        roll = req.roll_number or f"STU-{user.id:04d}"
        if db.query(models.Student).filter(models.Student.roll_number == roll).first():
            raise HTTPException(status_code=400, detail="Roll number already taken")
        student = models.Student(user_id=user.id, roll_number=roll)
        db.add(student)

    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT."""
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current authenticated user info."""
    result = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "profile_picture": current_user.profile_picture
    }
    if current_user.role == "student" and current_user.student_profile:
        sp = current_user.student_profile
        result["student"] = {
            "id": sp.id,
            "roll_number": sp.roll_number,
            "department": sp.department or "",
            "phone": sp.phone or "",
            "has_face": sp.face_encoding is not None
        }
    return result


@app.put("/api/auth/profile")
def update_profile(req: ProfileUpdateDetailed, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update current user's profile info (name, email, password)."""
    if req.full_name:
        current_user.full_name = req.full_name
    
    if req.email:
        # Check uniqueness
        existing = db.query(models.User).filter(models.User.email == req.email, models.User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = req.email
        
    if req.password:
        if len(req.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        current_user.password_hash = hash_password(req.password)
        
    db.commit()
    return {"message": "Profile updated successfully"}


@app.post("/api/auth/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload/Update profile picture."""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save to disk
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
        
    # Update DB (relative path for serving)
    current_user.profile_picture = f"/uploads/profiles/{filename}"
    db.commit()
    
    return {"message": "Profile picture updated", "url": current_user.profile_picture}


@app.delete("/api/auth/profile/picture")
def delete_profile_picture(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete current user's profile picture."""
    if current_user.profile_picture:
        # Construct absolute path to delete file
        # current_user.profile_picture is like "/uploads/profiles/uuid.jpg"
        # We need to strip the leading slash if it exists
        rel_path = current_user.profile_picture.lstrip("/")
        abs_path = os.path.join(os.getcwd(), rel_path)
        
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except Exception as e:
                print(f"Error deleting file: {e}")
                
        current_user.profile_picture = None
        db.commit()
        
    return {"message": "Profile picture deleted"}


# ==========================================
# STUDENT ROUTES
# ==========================================
@app.get("/api/student/profile")
def get_student_profile(current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    total_sessions = 0
    attended_sessions = 0
    course_ids = [c.id for c in sp.courses]
    if course_ids:
        total_sessions = db.query(models.AttendanceSession).filter(
            models.AttendanceSession.course_id.in_(course_ids),
            models.AttendanceSession.status == "completed"
        ).count()
        attended_sessions = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == sp.id
        ).join(models.AttendanceSession).filter(
            models.AttendanceSession.status == "completed"
        ).count()

    return {
        "id": sp.id,
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "roll_number": sp.roll_number,
        "department": sp.department or "",
        "phone": sp.phone or "",
        "has_face": sp.face_encoding is not None,
        "total_courses": len(sp.courses),
        "total_sessions": total_sessions,
        "attended_sessions": attended_sessions,
        "attendance_rate": round((attended_sessions / total_sessions * 100) if total_sessions > 0 else 0, 1)
    }


@app.put("/api/student/profile")
def update_student_profile(updates: ProfileUpdate, current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if updates.full_name:
        current_user.full_name = updates.full_name
    if updates.department is not None:
        sp.department = updates.department
    if updates.phone is not None:
        sp.phone = updates.phone
    if updates.roll_number:
        existing = db.query(models.Student).filter(
            models.Student.roll_number == updates.roll_number,
            models.Student.id != sp.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Roll number already taken")
        sp.roll_number = updates.roll_number

    db.commit()
    return {"message": "Profile updated successfully"}


@app.post("/api/student/face")
async def upload_face(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """Upload face photo for recognition enrollment."""
    sp = current_user.student_profile
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found")

    image_bytes = await file.read()
    try:
        result = face_utils.get_face_encoding(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

    if not result or "encoding" not in result:
        raise HTTPException(status_code=400, detail="No face detected. Please ensure your face is clearly visible.")

    sp.face_encoding = result["encoding"].tobytes()
    db.commit()
    return {"message": "Face registered successfully", "has_face": True}


@app.get("/api/student/courses")
def get_student_courses(current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    if not sp:
        return []

    result = []
    for course in sp.courses:
        total = db.query(models.AttendanceSession).filter(
            models.AttendanceSession.course_id == course.id,
            models.AttendanceSession.status == "completed"
        ).count()
        attended = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == sp.id
        ).join(models.AttendanceSession).filter(
            models.AttendanceSession.course_id == course.id,
            models.AttendanceSession.status == "completed"
        ).count()
        
        result.append({
            "id": course.id,
            "course_code": course.course_code,
            "course_name": course.course_name,
            "description": course.description or "",
            "total_sessions": total,
            "attended": attended,
            "attendance_rate": round((attended / total * 100) if total > 0 else 0, 1)
        })
    return result


@app.get("/api/student/courses/available")
def get_available_courses(current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    enrolled_ids = [c.id for c in sp.courses] if sp else []
    courses = db.query(models.Course).all()
    return [{
        "id": c.id,
        "course_code": c.course_code,
        "course_name": c.course_name,
        "description": c.description or "",
        "enrolled": c.id in enrolled_ids,
        "student_count": len(c.students)
    } for c in courses]


@app.post("/api/student/courses/{course_id}/enroll")
def enroll_in_course(course_id: int, current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found")

    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course in sp.courses:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    sp.courses.append(course)
    db.commit()
    return {"message": f"Enrolled in {course.course_name}"}


@app.delete("/api/student/courses/{course_id}/unenroll")
def unenroll_from_course(course_id: int, current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    if not sp:
        raise HTTPException(status_code=404, detail="Student profile not found")

    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course not in sp.courses:
        raise HTTPException(status_code=400, detail="Not enrolled in this course")

    sp.courses.remove(course)
    db.commit()
    return {"message": f"Unenrolled from {course.course_name}"}


@app.get("/api/student/attendance")
def get_student_attendance(current_user: models.User = Depends(require_student), db: Session = Depends(get_db)):
    sp = current_user.student_profile
    if not sp:
        return []

    records = db.query(models.AttendanceRecord).filter(
        models.AttendanceRecord.student_id == sp.id
    ).order_by(models.AttendanceRecord.timestamp.desc()).limit(200).all()

    return [{
        "id": r.id,
        "course_code": r.session.course.course_code,
        "course_name": r.session.course.course_name,
        "session_id": r.session_id,
        "timestamp": r.timestamp.isoformat(),
        "status": r.status,
        "confidence": r.confidence
    } for r in records]


# ==========================================
# ADMIN ROUTES
# ==========================================
@app.get("/api/admin/stats")
def get_admin_stats(current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    total_students = db.query(models.Student).count()
    total_courses = db.query(models.Course).count()
    total_sessions = db.query(models.AttendanceSession).count()
    active_sessions = db.query(models.AttendanceSession).filter(models.AttendanceSession.status == "active").count()
    total_records = db.query(models.AttendanceRecord).count()
    students_with_face = db.query(models.Student).filter(models.Student.face_encoding.isnot(None)).count()

    return {
        "total_students": total_students,
        "total_courses": total_courses,
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "total_records": total_records,
        "students_with_face": students_with_face
    }


@app.get("/api/admin/students")
def get_admin_students(current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    students = db.query(models.Student).options(joinedload(models.Student.user)).all()
    result = []
    for s in students:
        total = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == s.id).count()
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "roll_number": s.roll_number,
            "full_name": s.user.full_name,
            "email": s.user.email,
            "department": s.department or "",
            "phone": s.phone or "",
            "has_face": s.face_encoding is not None,
            "total_courses": len(s.courses),
            "course_ids": [c.id for c in s.courses],
            "total_attendance": total,
            "enrolled_at": s.enrolled_at.isoformat() if s.enrolled_at else None
        })
    return result


@app.post("/api/admin/students")
def create_student_admin(req: AdminStudentCreate, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin: Create a new student without returning a JWT login token."""
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role="student"
    )
    db.add(user)
    db.flush()

    roll = req.roll_number or f"STU-{user.id:04d}"
    if db.query(models.Student).filter(models.Student.roll_number == roll).first():
        raise HTTPException(status_code=400, detail="Roll number already taken")
        
    student = models.Student(
        user_id=user.id, 
        roll_number=roll,
        department=req.department or "",
        phone=req.phone or ""
    )
    
    if req.course_ids is not None:
        courses = db.query(models.Course).filter(models.Course.id.in_(req.course_ids)).all()
        student.courses = courses
        
    db.add(student)
    db.commit()
    return {"message": "Student created successfully", "id": student.id}


@app.put("/api/admin/students/{student_id}")
def update_student(student_id: int, updates: AdminStudentUpdate, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin: Edit a student's profile details."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user

    if updates.full_name:
        user.full_name = updates.full_name
    if updates.email:
        existing = db.query(models.User).filter(models.User.email == updates.email, models.User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = updates.email
    if updates.roll_number:
        existing = db.query(models.Student).filter(models.Student.roll_number == updates.roll_number, models.Student.id != student.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Roll number already taken")
        student.roll_number = updates.roll_number
    if updates.department is not None:
        student.department = updates.department
    if updates.phone is not None:
        student.phone = updates.phone
    if updates.course_ids is not None:
        courses = db.query(models.Course).filter(models.Course.id.in_(updates.course_ids)).all()
        student.courses = courses

    db.commit()
    return {"message": "Student updated successfully"}


@app.delete("/api/admin/students/{student_id}")
def delete_student(student_id: int, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """Admin: Delete a student and their user account."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user_id = student.user_id

    # 1. Delete attendance records for this student
    db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == student.id).delete()

    # 2. Clear enrollment associations
    db.execute(models.enrollment_table.delete().where(models.enrollment_table.c.student_id == student.id))

    # 3. Delete the student profile
    db.delete(student)

    # 4. Delete the user account
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.delete(user)

    db.commit()
    return {"message": "Student deleted successfully"}


@app.post("/api/admin/students/{student_id}/face")
async def admin_register_face(
    student_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin: Register or update face data for a student."""
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    image_bytes = await file.read()
    try:
        result = face_utils.get_face_encoding(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

    if not result or "encoding" not in result:
        raise HTTPException(status_code=400, detail="No face detected in the image. Please try again with a clear photo.")

    student.face_encoding = result["encoding"].tobytes()
    db.commit()
    return {"message": f"Face registered for {student.user.full_name}", "has_face": True}


@app.get("/api/admin/courses")
def get_admin_courses(current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    courses = db.query(models.Course).all()
    return [{
        "id": c.id,
        "course_code": c.course_code,
        "course_name": c.course_name,
        "description": c.description or "",
        "student_count": len(c.students),
        "session_count": len(c.sessions),
        "created_at": c.created_at.isoformat() if c.created_at else None
    } for c in courses]


@app.post("/api/admin/courses")
def create_course(course: CourseCreate, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    if not course.course_code or not course.course_name:
        raise HTTPException(status_code=400, detail="Course code and name are required")

    if db.query(models.Course).filter(models.Course.course_code == course.course_code).first():
        raise HTTPException(status_code=400, detail="Course code already exists")

    new_course = models.Course(
        course_code=course.course_code.upper(),
        course_name=course.course_name,
        description=course.description,
        created_by=current_user.id
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return {"message": "Course created", "id": new_course.id, "course_code": new_course.course_code}


@app.put("/api/admin/courses/{course_id}")
def update_course(course_id: int, updates: CourseUpdate, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if updates.course_name:
        course.course_name = updates.course_name
    if updates.description is not None:
        course.description = updates.description

    db.commit()
    return {"message": "Course updated"}


@app.delete("/api/admin/courses/{course_id}")
def delete_course(course_id: int, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}


@app.get("/api/admin/sessions")
def get_admin_sessions(current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    sessions = db.query(models.AttendanceSession).options(
        joinedload(models.AttendanceSession.course),
        joinedload(models.AttendanceSession.creator)
    ).order_by(models.AttendanceSession.start_time.desc()).limit(100).all()

    return [{
        "id": s.id,
        "course_id": s.course_id,
        "course_code": s.course.course_code,
        "course_name": s.course.course_name,
        "created_by_name": s.creator.full_name,
        "start_time": s.start_time.isoformat(),
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "status": s.status,
        "record_count": len(s.records)
    } for s in sessions]


@app.post("/api/admin/sessions")
def create_session(req: SessionCreate, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check if there's already an active session for this course
    existing = db.query(models.AttendanceSession).filter(
        models.AttendanceSession.course_id == req.course_id,
        models.AttendanceSession.status == "active"
    ).first()
    if existing:
        return {"message": "Session resumed", "session_id": existing.id, "course_code": course.course_code, "course_name": course.course_name}

    session = models.AttendanceSession(
        course_id=req.course_id,
        created_by=current_user.id
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "message": "Session started",
        "session_id": session.id,
        "course_name": course.course_name
    }


@app.put("/api/admin/sessions/{session_id}")
def update_session(session_id: int, action: str = Query(...), current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    session = db.query(models.AttendanceSession).filter(models.AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if action == "complete":
        session.status = "completed"
        session.end_time = datetime.now(timezone.utc)
    elif action == "cancel":
        session.status = "cancelled"
        session.end_time = datetime.now(timezone.utc)
    else:
        raise HTTPException(status_code=400, detail="Action must be 'complete' or 'cancel'")

    db.commit()
    return {"message": f"Session {action}d"}


@app.get("/api/admin/attendance")
def get_admin_attendance(
    course_id: Optional[int] = None,
    session_id: Optional[int] = None,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.AttendanceRecord).join(models.AttendanceSession)

    if course_id:
        query = query.filter(models.AttendanceSession.course_id == course_id)
    if session_id:
        query = query.filter(models.AttendanceRecord.session_id == session_id)

    records = query.order_by(models.AttendanceRecord.timestamp.desc()).limit(200).all()

    return [{
        "id": r.id,
        "student_name": r.student.user.full_name,
        "roll_number": r.student.roll_number,
        "course_code": r.session.course.course_code,
        "course_name": r.session.course.course_name,
        "session_id": r.session_id,
        "timestamp": r.timestamp.isoformat(),
        "status": r.status,
        "confidence": r.confidence
    } for r in records]


@app.get("/api/admin/reports/course/{course_id}")
def get_course_report(course_id: int, current_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    completed_sessions = db.query(models.AttendanceSession).filter(
        models.AttendanceSession.course_id == course_id,
        models.AttendanceSession.status == "completed"
    ).count()

    student_stats = []
    for student in course.students:
        attended = db.query(models.AttendanceRecord).filter(
            models.AttendanceRecord.student_id == student.id
        ).join(models.AttendanceSession).filter(
            models.AttendanceSession.course_id == course_id,
            models.AttendanceSession.status == "completed"
        ).count()

        student_stats.append({
            "student_id": student.id,
            "roll_number": student.roll_number,
            "full_name": student.user.full_name,
            "attended": attended,
            "total": completed_sessions,
            "rate": round((attended / completed_sessions * 100) if completed_sessions > 0 else 0, 1)
        })

    return {
        "course_code": course.course_code,
        "course_name": course.course_name,
        "total_students": len(course.students),
        "completed_sessions": completed_sessions,
        "students": sorted(student_stats, key=lambda x: x["rate"], reverse=True)
    }


# ==========================================
# WEBSOCKET: ALWAYS-ON LIVE ATTENDANCE
# ==========================================
@app.websocket("/ws/attendance/live")
async def live_attendance_stream(websocket: WebSocket):
    """Always-on attendance - detects ALL registered students, auto-creates sessions."""
    await websocket.accept()

    db = SessionLocal()
    try:
        all_students = db.query(models.Student).filter(
            models.Student.face_encoding.isnot(None)
        ).options(joinedload(models.Student.user), joinedload(models.Student.courses)).all()

        if not all_students:
            await websocket.send_json({
                "status": "error",
                "message": "No students with face data registered. Register faces first."
            })
            await websocket.close()
            return

        known_encodings = [np.frombuffer(s.face_encoding, dtype=np.float64) for s in all_students]
        last_sync = datetime.now()

        await websocket.send_json({
            "status": "ready",
            "message": f"Tracking {len(all_students)} registered students",
            "total_registered": len(all_students)
        })

        from datetime import date
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())

        while True:
            # Periodically reload encodings (every 60 seconds) to avoid stale data
            now = datetime.now()
            if (now - last_sync).total_seconds() > 60:
                all_students = db.query(models.Student).filter(
                    models.Student.face_encoding.isnot(None)
                ).options(joinedload(models.Student.user), joinedload(models.Student.courses)).all()
                known_encodings = [np.frombuffer(s.face_encoding, dtype=np.float64) for s in all_students]
                last_sync = now

            msg = await websocket.receive()
            if msg["type"] == "websocket.disconnect":
                break

            if msg.get("text") is not None:
                data = json.loads(msg["text"])
                if data.get("action") == "select_course":
                    student_id = data.get("student_id")
                    course_id = data.get("course_id")
                    

                    student = db.query(models.Student).get(student_id)
                    course = db.query(models.Course).get(course_id)
                    
                    if student and course:
                        session = db.query(models.AttendanceSession).filter(
                            models.AttendanceSession.course_id == course.id,
                            models.AttendanceSession.status == "active",
                            models.AttendanceSession.start_time >= today_start
                        ).first()

                        if not session:
                            session = models.AttendanceSession(
                                course_id=course.id,
                                created_by=1,
                                status="active"
                            )
                            db.add(session)
                            db.flush()

                        record = models.AttendanceRecord(
                            student_id=student.id,
                            session_id=session.id,
                            status="present",
                            confidence=0.99
                        )
                        db.add(record)
                        db.commit()
                        
                        await websocket.send_json({
                            "status": "success",
                            "student_name": student.user.full_name,
                            "roll_number": student.roll_number,
                            "box": [0,0,0,0],
                            "confidence": 0.99,
                            "marked_count": 0,
                            "total_registered": len(all_students)
                        })
                continue
            
            if msg.get("bytes") is None:
                continue

            image_bytes = msg["bytes"]
            result = face_utils.get_face_encoding(image_bytes)

            if result is None:
                await websocket.send_json({"status": "no_face"})
                continue

            unknown_encoding = result["encoding"]
            face_box = list(result["box"]) if result.get("box") else None
            match_idx = face_utils.match_face(unknown_encoding, known_encodings)

            if match_idx is not None:
                matched_student = all_students[match_idx]
                confidence = float(1 - face_utils.face_distance(unknown_encoding, known_encodings[match_idx]))

                last_record = db.query(models.AttendanceRecord).options(
                    joinedload(models.AttendanceRecord.session)
                ).filter(
                    models.AttendanceRecord.student_id == matched_student.id
                ).order_by(models.AttendanceRecord.timestamp.desc()).first()

                now = datetime.now()
                is_cooldown = False
                if last_record and last_record.timestamp >= today_start:
                    time_since = (now - last_record.timestamp).total_seconds()
                    # Apply cooldown ONLY if recent (< 2 hours) AND the previous session is still 'active'
                    if time_since < 7200 and last_record.session and last_record.session.status == "active":
                        is_cooldown = True

                enrolled_courses = matched_student.courses
                if not enrolled_courses:
                    await websocket.send_json({
                        "status": "unknown",
                        "message": "Student not enrolled in any courses.",
                        "box": face_box
                    })
                    continue

                if is_cooldown:
                    await websocket.send_json({
                        "status": "duplicate",
                        "student_name": matched_student.user.full_name,
                        "roll_number": matched_student.roll_number,
                        "box": face_box,
                        "confidence": round(confidence, 2)
                    })
                    continue

                if len(enrolled_courses) == 1:
                    course = enrolled_courses[0]
                    session = db.query(models.AttendanceSession).filter(
                        models.AttendanceSession.course_id == course.id,
                        models.AttendanceSession.status == "active",
                        models.AttendanceSession.start_time >= today_start
                    ).first()

                    if not session:
                        session = models.AttendanceSession(
                            course_id=course.id,
                            created_by=1,
                            status="active"
                        )
                        db.add(session)
                        db.flush()

                    record = models.AttendanceRecord(
                        student_id=matched_student.id,
                        session_id=session.id,
                        status="present",
                        confidence=round(confidence, 3)
                    )
                    db.add(record)
                    db.commit()

                    await websocket.send_json({
                        "status": "success",
                        "student_name": matched_student.user.full_name,
                        "roll_number": matched_student.roll_number,
                        "box": face_box,
                        "confidence": round(confidence, 2),
                        "marked_count": 0,
                        "total_registered": len(all_students)
                    })
                else:
                    await websocket.send_json({
                        "status": "multiple_courses",
                        "student_id": matched_student.id,
                        "student_name": matched_student.user.full_name,
                        "courses": [{"id": c.id, "course_code": c.course_code, "course_name": c.course_name} for c in enrolled_courses],
                        "box": face_box
                    })

            else:
                await websocket.send_json({
                    "status": "unknown",
                    "message": "Unregistered Face",
                    "box": face_box
                })

    except WebSocketDisconnect:
        print("Live attendance kiosk disconnected")
    except Exception as e:
        print(f"Live Attendance WebSocket Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


# ==========================================
# WEBSOCKET: SESSION-BASED ATTENDANCE
# ==========================================
@app.websocket("/ws/attendance/{session_id}")
async def attendance_stream(websocket: WebSocket, session_id: int):
    await websocket.accept()

    db = SessionLocal()
    try:
        session = db.query(models.AttendanceSession).options(
            joinedload(models.AttendanceSession.course)
            .joinedload(models.Course.students)
            .joinedload(models.Student.user)
        ).filter(
            models.AttendanceSession.id == session_id,
            models.AttendanceSession.status == "active"
        ).first()

        if not session:
            await websocket.send_json({"status": "error", "message": "Session not found or not active"})
            await websocket.close()
            return

        course = session.course
        enrolled_students = course.students
        if not enrolled_students:
            await websocket.send_json({"status": "error", "message": "No students enrolled in this course"})
            await websocket.close()
            return

        students_with_face = [s for s in enrolled_students if s.face_encoding is not None]
        if not students_with_face:
            await websocket.send_json({"status": "error", "message": "No students with face data enrolled"})
            await websocket.close()
            return

        known_encodings = [np.frombuffer(s.face_encoding, dtype=np.float64) for s in students_with_face]

        await websocket.send_json({
            "status": "ready",
            "message": f"Tracking {len(students_with_face)} students for {course.course_name}",
            "course_name": course.course_name,
            "total_enrolled": len(enrolled_students)
        })

        marked_student_ids = set()

        while True:
            image_bytes = await websocket.receive_bytes()

            db.refresh(session)
            if session.status != "active":
                await websocket.send_json({"status": "session_ended", "message": "Session has ended"})
                break

            result = face_utils.get_face_encoding(image_bytes)

            if result is None:
                await websocket.send_json({"status": "no_face"})
                continue

            unknown_encoding = result["encoding"]
            face_box = list(result["box"]) if result.get("box") else None

            match_idx = face_utils.match_face(unknown_encoding, known_encodings)

            if match_idx is not None:
                matched_student = students_with_face[match_idx]
                confidence = float(1 - face_utils.face_distance(unknown_encoding, known_encodings[match_idx]))

                if matched_student.id in marked_student_ids:
                    await websocket.send_json({
                        "status": "duplicate",
                        "student_name": matched_student.user.full_name,
                        "roll_number": matched_student.roll_number,
                        "box": face_box,
                        "confidence": round(confidence, 2)
                    })
                else:
                    record = models.AttendanceRecord(
                        student_id=matched_student.id,
                        session_id=session_id,
                        status="present",
                        confidence=round(confidence, 3)
                    )
                    db.add(record)
                    db.commit()
                    marked_student_ids.add(matched_student.id)

                    await websocket.send_json({
                        "status": "success",
                        "student_name": matched_student.user.full_name,
                        "roll_number": matched_student.roll_number,
                        "box": face_box,
                        "confidence": round(confidence, 2),
                        "marked_count": len(marked_student_ids),
                        "total_enrolled": len(enrolled_students)
                    })
            else:
                await websocket.send_json({
                    "status": "unknown",
                    "message": "Unregistered Face",
                    "box": face_box
                })

    except WebSocketDisconnect:
        print("Attendance kiosk disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        db.close()


