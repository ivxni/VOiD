"""
VOiD Backend — Model-Guided Adversarial Face Cloaking Engine

Pipeline:
  1. Fix EXIF orientation (critical for phone photos)
  2. Detect faces via OpenCV DNN SSD detector (fallback: Haar cascades)
  3. Extract face embeddings via SFace recognition model (OpenCV)
  4. Generate adversarial perturbation using constrained SPSA:
     - Smooth random probe directions (not Bernoulli ±1)
     - Gradient transformed for imperceptibility:
       · Gaussian smooth (σ=4.0) → broad spatial patterns
       · Edge-adaptive masking (floor=0.20) → minimal noise on skin
       · Luminance suppression (55%) → colour shifts preferred
     - Final full-resolution smooth after upscale
     → Perturbation is nearly invisible yet disrupts FR models
  5. Apply perturbation with smooth feathered blending
  6. Generate AI-analysis visualization with embedding distance metrics

Strength mapping:
  subtle   → eps=6/255,  steps=40,  samples=4  (~320 evals)
  standard → eps=12/255, steps=60,  samples=6  (~720 evals)
  maximum  → eps=24/255, steps=100, samples=8  (~1600 evals)

Fallback: If SFace model is unavailable, uses untargeted smooth noise.
"""

import io
import os
import time
import logging
import urllib.request
from typing import Literal

import cv2
import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("void.ml")

# ─── Strength Presets ─────────────────────────────────────────────────────────
# (epsilon, spsa_steps, spsa_samples_per_step)
# Higher epsilon is safe because gradient-smoothing (σ=4.0) converts
# pixel changes into broad colour gradients that are visually invisible
# even at larger magnitudes.
STRENGTH_PRESETS = {
    "subtle":   (6.0 / 255.0,   40, 4),
    "standard": (12.0 / 255.0,  60, 6),
    "maximum":  (24.0 / 255.0, 100, 8),
}

CloakStrength = Literal["subtle", "standard", "maximum"]

# ─── Model Paths & URLs ──────────────────────────────────────────────────────

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# DNN SSD Face Detector
PROTOTXT_URL = (
    "https://raw.githubusercontent.com/opencv/opencv/master/"
    "samples/dnn/face_detector/deploy.prototxt"
)
CAFFEMODEL_URL = (
    "https://raw.githubusercontent.com/opencv/opencv_3rdparty/"
    "dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
)

# SFace Recognition Model (~37 MB ONNX)
SFACE_URLS = [
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_recognition_sface/face_recognition_sface_2021dec.onnx",
]
SFACE_FILENAME = "face_recognition_sface_2021dec.onnx"
SFACE_INPUT_SIZE = 112  # Model expects 112x112
# ─── Imperceptibility — Gradient Transformation Parameters ────────────────────
# Applied to the SPSA gradient BEFORE each update step to steer the
# optimisation toward perturbations that are effective AND invisible.
#
# Key: sigma=4.0 at 112px ≈ 3.5% of face width → very broad colour gradients
# instead of pixel-level noise.  EDGE_FLOOR near zero means smooth skin gets
# almost no perturbation; all signal is pushed into hair / eyebrows / eyes.
GRAD_SMOOTH_SIGMA = 4.0     # Strong gradient smooth → broad spatial patterns
LUMINANCE_SUPPRESS = 0.55   # Remove 55% of brightness noise → colour shifts
EDGE_FLOOR = 0.20           # Allow some signal on smooth skin for FR disruption
DELTA_SMOOTH_SIGMA = 3.5    # Smooth SPSA probe vectors (kills HF gradient est.)
FINAL_SMOOTH_RATIO = 80.0   # Full-res sigma = max(2.0, width / this)
_LUM_R, _LUM_G, _LUM_B = 0.299, 0.587, 0.114

# ─── Singleton Model Instances ────────────────────────────────────────────────

_dnn_net = None
_dnn_available = None

_recognizer = None
_recognizer_available = None

_cascade_default = None
_cascade_alt = None
_cascade_profile = None


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 1 — DNN Face Detector
# ══════════════════════════════════════════════════════════════════════════════


