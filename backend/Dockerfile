FROM python:3.10

# Install only necessary system libs for OpenCV and image processing
RUN apt-get update && apt-get install -y \
    cmake \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# FIX: Pass the compatibility flag to CMake so dlib can build
RUN CMAKE_ARGS="-DCMAKE_POLICY_VERSION_MINIMUM=3.5" pip install --no-cache-dir dlib==19.24.2

# Install CPU-only versions of Torch (needed by Ultralytics/YOLO) to avoid CUDA bloat
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest
COPY . .

RUN mkdir -p profiles
ENV PYTHONUNBUFFERED=1
EXPOSE 7860

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
