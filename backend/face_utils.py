import numpy as np
import cv2

# Conditional imports — these require dlib/cmake C++ build tools
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    print("[OK] face_recognition loaded successfully.")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("[WARNING] face_recognition not installed. Using OpenCV fallback for face detection.")

try:
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    YOLO_AVAILABLE = True
    print("[OK] YOLOv8 loaded successfully.")
except Exception:
    YOLO_AVAILABLE = False
    model = None
    print("[WARNING] YOLOv8 not available. Person detection disabled.")

# OpenCV face detector fallback
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def get_face_encoding(image_bytes: bytes):
    """
    Extract face encoding from image bytes.
    Uses face_recognition if available, falls back to OpenCV histogram-based encoding.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return None

        rgb_img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        if FACE_RECOGNITION_AVAILABLE:
            # Primary: dlib-based 128D face encoding
            face_locations = face_recognition.face_locations(rgb_img)
            if face_locations:
                encodings = face_recognition.face_encodings(rgb_img, known_face_locations=face_locations)
                if encodings:
                    return {
                        "encoding": encodings[0],
                        "box": face_locations[0]
                    }
        else:
            # Fallback: OpenCV Haar cascade + histogram encoding
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))

            if len(faces) > 0:
                # Get the largest face
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

                # Extract face ROI and create a histogram-based encoding
                face_roi = rgb_img[y:y+h, x:x+w]
                face_resized = cv2.resize(face_roi, (150, 150))

                # Create a pseudo-encoding using color histograms (128 dimensions)
                encoding = []
                for channel in range(3):
                    hist = cv2.calcHist([face_resized], [channel], None, [43], [0, 256])
                    hist = cv2.normalize(hist, hist).flatten()
                    encoding.extend(hist[:43])  # 43 bins x 3 channels = 129, take 128
                encoding = np.array(encoding[:128], dtype=np.float64)

                # Convert to face_recognition-compatible format (top, right, bottom, left)
                box = (int(y), int(x + w), int(y + h), int(x))

                return {
                    "encoding": encoding,
                    "box": box
                }

    except Exception as e:
        print(f"Error processing image: {e}")
        import traceback
        traceback.print_exc()

    return None


def match_face(unknown_encoding: np.ndarray, known_encodings: list, tolerance: float = 0.5):
    """
    Compare an unknown face against known encodings.
    Works with both face_recognition and OpenCV fallback encodings.
    """
    if not known_encodings:
        return None

    if FACE_RECOGNITION_AVAILABLE:
        matches = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=tolerance)
        distances = face_recognition.face_distance(known_encodings, unknown_encoding)
    else:
        # Fallback: Euclidean distance comparison
        distances = np.array([np.linalg.norm(known - unknown_encoding) for known in known_encodings])
        # For histogram-based, a smaller threshold is needed
        matches = [d < 0.6 for d in distances]

    if not any(matches):
        return None

    best_match_index = int(np.argmin(distances))
    if matches[best_match_index]:
        return best_match_index

    return None


def face_distance(unknown_encoding: np.ndarray, known_encoding: np.ndarray) -> float:
    """Calculate the Euclidean distance between two face encodings."""
    return float(np.linalg.norm(unknown_encoding - known_encoding))