def _ensure_dnn_model():
    """Download DNN face detector model files if not present."""
    global _dnn_net, _dnn_available

    if _dnn_available is not None:
        return _dnn_available

    os.makedirs(MODEL_DIR, exist_ok=True)
    prototxt_path = os.path.join(MODEL_DIR, "deploy.prototxt")
    caffemodel_path = os.path.join(
        MODEL_DIR, "res10_300x300_ssd_iter_140000.caffemodel"
    )

    try:
        if not os.path.exists(prototxt_path):
            logger.info("Downloading DNN face detector prototxt...")
            urllib.request.urlretrieve(PROTOTXT_URL, prototxt_path)

        if not os.path.exists(caffemodel_path):
            logger.info("Downloading DNN face detector caffemodel (10MB)...")
            urllib.request.urlretrieve(CAFFEMODEL_URL, caffemodel_path)

        _dnn_net = cv2.dnn.readNetFromCaffe(prototxt_path, caffemodel_path)
        _dnn_available = True
        logger.info("DNN face detector loaded successfully")
    except Exception as e:
        logger.warning(
            f"DNN face detector not available, falling back to Haar: {e}"
        )
        _dnn_available = False

    return _dnn_available


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 2 — SFace Recognition Model
# ══════════════════════════════════════════════════════════════════════════════


def _ensure_recognizer():
    """Download and load SFace recognition model for embedding extraction."""
    global _recognizer, _recognizer_available

    if _recognizer_available is not None:
        return _recognizer_available

    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, SFACE_FILENAME)

    try:
        if not os.path.exists(model_path):
            logger.info("Downloading SFace recognition model (~37 MB)...")
            downloaded = False
            for url in SFACE_URLS:
                try:
                    urllib.request.urlretrieve(url, model_path)
                    fsize = os.path.getsize(model_path)
                    if fsize < 1_000_000:  # Git LFS pointer — not the real file
                        logger.warning(
                            f"Download from {url} too small "
                            f"({fsize} bytes), trying next URL..."
                        )
                        os.remove(model_path)
                        continue
                    downloaded = True
                    logger.info(
                        f"SFace model downloaded: "
                        f"{fsize / 1024 / 1024:.1f} MB"
                    )
                    break
                except Exception as dl_err:
                    logger.warning(f"Download failed from {url}: {dl_err}")
                    if os.path.exists(model_path):
                        os.remove(model_path)

            if not downloaded:
                raise RuntimeError(
                    "Could not download SFace model from any source"
                )

        _recognizer = cv2.FaceRecognizerSF.create(model_path, "")
        _recognizer_available = True
        logger.info("SFace face recognizer loaded — model-guided cloaking active")
    except Exception as e:
        logger.warning(f"SFace recognizer not available: {e}")
        logger.warning("Using untargeted perturbation (less effective)")
        _recognizer_available = False

    return _recognizer_available


def _get_embedding(face_bgr_112: np.ndarray) -> np.ndarray | None:
    """
    Extract 128-d face embedding from a 112x112 BGR uint8 image.
    Returns flattened (128,) float32 array, or None on failure.
    """
    if _recognizer is None:
        return None
    try:
        emb = _recognizer.feature(face_bgr_112)  # shape (1, 128)
        return emb.flatten().astype(np.float64)
    except Exception as e:
        logger.debug(f"Embedding extraction failed: {e}")
        return None


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity ∈ [-1, 1]."""
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na < 1e-8 or nb < 1e-8:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine distance = 1 − similarity.  Higher = more different."""
    return 1.0 - _cosine_similarity(a, b)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 3 — Haar Cascade Fallback
# ══════════════════════════════════════════════════════════════════════════════


def _get_cascades():
    """Lazy-load all OpenCV Haar Cascade classifiers."""
    global _cascade_default, _cascade_alt, _cascade_profile
    if _cascade_default is None:
        _cascade_default = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        _cascade_alt = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        )
        _cascade_profile = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )
        logger.info("Loaded 3 Haar Cascade face detectors (fallback)")
    return _cascade_default, _cascade_alt, _cascade_profile


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 — Face Detection
# ══════════════════════════════════════════════════════════════════════════════


