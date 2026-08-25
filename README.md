# 🎓 TechPhantom AI Campus

### AI-Powered Campus Management System with Real-Time Facial Recognition Attendance

TechPhantom AI Campus is a modern, full-stack **Campus Management System (CMS)** designed to automate university operations through **Artificial Intelligence, Computer Vision, real-time attendance tracking, and centralized academic management**.

The core of the platform is its **AI-powered facial recognition attendance system**, which combines **face detection, 128-dimensional facial embeddings, identity recognition, and YOLO-based person tracking** to provide an automated alternative to traditional manual attendance.

> 🚀 **From student registration to facial enrollment, classroom detection, identity verification, and attendance recording — TechPhantom AI Campus brings the complete workflow into one intelligent platform.**

---

## ⭐ What Makes This Project Different?

Unlike a conventional CMS that only manages student records and attendance manually, TechPhantom AI Campus introduces an **AI Computer Vision layer** directly into the attendance workflow.

### 🤖 AI Facial Recognition Attendance

The attendance engine is built around a multi-stage computer vision pipeline:

```text
                📷 Camera / Video Stream
                         │
                         ▼
                ┌─────────────────┐
                │  YOLO Detection  │
                │ Person Detection │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Face Detection   │
                │   & Processing   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Face Encoding    │
                │    128D Vector   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Identity Match   │
                │ Student Database │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Course / Session │
                │    Validation    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Attendance Saved │
                └─────────────────┘
```

### 🔥 Key AI Capabilities

* **Real-time facial recognition**
* **128D facial embeddings**
* **YOLO-based person detection and tracking**
* **Student identity verification**
* **Face enrollment through the student profile**
* **Multi-student detection**
* **Course-aware attendance validation**
* **Duplicate attendance prevention**
* **Active-class/course selection logic**
* **Real-time attendance events through WebSockets**
* **OpenCV-based image preprocessing**
* **Fallback encoding support for environments where native C++ dependencies are unavailable**

The YOLO tracking layer is particularly useful for video-stream scenarios because object trackers can maintain tracked identities across frames.

---

# 🚀 Core Features

## 🤖 1. AI Facial Recognition Attendance

The centerpiece of TechPhantom AI Campus.

Students can register their facial data once, after which the system can recognize them during attendance sessions.

### Attendance Workflow

1. Student enrolls their face.
2. The system generates a facial representation.
3. Camera captures the classroom/session.
4. YOLO detects people in the video stream.
5. Face detection identifies visible faces.
6. Facial embeddings are generated.
7. Embeddings are compared with enrolled students.
8. The system identifies the student.
9. Active course/session rules are evaluated.
10. Attendance is recorded.
11. The result is pushed to connected dashboards in real time.

### Why YOLO + Face Recognition?

The system separates **"Who is present in the camera?"** from **"Who is this person?"**

```text
YOLO
 ↓
Detect / Track Person
 ↓
Face Detection
 ↓
Face Encoding
 ↓
Face Matching
 ↓
Student Identity
 ↓
Attendance Validation
```

This architecture helps make the attendance kiosk suitable for real-time environments rather than relying on a simple single-face image upload.

---

# 📊 2. Administrative Dashboard

Administrators get a centralized control panel for managing the entire campus system.

### Dashboard capabilities

* 📈 Attendance analytics
* 👨‍🎓 Student statistics
* 📚 Course statistics
* 📊 Attendance percentages
* 👤 Student management
* 🎓 Course management
* 🧑‍💻 User management
* 🤖 Face enrollment management
* 📡 Live attendance monitoring
* 🔎 Attendance history
* 🔐 Role-based access control

---

# 👨‍🎓 3. Student Portal

Students have their own dedicated portal to interact with the academic system.

### Student capabilities

* View attendance history
* View attendance percentage
* Check course enrollment
* Enroll in available courses
* Update profile information
* Register facial data
* Review attendance records

---

# 📚 4. Course Management

Administrators can create and manage university courses.

### Course functionality

* Create courses
* Update courses
* Delete courses
* Assign course information
* Manage active courses
* Associate students with courses
* Validate attendance against active courses

The system also includes **multi-course logic**, allowing the attendance workflow to handle students who are enrolled in multiple active classes.

---

# 📡 5. Real-Time Attendance Kiosk

TechPhantom AI Campus includes a **global scanner/kiosk mode** designed for high-traffic environments.

The kiosk can continuously process camera input while the backend communicates attendance events to connected clients through WebSockets.

```text
Camera
   │
   ▼
AI Processing
   │
   ▼
FastAPI Backend
   │
   ├──────────────► Database
   │
   ▼
WebSocket
   │
   ▼
Live Dashboard
```

FastAPI supports WebSocket endpoints for persistent two-way communication between the application and connected clients.

---

# 🧠 AI & Computer Vision Architecture

