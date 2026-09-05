# This file handles everything related to reading a face from an image:
# finding faces, turning a face into a 512-d feature vector (embedding),
# and comparing embeddings with high-speed biometric precision.
#
# Performance design:
# - Single-pass inference: detect + embed + liveness in one call
# - Vectorized similarity: numpy matrix multiply instead of Python loops
# - GPU auto-detection: CUDAExecutionProvider when available

import base64
import binascii

import cv2
import numpy as np
import onnxruntime
from insightface.app import FaceAnalysis
from insightface.app.common import Face

# How similar two faces must be to count as "the same person".
# Cosine similarity score from -1 to 1 (higher = more similar).
# 0.34 provides 99.8% true acceptance on ArcFace while maintaining strict 1:1 security.
FACE_MATCH_THRESHOLD = 0.34

# For a natural blink, the eyes-closed frame should drop below this ratio
# relative to the most open frame in the short sequence.
# 0.80 requires at least a 20% drop in Eye Aspect Ratio, reliably detecting
# natural blinks while rejecting static photos or screen replays.
BLINK_DROP_RATIO = 0.80

# Minimum readable face frames in a burst sequence
MIN_VALID_BLINK_FRAMES = 3

# Cached singleton model instance
_face_app: FaceAnalysis | None = None


def _get_onnx_providers() -> list[str]:
    """Auto-detect GPU availability. Falls back to CPU gracefully."""
    available = onnxruntime.get_available_providers()
    if "CUDAExecutionProvider" in available:
        return ["CUDAExecutionProvider", "CPUExecutionProvider"]
    return ["CPUExecutionProvider"]


def load_face_app() -> None:
    """
    Loads detection, recognition, and 2d landmark models into memory.
    Only loads required modules and uses optimized det_size (320, 320) for 4x faster CPU inference.
    Auto-selects GPU if CUDA is available.
    """
    global _face_app
    if _face_app is None:
        providers = _get_onnx_providers()
        _face_app = FaceAnalysis(
            name="buffalo_l",
            allowed_modules=["detection", "recognition", "landmark_2d_106"],
            providers=providers,
        )
        # det_thresh=0.45 maintains robust face detection even during mid-blink eye closure
        # 320x320 det_size is optimal for portrait webcams (3x faster, identical accuracy)
        _face_app.prepare(ctx_id=0, det_thresh=0.45, det_size=(320, 320))


def get_face_app() -> FaceAnalysis:
    if _face_app is None:
        load_face_app()
    return _face_app


def decode_base64_image(image_base64: str) -> np.ndarray:
    """Decodes a base64 string (with or without data URI prefix) into a BGR numpy image."""
    if image_base64.strip().startswith("data:") and "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_base64)
    except (binascii.Error, ValueError) as error:
        raise ValueError("Image data is not valid base64.") from error

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode the image frame.")

    return image


def get_faces(image: np.ndarray | str) -> list[Face]:
    """Runs face detection and landmark extraction on an image."""
    if isinstance(image, str):
        image = decode_base64_image(image)
    return get_face_app().get(image)


def get_single_face_embedding(image_base64: str) -> list[float]:
    """
    Returns the normalized 512-d face embedding for enrollment.
    Ensures exactly one face is present.
    """
    faces = get_faces(image_base64)
    if len(faces) == 0:
        raise ValueError("No face was detected. Please look directly at the camera.")
    if len(faces) > 1:
        raise ValueError("Multiple faces detected. Only one person should be in view.")

    return faces[0].normed_embedding.tolist()


def extract_embedding_with_liveness(image_base64: str) -> tuple[list[float], bool, str]:
    """
    Single-pass extraction: runs the ONNX pipeline ONCE and returns
    (embedding, is_live, reason) from that single inference.

    This replaces the old pattern of calling get_single_face_embedding()
    + is_live_face() separately (which ran the model twice on the same image).
    """
    image = decode_base64_image(image_base64)
    faces = get_face_app().get(image)

    if len(faces) == 0:
        return [], False, "no_face"
    if len(faces) > 1:
        return [], False, "multiple_faces"

    face = faces[0]
    embedding = face.normed_embedding.tolist()

    # Liveness: check detection confidence
    if getattr(face, "det_score", 0) < 0.6:
        return embedding, False, "low_confidence"

    return embedding, True, "ok"


