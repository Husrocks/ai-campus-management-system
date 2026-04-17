from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, LargeBinary, Table, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

# ==========================================
# ASSOCIATION TABLE (Many-to-Many: Student <-> Course)
# ==========================================
enrollment_table = Table(
    'enrollments',
    Base.metadata,
    Column('student_id', Integer, ForeignKey('students.id', ondelete="CASCADE"), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id', ondelete="CASCADE"), primary_key=True),
    Column('enrolled_at', DateTime, default=lambda: datetime.now(timezone.utc))
)

# ==========================================
# USERS (Authentication - both students and admins)
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="student", nullable=False)  # "student" or "admin"
    profile_picture = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")

# ==========================================
# STUDENTS (Extended profile linked to a User)
# ==========================================
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, nullable=True, default="")
    phone = Column(String, nullable=True, default="")
    face_encoding = Column(LargeBinary, nullable=True)
    enrolled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="student_profile")
    courses = relationship("Course", secondary=enrollment_table, back_populates="students")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")

# ==========================================
# COURSES
# ==========================================
class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, unique=True, index=True, nullable=False)
    course_name = Column(String, nullable=False)
    description = Column(Text, nullable=True, default="")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    students = relationship("Student", secondary=enrollment_table, back_populates="courses")
    sessions = relationship("AttendanceSession", back_populates="course", cascade="all, delete-orphan")

# ==========================================
# ATTENDANCE SESSIONS (Admin starts a session for a course)
# ==========================================
class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="active")  # "active", "completed", "cancelled"

    # Relationships
    course = relationship("Course", back_populates="sessions")
    creator = relationship("User")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

# ==========================================
# ATTENDANCE RECORDS (Individual student attendance entries)
# ==========================================
class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    status = Column(String, default="present")  # "present", "late"
    confidence = Column(Float, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="records")