def _detect_faces_dnn(
    img_bgr: np.ndarray, confidence_threshold: float = 0.5
) -> list[dict]:
    """
    Detect faces using OpenCV DNN SSD detector.
    Robust to angles, lighting, partial occlusion.
    """
    global _dnn_net
    h, w = img_bgr.shape[:2]

    blob = cv2.dnn.blobFromImage(
        img_bgr, 1.0, (300, 300),
        (104.0, 177.0, 123.0), swapRB=False, crop=False,
    )
    _dnn_net.setInput(blob)
    detections = _dnn_net.forward()

    faces = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence < confidence_threshold:
            continue

        box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
        x1, y1, x2, y2 = box.astype(int)

        # 25% padding each side
        bw, bh = x2 - x1, y2 - y1
        pad_x, pad_y = int(bw * 0.25), int(bh * 0.25)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)

        faces.append({
            "bbox": np.array([x1, y1, x2, y2]),
            "confidence": float(confidence),
        })

    logger.info(
        f"DNN detected {len(faces)} face(s) in {w}x{h} image "
        f"(threshold={confidence_threshold})"
    )
    return faces


def _detect_faces_haar(img_bgr: np.ndarray) -> list[dict]:
    """Haar cascade fallback — runs ALL cascades and combines via NMS."""
    cascade_default, cascade_alt, cascade_profile = _get_cascades()
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    eq = cv2.equalizeHist(gray)

    all_rects = []
    for cascade, params in [
        (cascade_default, {"scaleFactor": 1.1,  "minNeighbors": 4, "minSize": (30, 30)}),
        (cascade_default, {"scaleFactor": 1.05, "minNeighbors": 3, "minSize": (20, 20)}),
        (cascade_alt,     {"scaleFactor": 1.05, "minNeighbors": 3, "minSize": (20, 20)}),
        (cascade_alt,     {"scaleFactor": 1.03, "minNeighbors": 2, "minSize": (15, 15)}),
        (cascade_profile, {"scaleFactor": 1.1,  "minNeighbors": 3, "minSize": (30, 30)}),
    ]:
        rects = cascade.detectMultiScale(eq, **params)
        if len(rects) > 0:
            all_rects.extend(rects.tolist())

    # Flipped for right-looking profiles
    flipped = cv2.flip(eq, 1)
    rects = cascade_profile.detectMultiScale(
        flipped, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30),
    )
    if len(rects) > 0:
        all_rects.extend(
            [(w - x - fw, y, fw, fh) for (x, y, fw, fh) in rects.tolist()]
        )

    if not all_rects:
        return []

    faces = []
    for rx, ry, rw, rh in all_rects:
        pad_x, pad_y = int(rw * 0.25), int(rh * 0.25)
        faces.append({
            "bbox": np.array([
                max(0, rx - pad_x),
                max(0, ry - pad_y),
                min(w, rx + rw + pad_x),
                min(h, ry + rh + pad_y),
            ])
        })

    faces = _nms(faces, iou_threshold=0.35)
    logger.info(f"Haar detected {len(faces)} face(s) in {w}x{h} image (after NMS)")
    return faces