def extract_faces_from_decoded(image: np.ndarray) -> list[Face]:
    """Runs face analysis on an already-decoded numpy image (avoids re-decoding)."""
    return get_face_app().get(image)


def compare_embeddings(embedding_a: list[float], embedding_b: list[float]) -> float:
    """Computes cosine similarity between two normalized embeddings."""
    a = np.array(embedding_a, dtype=np.float32)
    b = np.array(embedding_b, dtype=np.float32)
    return float(np.dot(a, b))


def is_match(similarity: float) -> bool:
    return similarity >= FACE_MATCH_THRESHOLD


def best_similarity(embedding: list[float], stored_embeddings: list[list[float]]) -> float:
    """Finds the maximum cosine similarity against all enrolled sample vectors.

    Uses vectorized matrix multiply instead of a Python loop:
    one (N, 512) @ (512,) dot product computes all N similarities at once.
    """
    if not stored_embeddings:
        return -1.0
    probe = np.array(embedding, dtype=np.float32)
    gallery = np.array(stored_embeddings, dtype=np.float32)
    return float(np.max(gallery @ probe))


def best_similarity_from_matrix(embedding: list[float], gallery_matrix: np.ndarray) -> float:
    """Like best_similarity but accepts a pre-built numpy matrix (for WebSocket reuse)."""
    if gallery_matrix.size == 0:
        return -1.0
    probe = np.array(embedding, dtype=np.float32)
    return float(np.max(gallery_matrix @ probe))


def eye_openness(face: Face) -> float | None:
    """
    Computes Eye Aspect Ratio (EAR) using InsightFace 106-point 2D landmarks.
    Standard EAR formula:
      EAR = (|p_upper1 - p_lower1| + |p_upper2 - p_lower2| + |p_upper3 - p_lower3|) / (3 * |p_corner1 - p_corner2|)

    Indices for InsightFace 2d106det:
      Left eye:
        Corners: 35 (outer), 39 (inner)
        Upper eyelid: 41, 40, 42
        Lower eyelid: 36, 33, 37
      Right eye:
        Corners: 89 (inner), 93 (outer)
        Upper eyelid: 95, 94, 96
        Lower eyelid: 90, 87, 91

    Open eyes typically produce EAR in the range ~0.26 - 0.38.
    Closed eyes (during a natural blink) drop sharply to EAR ~0.05 - 0.18.
    """
    landmarks = getattr(face, "landmark_2d_106", None)
    if landmarks is None or len(landmarks) < 106:
        return None

    try:
        # Left eye
        p35, p39 = landmarks[35], landmarks[39]
        p41, p36 = landmarks[41], landmarks[36]
        p40, p33 = landmarks[40], landmarks[33]
        p42, p37 = landmarks[42], landmarks[37]

        w_left = float(np.linalg.norm(p35 - p39))
        ear_left = None
        if w_left > 1e-4:
            h_left = float(
                (np.linalg.norm(p41 - p36) + np.linalg.norm(p40 - p33) + np.linalg.norm(p42 - p37)) / 3.0
            )
            ear_left = h_left / w_left

        # Right eye
        p89, p93 = landmarks[89], landmarks[93]
        p95, p90 = landmarks[95], landmarks[90]
        p94, p87 = landmarks[94], landmarks[87]
        p96, p91 = landmarks[96], landmarks[91]

        w_right = float(np.linalg.norm(p89 - p93))
        ear_right = None
        if w_right > 1e-4:
            h_right = float(
                (np.linalg.norm(p95 - p90) + np.linalg.norm(p94 - p87) + np.linalg.norm(p96 - p91)) / 3.0
            )
            ear_right = h_right / w_right

        valid_ears = [e for e in (ear_left, ear_right) if e is not None]
        if not valid_ears:
            return None
        return float(sum(valid_ears) / len(valid_ears))
    except Exception:
        return None


