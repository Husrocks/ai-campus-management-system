import numpy as np
import cv2

# ── Tier 1: face_recognition (dlib) ──────────────────────────────────────────
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    print("[OK] face_recognition loaded successfully.")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("[WARNING] face_recognition not installed. Trying MediaPipe fallback.")

# ── Tier 2: MediaPipe face detection ─────────────────────────────────────────
try:
    import mediapipe as mp
    _mp_face = mp.solutions.face_detection
    MEDIAPIPE_AVAILABLE = True
    print("[OK] MediaPipe face detection loaded successfully.")
except Exception:
    MEDIAPIPE_AVAILABLE = False
    print("[WARNING] MediaPipe not available. Trying OpenCV cascade fallback.")

# ── Tier 3: YOLOv8 person detection (optional) ───────────────────────────────
try:
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    YOLO_AVAILABLE = True
    print("[OK] YOLOv8 loaded successfully.")
except Exception:
    YOLO_AVAILABLE = False
    model = None
    print("[WARNING] YOLOv8 not available. Person detection disabled.")

# ── Tier 4: OpenCV Haar cascade ───────────────────────────────────────────────
try:
    import os
    cascade_path = os.path.join(os.path.dirname(__file__), 'haarcascade_frontalface_default.xml')
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    if face_cascade.empty():
        face_cascade = None
        OPENCV_CASCADE_AVAILABLE = False
        print("[WARNING] cv2.CascadeClassifier empty (Local XML not found).")
    else:
        OPENCV_CASCADE_AVAILABLE = True
        print("[OK] OpenCV Haar cascade loaded from local file.")
except Exception:
    face_cascade = None
    OPENCV_CASCADE_AVAILABLE = False
    print("[WARNING] cv2.CascadeClassifier unavailable.")


def _histogram_encoding(rgb_img, x, y, w, h):
    """Create a 128-dim histogram encoding from a face ROI."""
    face_roi = rgb_img[y:y + h, x:x + w]
    face_resized = cv2.resize(face_roi, (150, 150))
    encoding = []
    for channel in range(3):
        hist = cv2.calcHist([face_resized], [channel], None, [43], [0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        encoding.extend(hist[:43])          # 43 × 3 = 129 → take 128
    return np.array(encoding[:128], dtype=np.float64)


def get_face_encoding(image_bytes: bytes):
    """
    Extract a face encoding from image bytes.

    Priority:
      1. face_recognition (dlib 128-D) — most accurate
      2. MediaPipe          (bbox → histogram)  — reliable on HF Spaces
      3. OpenCV Haar cascade (bbox → histogram) — last resort
    Returns dict {"encoding": np.ndarray, "box": tuple} or None.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return None

        rgb_img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        h_img, w_img = img_bgr.shape[:2]

        # ── Tier 1: face_recognition ────────────────────────────────────────
        if FACE_RECOGNITION_AVAILABLE:
            face_locations = face_recognition.face_locations(rgb_img)
            if face_locations:
                encodings = face_recognition.face_encodings(
                    rgb_img, known_face_locations=face_locations
                )
                if encodings:
                    return {"encoding": encodings[0], "box": face_locations[0]}

        # ── Tier 2: MediaPipe ───────────────────────────────────────────────
        if MEDIAPIPE_AVAILABLE:
            with _mp_face.FaceDetection(
                model_selection=1, min_detection_confidence=0.5
            ) as detector:
                results = detector.process(rgb_img)
                if results.detections:
                    det = results.detections[0]
                    bbox = det.location_data.relative_bounding_box
                    x = max(0, int(bbox.xmin * w_img))
                    y = max(0, int(bbox.ymin * h_img))
                    w = int(bbox.width * w_img)
                    h = int(bbox.height * h_img)
                    # Clamp to image bounds
                    w = min(w, w_img - x)
                    h = min(h, h_img - y)
                    if w > 0 and h > 0:
                        encoding = _histogram_encoding(rgb_img, x, y, w, h)
                        box = (y, x + w, y + h, x)   # top, right, bottom, left
                        return {"encoding": encoding, "box": box}

        # ── Tier 3: OpenCV Haar cascade ─────────────────────────────────────
        if OPENCV_CASCADE_AVAILABLE and face_cascade is not None:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            try:
                faces = face_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
                )
            except Exception as e:
                print(f"[ERROR] Cascade detectMultiScale failed: {e}")
                faces = []
                
            if len(faces) > 0:
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                encoding = _histogram_encoding(rgb_img, x, y, w, h)
                box = (int(y), int(x + w), int(y + h), int(x))
                return {"encoding": encoding, "box": box}

    except Exception as e:
        print(f"[ERROR] get_face_encoding: {e}")
        import traceback
        traceback.print_exc()

    return None


def match_face(unknown_encoding: np.ndarray, known_encodings: list, tolerance: float = 0.5):
    """
    Compare an unknown face encoding against a list of known encodings.
    Works with both face_recognition (dlib) and histogram-based encodings.
    """
    if not known_encodings:
        return None

    if FACE_RECOGNITION_AVAILABLE:
        matches = face_recognition.compare_faces(
            known_encodings, unknown_encoding, tolerance=tolerance
        )
        distances = face_recognition.face_distance(known_encodings, unknown_encoding)
    else:
        distances = np.array(
            [np.linalg.norm(known - unknown_encoding) for known in known_encodings]
        )
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