The computer vision subsystem combines multiple technologies instead of relying on a single model.

### Face Recognition

Powered by:

* `face_recognition`
* `dlib`
* 128-dimensional facial embeddings

The facial recognition component converts detected faces into numerical representations that can be compared against enrolled student data.

### Object Detection & Tracking

Powered by:

* Ultralytics YOLO
* OpenCV

YOLO provides real-time person detection/tracking while OpenCV handles camera and image-processing operations.

Ultralytics supports tracking on video and streaming sources and provides configurable tracking systems such as BoT-SORT and ByteTrack.

### Hybrid Compatibility

The project also includes a fallback approach for environments where native C++ dependencies required by `dlib` cannot be built easily.

```text
Primary
dlib + face_recognition
        │
        ▼
High-quality facial embeddings

Fallback
OpenCV-based processing
        │
        ▼
Improved environment compatibility
```

---

# 🏗️ System Architecture

```text
┌──────────────────────────────────────────────┐
│                  FRONTEND                    │
│                                              │
│        React.js + Vite + Vanilla CSS         │
│                                              │
│  Admin Dashboard │ Student Portal │ Kiosk   │
└───────────────────────┬──────────────────────┘
                        │
                   REST / WebSocket
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                  BACKEND                     │
│                                              │
│                 FastAPI                     │
│                                              │
│ Authentication │ Students │ Courses          │
│ Attendance │ Analytics │ WebSockets          │
└───────────────┬──────────────────┬───────────┘
                │                  │
                ▼                  ▼
       ┌────────────────┐   ┌─────────────────┐
       │   Database     │   │  AI / Vision    │
       │                │   │                 │
       │ SQLAlchemy     │   │ YOLO            │
       │ SQLite/Postgres│   │ OpenCV          │
       │ MySQL          │   │ face_recognition│
       └────────────────┘   │ dlib            │
                            └─────────────────┘
```

---

# 🛠️ Technology Stack

## Backend

| Technology     | Purpose                      |
| -------------- | ---------------------------- |
| **Python**     | Core backend & AI processing |
| **FastAPI**    | REST API framework           |
| **SQLAlchemy** | Database ORM                 |
| **Pydantic**   | Data validation              |
| **Uvicorn**    | ASGI server                  |
| **JWT**        | Authentication               |
| **Bcrypt**     | Password hashing             |

## Frontend

| Technology       | Purpose                 |
| ---------------- | ----------------------- |
| **React.js**     | UI framework            |
| **Vite**         | Frontend tooling        |
| **Vanilla CSS**  | Custom UI design        |
| **Lucide Icons** | Interface icons         |
| **WebSocket**    | Real-time communication |

## AI & Computer Vision

| Technology           | Purpose                            |
| -------------------- | ---------------------------------- |
| **face_recognition** | Facial recognition                 |
| **dlib**             | Facial embeddings                  |
| **OpenCV**           | Image processing & camera handling |
| **Ultralytics YOLO** | Person detection & tracking        |

## Database

* SQLite — local development
* PostgreSQL — production
* MySQL — supported through SQLAlchemy

---

# 📂 Project Structure

```text
TechPhantom-AI-Campus/
│
├── backend/
│   ├── main.py
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   ├── services/
│   ├── ai/
│   │   ├── face_recognition/
│   │   ├── detection/
│   │   └── tracking/
│   ├── database/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── assets/
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── docker-compose.yml
```

---

# ⚙️ Installation & Setup

## Prerequisites

Make sure you have:

* Python 3.9+
* Node.js 18+
* npm
* C++ Build Tools
* Git
* Webcam/camera for facial attendance

> `dlib` and `face_recognition` may require native build dependencies depending on your operating system and Python environment.

---

## 🔧 Backend Setup

```bash
cd backend

python -m venv venv
```

### Windows

```bash
.\venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python main.py
```

Or with Uvicorn:

```bash
uvicorn main:app --reload
```

---

# 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start using Vite's development server.

---

# 🔐 Environment Configuration

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=sqlite:///./attendance.db

SECRET_KEY=your_very_secure_random_secret

ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

For production, replace development secrets and SQLite with appropriate production configuration.

---

# 🧪 Facial Attendance Setup

Before using automated attendance:

### 1. Create Student

Administrator creates a student profile.

### 2. Enroll Face

The student registers their face through the system.

```text
Student Profile
       ↓
Face Capture
       ↓
Face Detection
       ↓
Face Encoding
       ↓
Store Facial Representation
```

### 3. Start Attendance Kiosk

Launch the camera/kiosk.

```text
Camera → YOLO → Face Detection → Encoding → Matching
```

### 4. Identify Student

The system compares the detected facial representation against enrolled students.

### 5. Validate Course

The system determines the appropriate active course/session.

### 6. Record Attendance

A successful recognition results in an attendance record.