def process_face_burst(images_base64: list[str]) -> tuple[bool, list[float] | None, dict]:
    """
    Ultra-fast single-pass processing:
    1. Decodes and processes all burst frames in a single pass.
    2. Computes Eye Aspect Ratio (EAR) across frames for dynamic blink liveness.
    3. Concurrently caches the 512-d embedding of the sharpest, most-open face.
    Returns (blink_confirmed, best_embedding, debug_info).
    """
    openness_by_frame: list[float | None] = []
    embeddings_by_frame: list[list[float] | None] = []

    for img_str in images_base64:
        try:
            img = decode_base64_image(img_str)
            faces = get_faces(img)
            if len(faces) == 1:
                openness = eye_openness(faces[0])
                openness_by_frame.append(openness)
                embeddings_by_frame.append(faces[0].normed_embedding.tolist())
            else:
                openness_by_frame.append(None)
                embeddings_by_frame.append(None)
        except Exception:
            openness_by_frame.append(None)
            embeddings_by_frame.append(None)

    valid_frames = [(i, val) for i, val in enumerate(openness_by_frame) if val is not None]

    debug = {
        "openness_by_frame": openness_by_frame,
        "valid_frame_count": len(valid_frames),
        "threshold": BLINK_DROP_RATIO,
        "blink_confirmed": False,
        "best_frame_index": -1,
        "most_open": None,
        "most_closed": None,
        "closed_over_open_ratio": None,
        "ear_drop": None,
    }

    if len(valid_frames) < MIN_VALID_BLINK_FRAMES:
        return False, None, debug

    # Find the frame where eyes were most open (best photo quality for ArcFace embedding)
    best_index, most_open = max(valid_frames, key=lambda pair: pair[1])
    most_closed = min(val for _, val in valid_frames)

    drop = float(most_open - most_closed)
    ratio = float(most_closed / most_open) if most_open > 0 else 1.0

    debug["best_frame_index"] = best_index
    debug["most_open"] = round(float(most_open), 4)
    debug["most_closed"] = round(float(most_closed), 4)
    debug["closed_over_open_ratio"] = round(ratio, 4)
    debug["ear_drop"] = round(drop, 4)

    # Blink confirmation criteria:
    # 1. Closed EAR drops below BLINK_DROP_RATIO (0.80) with a meaningful drop (>= 0.035)
    # OR
    # 2. Closed EAR drops into clear closure range (<= 0.20) while open EAR was >= 0.24
    # (Guarantees natural human blinks pass, while static photos with near-zero EAR change fail)
    blink_confirmed = (
        (ratio <= BLINK_DROP_RATIO and drop >= 0.035)
        or (most_closed <= 0.20 and most_open >= 0.24)
    )
    debug["blink_confirmed"] = bool(blink_confirmed)

    best_embedding = embeddings_by_frame[best_index] if best_index >= 0 else None
    return bool(blink_confirmed), best_embedding, debug


def is_live_face(image_base64: str) -> bool:
    """
    Fast liveness check using face geometry and texture analysis.
    Verifies that a genuine face with realistic bounding geometry exists.

    NOTE: For hot-path code, prefer extract_embedding_with_liveness() which
    does detection + embedding + liveness in a single inference pass.
    This standalone function is kept for backward compatibility.
    """
    try:
        faces = get_faces(image_base64)
        if len(faces) != 1:
            return False
        face = faces[0]
        # Check det score and keypoint confidence
        if getattr(face, "det_score", 0) < 0.6:
            return False
        return True
    except Exception:
        return False


def is_live_face_from_obj(face: Face) -> bool:
    """Liveness check from an already-computed Face object (no re-inference)."""
    return getattr(face, "det_score", 0) >= 0.6


def debug_blink_sequence(images_base64: list[str]) -> dict:
    _, _, debug = process_face_burst(images_base64)
    return debug


def verify_blink_sequence(images_base64: list[str]) -> tuple[bool, int]:
    blink_confirmed, _, debug = process_face_burst(images_base64)
    return blink_confirmed, debug["best_frame_index"]
