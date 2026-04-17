# TechPhantom NavTac: AI Campus Management System

TechPhantom NavTac is a production-grade Campus Management System (CMS) featuring real-time AI-powered facial attendance, automated course management, and a robust administrative dashboard. Built with a modern full-stack architecture, it leverages Computer Vision and Deep Learning to streamline university operations.

---

## 🚀 Core Features

### 🤖 AI-Powered Attendance
- **Facial Recognition**: High-accuracy face detection and recognition using `dlib` and `face_recognition`.
- **YOLOv8 Integration**: Real-time person detection and tracking to ensure valid scan sessions.
- **Hybrid Encoding**: Falls back to OpenCV-based histogram encoding if C++ build tools are unavailable, ensuring compatibility across environments.
- **Multi-Course Logic**: Intelligent course selection if a student is enrolled in multiple active classes.

### 📊 Administrative Dashboard
- **Comprehensive Analytics**: Real-time stats on students, courses, and attendance rates.
- **Student Management**: Full CRUD operations for student profiles, including face enrollment and course associations.
- **Course Management**: Dynamic course creation and management by system administrators.
- **Live Monitoring**: A global scanner kiosk mode for high-traffic areas.

### 🎓 Student Portal
- **Attendance Tracking**: Students can view their attendance history and rates per course.
- **Course Enrollment**: Self-service enrollment into available university courses.
- **Profile Management**: Update personal info and register face data for automated attendance.

---

## 🛠 Technology Stack

### Backend (Python/FastAPI)
- **FastAPI**: High-performance ASGI framework.
- **SQLAlchemy**: Powerful ORM for SQLite/PostgreSQL/MySQL.
- **Uvicorn**: Lightning-fast server implementation.
- **Pydantic**: Robust data validation and serialization.
- **JWT Auth**: Secure token-based authentication with Bcrypt hashing.

### Frontend (React/Vite)
- **React.js**: Modern component-based UI.
- **Lucide Icons**: Premium, consistent iconography.
- **CSS3 (Vanilla)**: Custom, premium styling with glassmorphism and modern aesthetics.
- **WebSocket**: Real-time, bi-directional communication for the attendance kiosk.

### AI & Vision
- **Face Recognition**: Dlib-based 128D facial embeddings.
- **OpenCV**: Image pre-processing and fallback detection.
- **Ultralytics YOLOv8**: Real-time object detection (Person tracking).

---

## 📦 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- C++ Build Tools (Required for `dlib` / `face_recognition`)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Production Deployment

### 1. Infrastructure
- **Server**: Recommended 4GB RAM + 2 vCPUs (due to AI processing).
- **WSGI/ASGI**: Use `gunicorn` with `uvicorn` workers for the backend.
  ```bash
  gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
  ```
- **Reverse Proxy**: Use **Nginx** to handle SSL (HTTPS), static file serving, and WebSocket proxying.

### 2. Environment Variables
Create a `.env` file in the `backend` directory:
```env
DATABASE_URL=sqlite:///./attendance.db
SECRET_KEY=your_very_secure_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 3. Dockerization (Recommended)
Create a `docker-compose.yml` to orchestrate the FastAPI backend, React frontend (Nginx), and a PostgreSQL database for production scalability.

---

## 🔒 Security Considerations
- **Password Hashing**: Uses `passlib[bcrypt]` for all user credentials.
- **JWT Protection**: All sensitive API routes are protected by role-based access control (RBAC).
- **CORS Policy**: Configurable origins to prevent unauthorized cross-site requests.
- **Data Privacy**: Facial encodings are stored as binary data, not raw images, ensuring student privacy.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Developed with ❤️ by the **TechPhantom Team**.