def _compute_iou(box1: np.ndarray, box2: np.ndarray) -> float:
    """IoU between two [x1,y1,x2,y2] boxes."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    a1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    a2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


def _nms(faces: list[dict], iou_threshold: float = 0.35) -> list[dict]:
    """Non-Maximum Suppression."""
    if len(faces) <= 1:
        return faces
    faces = sorted(
        faces,
        key=lambda f: (
            (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][3] - f["bbox"][1])
        ),
        reverse=True,
    )
    keep: list[dict] = []
    for face in faces:
        if all(
            _compute_iou(face["bbox"], k["bbox"]) < iou_threshold
            for k in keep
        ):
            keep.append(face)
    return keep


def _detect_faces(img_bgr: np.ndarray) -> list[dict]:
    """
    Detect faces — DNN first (robust), Haar fallback.
    Returns list of dicts with 'bbox' key: [x1, y1, x2, y2].
    """
    if _ensure_dnn_model():
        faces = _detect_faces_dnn(img_bgr)
        if faces:
            return faces
        faces = _detect_faces_dnn(img_bgr, confidence_threshold=0.3)
        if faces:
            return faces
        logger.info("DNN found no faces, trying Haar fallback...")

    return _detect_faces_haar(img_bgr)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 5 — Perturbation Generation
# ══════════════════════════════════════════════════════════════════════════════


def _face_to_bgr_112(face_rgb_float: np.ndarray) -> np.ndarray:
    """Convert [0..1] RGB float face crop -> 112x112 BGR uint8 for SFace."""
    bgr = cv2.cvtColor(
        (np.clip(face_rgb_float, 0, 1) * 255).astype(np.uint8),
        cv2.COLOR_RGB2BGR,
    )
    return cv2.resize(
        bgr, (SFACE_INPUT_SIZE, SFACE_INPUT_SIZE),
        interpolation=cv2.INTER_AREA,
    )


def _model_guided_perturbation(
    face_rgb_float: np.ndarray,
    epsilon: float,
    steps: int,
    n_spsa_samples: int,
) -> tuple[np.ndarray, float]:
    """
    Adversarial perturbation using SPSA with smooth-projection
    targeting SFace embedding space.

    Key insight for IMPERCEPTIBILITY:
      After each optimisation step, the perturbation is Gaussian-
      blurred (sigma=5 at 112x112) to remove high-frequency pixel
      noise.  This produces broad, smooth colour shifts that are
      nearly invisible on skin while still disrupting FR embeddings.

    Algorithm per step
    ------------------
    1. Draw Bernoulli ±1 direction at 112x112
    2. Two-sided SPSA gradient estimate
    3. FGSM sign-update
    4. *Smooth projection*: Gaussian blur entire perturbation
    5. Re-normalise to fill epsilon-ball, clip

    Returns (perturbation_at_original_size, final_cosine_distance)
    """
    h, w, c = face_rgb_float.shape
    S = SFACE_INPUT_SIZE  # 112

    # ── Original embedding ──
    orig_112 = _face_to_bgr_112(face_rgb_float)
    orig_emb = _get_embedding(orig_112)
    if orig_emb is None:
        logger.warning("No embedding — falling back to untargeted")
        return _untargeted_perturbation(face_rgb_float, epsilon, steps), 0.0

    # ── Face at model resolution ──
    face_112 = cv2.resize(
        face_rgb_float, (S, S), interpolation=cv2.INTER_AREA,
    ).astype(np.float64)

    pert = np.zeros((S, S, c), dtype=np.float64)

    # SPSA hyper-parameters — slightly higher LR to compensate
    # for gradient transformations reducing effective magnitude
    probe_c = max(4.0 / 255.0, epsilon * 0.30)
    step_lr = epsilon * 2.0 / np.sqrt(max(steps, 1))

    # ── Pre-compute edge-adaptive weight map ──
    # Concentrate perturbation in textured areas (hair, eyebrows, eyes)
    # where noise is invisible; almost zero on smooth skin.
    face_gray = cv2.cvtColor(
        (face_112 * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY,
    )
    sx = cv2.Sobel(face_gray, cv2.CV_64F, 1, 0, ksize=3)
    sy = cv2.Sobel(face_gray, cv2.CV_64F, 0, 1, ksize=3)
    edges = np.sqrt(sx ** 2 + sy ** 2)
    emx = edges.max()
    if emx > 0:
        edges /= emx
    edges = cv2.GaussianBlur(edges, (0, 0), sigmaX=5.0)
    emx2 = edges.max()
    if emx2 > 0:
        edges /= emx2
    edge_w = EDGE_FLOOR + (1.0 - EDGE_FLOOR) * edges  # [0.08 .. 1.0]

    best_dist = 0.0

    for k in range(steps):
        grad_acc = np.zeros((S, S, c), dtype=np.float64)
        n_valid = 0

        for _ in range(n_spsa_samples):
            # ── Smooth probe directions ──
            # Instead of raw Bernoulli ±1 (maximally HF), generate smooth
            # random directions.  This biases the gradient estimate toward
            # low-frequency components → perturbation is inherently smooth.
            raw_delta = np.random.randn(S, S, c)
            for ch in range(c):
                raw_delta[:, :, ch] = cv2.GaussianBlur(
                    raw_delta[:, :, ch], (0, 0),
                    sigmaX=DELTA_SMOOTH_SIGMA,
                )
            delta = np.sign(raw_delta)

            plus_img = np.clip(
                face_112 + pert + probe_c * delta, 0.0, 1.0,
            )
            minus_img = np.clip(
                face_112 + pert - probe_c * delta, 0.0, 1.0,
            )

            plus_bgr = cv2.cvtColor(
                (plus_img * 255).astype(np.uint8), cv2.COLOR_RGB2BGR,
            )
            minus_bgr = cv2.cvtColor(
                (minus_img * 255).astype(np.uint8), cv2.COLOR_RGB2BGR,
            )

            emb_p = _get_embedding(plus_bgr)
            emb_m = _get_embedding(minus_bgr)
            if emb_p is None or emb_m is None:
                continue

            sim_p = _cosine_similarity(orig_emb, emb_p)
            sim_m = _cosine_similarity(orig_emb, emb_m)

            grad_acc += (sim_p - sim_m) * delta / (2.0 * probe_c)
            n_valid += 1

        if n_valid == 0:
            continue

        gradient = grad_acc / n_valid

        # ── GRADIENT TRANSFORMATION (imperceptibility constraints) ──
        # Transform the gradient BEFORE each step so the optimiser
        # naturally finds perturbations that are both effective AND
        # visually imperceptible.

        # 1. Strong smooth — broad colour gradients instead of pixel noise
        for ch in range(c):
            gradient[:, :, ch] = cv2.GaussianBlur(
                gradient[:, :, ch], (0, 0), sigmaX=GRAD_SMOOTH_SIGMA,
            )

        # 2. Edge-adaptive weighting — push changes into textured areas
        #    (hair, eyebrows, eyes); almost zero on smooth skin
        for ch in range(c):
            gradient[:, :, ch] *= edge_w

        # 3. Luminance suppression — prefer colour shifts over brightness
        lum_g = (
            _LUM_R * gradient[:, :, 0]
            + _LUM_G * gradient[:, :, 1]
            + _LUM_B * gradient[:, :, 2]
        )
        for ch in range(c):
            gradient[:, :, ch] -= LUMINANCE_SUPPRESS * lum_g

        # FGSM sign update with transformed gradient
        pert -= step_lr * np.sign(gradient)
        pert = np.clip(pert, -epsilon, epsilon)

        # ── Progress log ──
        if (k + 1) % max(1, steps // 4) == 0:
            chk = np.clip(face_112 + pert, 0.0, 1.0)
            chk_bgr = cv2.cvtColor(
                (chk * 255).astype(np.uint8), cv2.COLOR_RGB2BGR,
            )
            chk_emb = _get_embedding(chk_bgr)
            if chk_emb is not None:
                d = _cosine_distance(orig_emb, chk_emb)
                best_dist = max(best_dist, d)
                logger.info(
                    f"  SPSA step {k+1}/{steps}: "
                    f"dist={d:.4f} (best={best_dist:.4f})"
                )

    # ── Final measurement ──
    final = np.clip(face_112 + pert, 0.0, 1.0)
    final_bgr = cv2.cvtColor(
        (final * 255).astype(np.uint8), cv2.COLOR_RGB2BGR,
    )
    final_emb = _get_embedding(final_bgr)
    if final_emb is not None:
        best_dist = _cosine_distance(orig_emb, final_emb)

    # ── Upscale to original crop (bilinear = smooth) ──
    if (h, w) != (S, S):
        pert_full = cv2.resize(
            pert, (w, h), interpolation=cv2.INTER_LINEAR,
        )
    else:
        pert_full = pert.copy()

    # ── Final full-resolution smooth ──
    # Clean up any remaining high-frequency artifacts from upscaling.
    final_sigma = max(2.0, w / FINAL_SMOOTH_RATIO)
    for ch in range(c):
        pert_full[:, :, ch] = cv2.GaussianBlur(
            pert_full[:, :, ch], (0, 0), sigmaX=final_sigma,
        )
    pert_full = np.clip(pert_full, -epsilon, epsilon)

    logger.info(
        f"SPSA done — dist={best_dist:.4f} "
        f"({steps}x{n_spsa_samples} = "
        f"{steps * n_spsa_samples * 2} evals), "
        f"final_smooth_sigma={final_sigma:.1f}"
    )
    return pert_full, best_dist


def _untargeted_perturbation(
    face_region: np.ndarray,
    epsilon: float,
    steps: int,
) -> np.ndarray:
    """
    Fallback: untargeted structured noise when no recognition model
    is available.  Applies smooth Gaussian noise patterns.
    """
    h, w, c = face_region.shape
    step_size = epsilon * 1.2 / max(steps, 1)
    pert = np.zeros_like(face_region, dtype=np.float64)
    for _ in range(steps):
        noise = np.random.randn(h, w, c).astype(np.float64)
        sigma = max(1.5, min(h, w) / 20.0)
        for ch in range(c):
            noise[:, :, ch] = cv2.GaussianBlur(
                noise[:, :, ch], (0, 0), sigmaX=sigma,
            )
        norm = np.linalg.norm(noise)
        if norm > 1e-8:
            noise /= norm
        pert += step_size * noise
        pert = np.clip(pert, -epsilon, epsilon)
    return pert


def _create_smooth_mask(
    bbox: np.ndarray, img_shape: tuple, feather_px: int = 20,
) -> np.ndarray:
    """Feathered mask for seamless perturbation blending."""
    h, w = img_shape[:2]
    mask = np.zeros((h, w), dtype=np.float64)
    x1, y1, x2, y2 = [max(0, int(v)) for v in bbox]
    x2, y2 = min(w, x2), min(h, y2)
    mask[y1:y2, x1:x2] = 1.0
    if feather_px > 0:
        ksize = feather_px * 2 + 1
        mask = cv2.GaussianBlur(mask, (ksize, ksize), feather_px / 2)
    return mask


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 6 — AI Analysis Visualisation
# ══════════════════════════════════════════════════════════════════════════════


def generate_analysis(
    original_np: np.ndarray,
    cloaked_np: np.ndarray,
    faces: list[dict],
    embedding_distances: list[float] | None = None,
) -> bytes:
    """
    'AI view' visualisation showing how cloaking disrupts facial
    recognition.  Includes per-face embedding distance when available.
    """
    h, w = original_np.shape[:2]
    cloak_u8 = (np.clip(cloaked_np, 0, 1) * 255).astype(np.uint8)

    # ── 1. Perturbation heat-map ──
    diff = np.abs(
        cloaked_np.astype(np.float64) - original_np.astype(np.float64)
    )
    diff_gray = np.mean(np.clip(diff * 50.0, 0, 1), axis=2)
    diff_heat = cv2.applyColorMap(
        (diff_gray * 255).astype(np.uint8), cv2.COLORMAP_INFERNO,
    )
    diff_heat = cv2.cvtColor(diff_heat, cv2.COLOR_BGR2RGB)

    # ── 2. Edge detection on cloaked image ──
    cloak_gray = cv2.cvtColor(cloak_u8, cv2.COLOR_RGB2GRAY)
    sx = cv2.Sobel(cloak_gray, cv2.CV_64F, 1, 0, ksize=3)
    sy = cv2.Sobel(cloak_gray, cv2.CV_64F, 0, 1, ksize=3)
    edges = np.sqrt(sx ** 2 + sy ** 2)
    edges = np.clip(edges / edges.max(), 0, 1) if edges.max() > 0 else edges

    # ── 3. Composite ──
    canvas = np.zeros((h, w, 3), dtype=np.uint8)
    edge_rgb = np.stack([
        (edges * 10).astype(np.uint8),
        (edges * 200).astype(np.uint8),
        (edges * 130).astype(np.uint8),
    ], axis=2)
    canvas = cv2.addWeighted(canvas, 1.0, edge_rgb, 0.7, 0)
    canvas = cv2.addWeighted(canvas, 1.0, diff_heat, 0.5, 0)

    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = max(0.4, w / 1200)

    # ── 4. Face boxes + per-face embedding labels ──
    for i, face in enumerate(faces):
        x1, y1, x2, y2 = face["bbox"].astype(int)
        cv2.rectangle(canvas, (x1, y1), (x2, y2), (0, 255, 148), 2)
        cv2.rectangle(
            canvas,
            (max(0, x1 - 2), max(0, y1 - 2)),
            (min(w - 1, x2 + 2), min(h - 1, y2 + 2)),
            (0, 180, 100), 1,
        )

        if embedding_distances and i < len(embedding_distances):
            dist = embedding_distances[i]
            if dist >= 0.40:
                color, label = (0, 255, 100), f"DISRUPTED {dist:.0%}"
            elif dist >= 0.20:
                color, label = (255, 200, 0), f"PARTIAL {dist:.0%}"
            elif dist > 0:
                color, label = (255, 80, 80), f"WEAK {dist:.0%}"
            else:
                color, label = (180, 180, 180), "N/A"

            cv2.putText(
                canvas, label, (x1, max(y1 - 8, 15)),
                font, scale * 0.65, color, 1, cv2.LINE_AA,
            )

    # ── 5. Scan lines ──
    for row in range(0, h, 3):
        canvas[row] = (canvas[row].astype(np.float64) * 0.8).astype(np.uint8)

    # ── 6. Header text ──
    y_txt = int(28 * scale + 10)
    cv2.putText(
        canvas, "AI FEATURE ANALYSIS", (12, y_txt),
        font, scale, (0, 255, 148), 1, cv2.LINE_AA,
    )

    avg_dist = 0.0
    if embedding_distances:
        valid = [d for d in embedding_distances if d > 0]
        avg_dist = sum(valid) / len(valid) if valid else 0.0

    if avg_dist >= 0.30:
        status, s_col = "IDENTITY DISRUPTED", (0, 255, 100)
    elif avg_dist >= 0.15:
        status, s_col = "PARTIALLY DISRUPTED", (255, 200, 0)
    elif avg_dist > 0:
        status, s_col = "PERTURBATION APPLIED", (255, 120, 50)
    else:
        status, s_col = "PERTURBATION DETECTED", (255, 120, 50)

    cv2.putText(
        canvas, status, (12, int(y_txt + 22 * scale)),
        font, scale * 0.7, s_col, 1, cv2.LINE_AA,
    )
    if avg_dist > 0:
        cv2.putText(
            canvas,
            f"Embedding Shift: {avg_dist:.1%}",
            (12, int(y_txt + 42 * scale)),
            font, scale * 0.55, (180, 180, 180), 1, cv2.LINE_AA,
        )

    out = Image.fromarray(canvas, "RGB")
    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 7 — Main Cloaking Pipeline
# ══════════════════════════════════════════════════════════════════════════════


def cloak_image(
    image_bytes: bytes,
    strength: CloakStrength = "standard",
    output_format: str = "JPEG",
    output_quality: int = 95,
) -> tuple[bytes, dict, bytes | None]:
    """
    Apply adversarial cloaking to all faces in an image.

    Returns
    -------
    (cloaked_image_bytes, metadata_dict, analysis_image_bytes | None)
    """
    t0 = time.time()

    # ── Decode + fix EXIF orientation ──
    img_pil = Image.open(io.BytesIO(image_bytes))
    img_pil = ImageOps.exif_transpose(img_pil)

    if img_pil.mode == "RGBA":
        bg = Image.new("RGB", img_pil.size, (0, 0, 0))
        bg.paste(img_pil, mask=img_pil.split()[3])
        img_pil = bg
    elif img_pil.mode != "RGB":
        img_pil = img_pil.convert("RGB")

    img_np = np.array(img_pil, dtype=np.float64) / 255.0
    img_bgr = cv2.cvtColor(
        (img_np * 255).astype(np.uint8), cv2.COLOR_RGB2BGR,
    )

    logger.info(
        f"Image loaded: {img_pil.width}x{img_pil.height}, "
        f"mode={img_pil.mode}"
    )

    # ── Detect faces ──
    faces = _detect_faces(img_bgr)
    num_faces = len(faces)

    if num_faces == 0:
        logger.info("No faces detected")
        buf = io.BytesIO()
        img_pil.save(buf, format=output_format, quality=output_quality)
        return buf.getvalue(), {
            "faces_detected": 0,
            "faces_cloaked": 0,
            "strength": strength,
            "width": img_pil.width,
            "height": img_pil.height,
            "model_guided": False,
            "embedding_distances": [],
            "avg_embedding_distance": 0.0,
            "processing_time_seconds": round(time.time() - t0, 2),
        }, None

    # ── Load recognition model ──
    model_ok = _ensure_recognizer()
    logger.info(
        f"Recognition model: {'SFace (model-guided)' if model_ok else 'unavailable (untargeted)'}"
    )

    # ── Strength parameters ──
    epsilon, steps, n_spsa = STRENGTH_PRESETS[strength]

    # ── Process each face ──
    result = img_np.copy()
    faces_cloaked = 0
    emb_dists: list[float] = []

    for face in faces:
        bbox = face["bbox"]
        x1, y1, x2, y2 = (
            max(0, int(bbox[0])),
            max(0, int(bbox[1])),
            min(img_np.shape[1], int(bbox[2])),
            min(img_np.shape[0], int(bbox[3])),
        )
        fw, fh = x2 - x1, y2 - y1
        if fw < 10 or fh < 10:
            logger.warning(f"Skipping tiny face: {fw}x{fh}")
            emb_dists.append(0.0)
            continue

        face_crop = img_np[y1:y2, x1:x2].copy()
        logger.info(
            f"Processing face {faces_cloaked+1}/{num_faces}: "
            f"{fw}x{fh} @ [{x1},{y1},{x2},{y2}]"
        )

        # ── Generate perturbation ──
        if model_ok:
            perturbation, edist = _model_guided_perturbation(
                face_crop, epsilon, steps, n_spsa,
            )
        else:
            perturbation = _untargeted_perturbation(
                face_crop, epsilon, steps,
            )
            edist = 0.0
        emb_dists.append(edist)

        # ── Blending mask ──
        feather = max(5, min(fh, fw) // 8)
        mask = _create_smooth_mask(
            np.array([x1, y1, x2, y2]), img_np.shape, feather_px=feather,
        )

        # ── Apply perturbation ──
        for ch in range(3):
            result[y1:y2, x1:x2, ch] = np.clip(
                result[y1:y2, x1:x2, ch]
                + perturbation[:, :, min(ch, perturbation.shape[2] - 1)],
                0.0, 1.0,
            )

        # ── Smooth edge transition ──
        for ch in range(3):
            result[:, :, ch] = (
                img_np[:, :, ch] * (1.0 - mask)
                + result[:, :, ch] * mask
            )

        faces_cloaked += 1
        logger.info(
            f"Cloaked face {faces_cloaked}/{num_faces} — "
            f"emb_dist={edist:.4f}, "
            f"conf={face.get('confidence', 'N/A')}"
        )

    # ── Aggregate metrics ──
    valid_dists = [d for d in emb_dists if d > 0]
    avg_dist = sum(valid_dists) / len(valid_dists) if valid_dists else 0.0

    # ── AI analysis visualisation ──
    analysis_bytes = None
    try:
        analysis_bytes = generate_analysis(
            img_np, result, faces, emb_dists,
        )
        logger.info(f"AI analysis generated: {len(analysis_bytes)} bytes")
    except Exception as e:
        logger.warning(f"Analysis generation failed (non-fatal): {e}")

    # ── Encode cloaked image ──
    out_u8 = (np.clip(result, 0, 1) * 255).astype(np.uint8)
    out_pil = Image.fromarray(out_u8, "RGB")
    buf = io.BytesIO()
    out_pil.save(buf, format=output_format, quality=output_quality)

    elapsed = time.time() - t0
    metadata = {
        "faces_detected": num_faces,
        "faces_cloaked": faces_cloaked,
        "strength": strength,
        "epsilon": epsilon,
        "pgd_steps": steps,
        "width": img_pil.width,
        "height": img_pil.height,
        "model_guided": model_ok,
        "embedding_distances": emb_dists,
        "avg_embedding_distance": round(avg_dist, 4),
        "processing_time_seconds": round(elapsed, 2),
    }

    logger.info(
        f"Cloaking complete — {faces_cloaked}/{num_faces} faces, "
        f"strength={strength}, guided={model_ok}, "
        f"avg_dist={avg_dist:.4f}, time={elapsed:.1f}s"
    )
    return buf.getvalue(), metadata, analysis_bytes