---

# 📈 Attendance Intelligence

The platform is designed to provide more than a simple **Present/Absent** value.

Attendance data can be used to calculate:

* Individual attendance percentage
* Course attendance percentage
* Student attendance history
* Class/session attendance
* Overall campus attendance statistics
* Attendance trends

Example:

```text
Student: Muhammad Ali
Course: Artificial Intelligence

Total Classes: 30
Present:       26
Absent:         4

Attendance: 86.67%
```

---

# 🔒 Security

TechPhantom AI Campus implements multiple layers of application security.

### Authentication

* JWT-based authentication
* Secure password hashing
* Token expiration

### Authorization

Role-based access control separates administrative and student functionality.

### API Security

* Protected API endpoints
* Configurable CORS
* Input validation through Pydantic
* Authentication middleware/dependencies

### Facial Data

The system is designed to store **facial representations/encodings rather than relying on raw student photographs for recognition**.

> ⚠️ Facial biometric data is sensitive. A production deployment should additionally implement appropriate consent, retention, access-control, encryption, and institutional privacy policies.

---

# 🚀 Production Deployment

For production environments, the recommended architecture is:

```text
                   Internet
                      │
                      ▼
                  ┌───────┐
                  │ Nginx │
                  └───┬───┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
        React Frontend     FastAPI API
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                PostgreSQL    AI Engine   WebSocket
```

### Recommended Infrastructure

* **4 GB+ RAM**
* **2+ vCPUs**
* Linux server
* Nginx
* PostgreSQL
* HTTPS/SSL
* Gunicorn + Uvicorn workers
* GPU recommended for heavier computer-vision workloads

Example:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

For larger deployments, Docker Compose can be used to orchestrate:

* FastAPI
* React/Nginx
* PostgreSQL
* AI processing services

---

# 📊 Example Use Cases

### 🏫 Universities

Automate classroom attendance without requiring manual roll calls.

### 🎓 Classrooms

Use a camera-based kiosk to recognize students entering or attending a session.

### 🏢 Campus Entry Points

Deploy the system at designated campus scanning locations.

### 📡 High-Traffic Areas

Use the live kiosk and tracking system for continuous attendance processing.

---

# 🔮 Future Improvements

Potential extensions include:

* [ ] Liveness / anti-spoofing detection
* [ ] Mobile attendance notifications
* [ ] Advanced attendance analytics
* [ ] Email/SMS alerts for low attendance
* [ ] GPU-accelerated inference
* [ ] Cloud deployment
* [ ] Multi-campus support
* [ ] Advanced audit logs
* [ ] Facial recognition confidence thresholds
* [ ] Attendance anomaly detection
* [ ] Parent/guardian portal
* [ ] Automated timetable integration
* [ ] Containerized AI inference service

---

# 🎯 Project Highlights

```text
🤖 AI-Powered Facial Recognition
🎥 Real-Time Computer Vision
👁️ YOLO Person Detection & Tracking
🧠 128D Facial Embeddings
📡 Real-Time WebSocket Attendance
🎓 Automated Course Management
📊 Administrative Analytics
👨‍🎓 Student Portal
🔐 JWT + RBAC Security
⚡ FastAPI Backend
⚛️ React + Vite Frontend
🗄️ SQLAlchemy Database Layer
🐳 Production-Ready Architecture
```

---

# 📌 Why TechPhantom AI Campus?

Traditional campus management systems primarily focus on **record keeping**.

TechPhantom AI Campus focuses on **automation**.

Instead of:

```text
Teacher → Manual Roll Call → Attendance Sheet → Database
```

TechPhantom introduces:

```text
Camera
   ↓
AI Detection
   ↓
Facial Recognition
   ↓
Student Identification
   ↓
Course Validation
   ↓
Automatic Attendance
   ↓
Real-Time Dashboard
```

This makes **AI-powered facial attendance the central intelligence layer of the campus management platform.**

---

# 🏆 Project Summary

**TechPhantom AI Campus** combines:

> **Full-Stack Development + Artificial Intelligence + Computer Vision + Real-Time Systems + Database Engineering**

into a unified university management platform.

The project's primary innovation is its **real-time facial recognition attendance pipeline**, supported by **YOLO-based person detection/tracking, dlib/face-recognition facial embeddings, OpenCV processing, FastAPI APIs, and WebSocket communication**.

It demonstrates how modern AI technologies can be integrated into a practical university information system to automate repetitive administrative workflows while providing students and administrators with a centralized digital platform.

---

## 👨‍💻 TechPhantom

**Built with Python, FastAPI, React, Computer Vision, and AI.**

⭐ If you find this project useful, consider giving the repository a star.

---

## 📄 License

This project is intended for educational, research, and demonstration purposes. Add your preferred license here, such as MIT, if the repository is intended for open-source distribution.
