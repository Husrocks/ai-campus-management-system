FROM python:3.10-slim

# Install system dependencies for OpenCV, Dlib, and YOLOv8
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create directory for profile uploads
RUN mkdir -p profiles

# Set environment variables for production
ENV PYTHONUNBUFFERED=1

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Start the application using uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers", "--forwarded-allow-ips", "*"]
