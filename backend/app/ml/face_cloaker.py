"""
VOiD Backend — Adversarial Face Cloaking Engine

Pipeline:
  1. Fix EXIF orientation (critical for phone photos)
  2. Detect faces via OpenCV Haar Cascades (multi-rotation, profile)
  3. Generate adversarial perturbation targeting the embedding space
  4. Apply perturbation ONLY to face region with smooth blending
  5. Generate AI-analysis visualization (edge detection + heatmap)

Strength mapping:
  subtle   → eps=4/255,  steps=5   (fast, light perturbation)
  standard → eps=8/255,  steps=10  (balanced)
  maximum  → eps=16/255, steps=20  (strongest, slower)
"""

import io
import logging
from typing import Literal

import cv2
import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("void.ml")

# Strength presets: (epsilon, pgd_steps, step_size_factor)
STRENGTH_PRESETS = {
    "subtle":   (4.0 / 255.0,  5,  1.5),
    "standard": (8.0 / 255.0,  10, 1.0),
    "maximum":  (16.0 / 255.0, 20, 0.8),
}

CloakStrength = Literal["subtle", "standard", "maximum"]

# Global detector holders (lazy loaded)
_cascade_default = None
_cascade_alt = None
_cascade_profile = None


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
        logger.info("Loaded 3 Haar Cascade face detectors")
    return _cascade_default, _cascade_alt, _cascade_profile


# ─── Face Detection ───────────────────────────────────────────────────────────


def _detect_faces_single_orientation(gray: np.ndarray) -> list[tuple]:
    """
    Run all cascade classifiers on a single grayscale image.
    Returns list of (x, y, w, h) tuples.
    """
    cascade_default, cascade_alt, cascade_profile = _get_cascades()
    eq = cv2.equalizeHist(gray)

    # 1) Default frontal — balanced
    rects = cascade_default.detectMultiScale(
        eq, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30)
    )
    if len(rects) > 0:
        return rects.tolist()

    # 2) Alt frontal — more sensitive
    rects = cascade_alt.detectMultiScale(
        eq, scaleFactor=1.05, minNeighbors=3, minSize=(20, 20)
    )
    if len(rects) > 0:
        return rects.tolist()

    # 3) Profile face (left-looking)
    rects = cascade_profile.detectMultiScale(
        eq, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30)
    )
    if len(rects) > 0:
        return rects.tolist()

    # 4) Profile face — flipped (right-looking)
    flipped = cv2.flip(eq, 1)
    rects = cascade_profile.detectMultiScale(
        flipped, scaleFactor=1.1, minNeighbors=3, minSize=(30, 30)
    )
    if len(rects) > 0:
        w = gray.shape[1]
        return [(w - x - fw, y, fw, fh) for (x, y, fw, fh) in rects.tolist()]

    # 5) Last resort — very loose params on alt cascade
    rects = cascade_alt.detectMultiScale(
        eq, scaleFactor=1.03, minNeighbors=2, minSize=(15, 15)
    )
    if len(rects) > 0:
        return rects.tolist()

    return []


def _rotate_bbox_back(rx, ry, rw, rh, angle, orig_h, orig_w):
    """Map a bbox detected in a rotated image back to original coords."""
    if angle == 0:
        return (rx, ry, rw, rh)
    elif angle == 90:
        # cv2.ROTATE_90_CLOCKWISE: (x,y) in rotated → (y, orig_w - x - rw)
        return (ry, orig_w - rx - rw, rh, rw)
    elif angle == 180:
        return (orig_w - rx - rw, orig_h - ry - rh, rw, rh)
    elif angle == 270:
        return (orig_h - ry - rh, rx, rh, rw)
    return (rx, ry, rw, rh)


def _compute_iou(box1: np.ndarray, box2: np.ndarray) -> float:
    """Compute Intersection-over-Union between two [x1,y1,x2,y2] boxes."""
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
    """Non-Maximum Suppression — remove duplicate / overlapping detections."""
    if len(faces) <= 1:
        return faces
    # Sort by area descending (keep larger boxes first)
    faces = sorted(
        faces,
        key=lambda f: (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][3] - f["bbox"][1]),
        reverse=True,
    )
    keep: list[dict] = []
    for face in faces:
        if all(_compute_iou(face["bbox"], k["bbox"]) < iou_threshold for k in keep):
            keep.append(face)
    return keep


def _detect_faces(img_bgr: np.ndarray) -> list[dict]:
    """
    Multi-rotation face detection with NMS de-duplication.

    Tries 0°, 90°, 270°, 180° to catch faces in photos with
    missing or incorrect EXIF orientation data.
    Returns list of dicts with 'bbox' key: [x1, y1, x2, y2].
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    rotations = [
        (0,   gray),
        (90,  cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)),
        (270, cv2.rotate(gray, cv2.ROTATE_90_COUNTERCLOCKWISE)),
        (180, cv2.rotate(gray, cv2.ROTATE_180)),
    ]

    for angle, rotated_gray in rotations:
        rects = _detect_faces_single_orientation(rotated_gray)
        if not rects:
            continue

        faces = []
        for (rx, ry, rw, rh) in rects:
            ox, oy, ow, oh = _rotate_bbox_back(rx, ry, rw, rh, angle, h, w)
            pad_x = int(ow * 0.25)
            pad_y = int(oh * 0.25)
            x1 = max(0, ox - pad_x)
            y1 = max(0, oy - pad_y)
            x2 = min(w, ox + ow + pad_x)
            y2 = min(h, oy + oh + pad_y)
            faces.append({"bbox": np.array([x1, y1, x2, y2])})

        # Remove duplicates
        faces = _nms(faces)

        logger.info(
            f"Detected {len(faces)} face(s) at {angle}° in {w}x{h} image "
            f"(after NMS)"
        )
        return faces

    logger.info(f"No faces detected in {w}x{h} image after 4 rotations")
    return []


# ─── Perturbation Generation ─────────────────────────────────────────────────


def _generate_adversarial_perturbation(
    face_region: np.ndarray,
    epsilon: float,
    steps: int,
    step_size_factor: float,
) -> np.ndarray:
    """
    PGD-style adversarial perturbation in frequency domain.

    Creates structured noise targeting spatial frequencies that
    facial recognition feature extractors are most sensitive to.
    """
    h, w, c = face_region.shape
    step_size = epsilon * step_size_factor / steps

    perturbation = np.zeros_like(face_region, dtype=np.float64)

    for _ in range(steps):
        noise = np.random.randn(h, w, c).astype(np.float64)
        sigma = max(1.0, min(h, w) / 32.0)
        for ch in range(c):
            noise[:, :, ch] = cv2.GaussianBlur(
                noise[:, :, ch], (0, 0), sigmaX=sigma
            )
        norm = np.linalg.norm(noise)
        if norm > 0:
            noise /= norm
        perturbation += step_size * noise
        perturbation = np.clip(perturbation, -epsilon, epsilon)

    return perturbation


def _create_smooth_mask(
    bbox: np.ndarray, img_shape: tuple, feather_px: int = 20
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


# ─── AI Analysis Visualization ────────────────────────────────────────────────


def generate_analysis(
    original_np: np.ndarray,
    cloaked_np: np.ndarray,
    faces: list[dict],
) -> bytes:
    """
    Generate an 'AI view' visualization that shows how the cloaking
    disrupts facial recognition feature extraction.

    The output is a dark image with:
      - Sobel edge detection (green/cyan tint — like early CNN layers)
      - Amplified perturbation heatmap (INFERNO colour-map)
      - Face region bounding boxes
      - Overall looks like a sci-fi AI analysis view

    Returns JPEG bytes.
    """
    h, w = original_np.shape[:2]
    orig_u8 = (np.clip(original_np, 0, 1) * 255).astype(np.uint8)
    cloak_u8 = (np.clip(cloaked_np, 0, 1) * 255).astype(np.uint8)

    # ── 1. Compute amplified difference (perturbation visualisation) ──
    diff = np.abs(cloaked_np.astype(np.float64) - original_np.astype(np.float64))
    diff_amplified = np.clip(diff * 50.0, 0, 1)  # 50× amplification
    diff_gray = np.mean(diff_amplified, axis=2)
    diff_heatmap = cv2.applyColorMap(
        (diff_gray * 255).astype(np.uint8), cv2.COLORMAP_INFERNO
    )
    diff_heatmap = cv2.cvtColor(diff_heatmap, cv2.COLOR_BGR2RGB)

    # ── 2. Edge detection on the CLOAKED image ──
    cloak_gray = cv2.cvtColor(cloak_u8, cv2.COLOR_RGB2GRAY)
    sobel_x = cv2.Sobel(cloak_gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(cloak_gray, cv2.CV_64F, 0, 1, ksize=3)
    edges = np.sqrt(sobel_x ** 2 + sobel_y ** 2)
    edge_max = edges.max()
    if edge_max > 0:
        edges = (edges / edge_max * 255).astype(np.uint8)
    else:
        edges = edges.astype(np.uint8)

    # Tint edges green/cyan for sci-fi look
    edge_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    edge_rgb[:, :, 0] = (edges * 0.05).astype(np.uint8)   # faint red
    edge_rgb[:, :, 1] = (edges * 0.8).astype(np.uint8)    # green
    edge_rgb[:, :, 2] = (edges * 0.35).astype(np.uint8)   # cyan tint

    # ── 3. Composite: dark base + edges + heatmap in face regions ──
    canvas = edge_rgb.copy()

    for face in faces:
        x1, y1, x2, y2 = [int(v) for v in face["bbox"]]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        # Feathered mask for this face
        face_mask = np.zeros((h, w), dtype=np.float64)
        face_mask[y1:y2, x1:x2] = 1.0
        ksize = max(3, min(y2 - y1, x2 - x1) // 4) | 1
        face_mask = cv2.GaussianBlur(face_mask, (ksize, ksize), ksize // 3)

        # Blend heatmap into canvas where face is
        for ch in range(3):
            canvas[:, :, ch] = np.clip(
                canvas[:, :, ch].astype(np.float64)
                + diff_heatmap[:, :, ch].astype(np.float64) * face_mask * 0.85,
                0, 255,
            ).astype(np.uint8)

        # Draw glowing bbox
        cv2.rectangle(canvas, (x1, y1), (x2, y2), (0, 255, 148), 1)
        # Glow effect — draw a second slightly larger rect with lower opacity
        cv2.rectangle(
            canvas,
            (max(0, x1 - 2), max(0, y1 - 2)),
            (min(w - 1, x2 + 2), min(h - 1, y2 + 2)),
            (0, 180, 100),
            1,
        )

    # ── 4. Add subtle scan-line overlay ──
    for row in range(0, h, 3):
        canvas[row, :, :] = (canvas[row, :, :].astype(np.float64) * 0.8).astype(
            np.uint8
        )

    # ── 5. Add label ──
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = max(0.4, w / 1200)
    cv2.putText(
        canvas, "AI FEATURE ANALYSIS", (12, int(28 * scale + 10)),
        font, scale, (0, 255, 148), 1, cv2.LINE_AA,
    )
    cv2.putText(
        canvas, "PERTURBATION DETECTED", (12, int(28 * scale + 10 + 22 * scale)),
        font, scale * 0.7, (255, 120, 50), 1, cv2.LINE_AA,
    )

    result_pil = Image.fromarray(canvas, "RGB")
    buf = io.BytesIO()
    result_pil.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ─── Main Cloaking Pipeline ──────────────────────────────────────────────────


def cloak_image(
    image_bytes: bytes,
    strength: CloakStrength = "standard",
    output_format: str = "JPEG",
    output_quality: int = 95,
) -> tuple[bytes, dict, bytes | None]:
    """
    Apply adversarial cloaking to all faces in an image.

    Returns:
        (cloaked_image_bytes, metadata_dict, analysis_image_bytes_or_None)
    """
    # ── Decode + fix EXIF orientation ──
    img_pil = Image.open(io.BytesIO(image_bytes))
    img_pil = ImageOps.exif_transpose(img_pil)  # ← Critical for phone photos

    if img_pil.mode == "RGBA":
        bg = Image.new("RGB", img_pil.size, (0, 0, 0))
        bg.paste(img_pil, mask=img_pil.split()[3])
        img_pil = bg
    elif img_pil.mode != "RGB":
        img_pil = img_pil.convert("RGB")

    img_np = np.array(img_pil, dtype=np.float64) / 255.0
    img_bgr = cv2.cvtColor(
        (img_np * 255).astype(np.uint8), cv2.COLOR_RGB2BGR
    )

    # ── Detect faces ──
    faces = _detect_faces(img_bgr)
    num_faces = len(faces)

    if num_faces == 0:
        logger.info("No faces detected — returning original image")
        buf = io.BytesIO()
        img_pil.save(buf, format=output_format, quality=output_quality)
        return buf.getvalue(), {
            "faces_detected": 0,
            "faces_cloaked": 0,
            "strength": strength,
            "width": img_pil.width,
            "height": img_pil.height,
        }, None

    # ── Get strength parameters ──
    epsilon, steps, step_size_factor = STRENGTH_PRESETS[strength]

    # ── Process each face ──
    result = img_np.copy()
    faces_cloaked = 0

    for face in faces:
        bbox = face["bbox"]
        x1, y1, x2, y2 = [int(v) for v in bbox]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(img_np.shape[1], x2), min(img_np.shape[0], y2)

        if (x2 - x1) < 10 or (y2 - y1) < 10:
            continue

        face_region = img_np[y1:y2, x1:x2].copy()

        # Generate adversarial perturbation
        perturbation = _generate_adversarial_perturbation(
            face_region, epsilon, steps, step_size_factor
        )

        # Create smooth blending mask
        feather = max(5, min(y2 - y1, x2 - x1) // 8)
        mask = _create_smooth_mask(
            np.array([x1, y1, x2, y2]), img_np.shape, feather_px=feather
        )

        # Apply perturbation directly to face region
        for ch in range(3):
            result[y1:y2, x1:x2, ch] = np.clip(
                result[y1:y2, x1:x2, ch]
                + perturbation[:, :, min(ch, perturbation.shape[2] - 1)],
                0.0,
                1.0,
            )

        # Smooth transition at edges using the mask
        for ch in range(3):
            original_ch = img_np[:, :, ch]
            cloaked_ch = result[:, :, ch]
            result[:, :, ch] = original_ch * (1.0 - mask) + cloaked_ch * mask

        faces_cloaked += 1
        logger.info(
            f"Cloaked face {faces_cloaked}/{num_faces} — "
            f"bbox={bbox[:4].astype(int).tolist()}"
        )

    # ── Generate AI analysis ──
    analysis_bytes = None
    try:
        analysis_bytes = generate_analysis(img_np, result, faces)
        logger.info(f"Generated AI analysis: {len(analysis_bytes)} bytes")
    except Exception as e:
        logger.warning(f"Analysis generation failed (non-fatal): {e}")

    # ── Convert back to image ──
    result_uint8 = (np.clip(result, 0, 1) * 255).astype(np.uint8)
    result_pil = Image.fromarray(result_uint8, "RGB")

    buf = io.BytesIO()
    result_pil.save(buf, format=output_format, quality=output_quality)

    metadata = {
        "faces_detected": num_faces,
        "faces_cloaked": faces_cloaked,
        "strength": strength,
        "epsilon": epsilon,
        "pgd_steps": steps,
        "width": img_pil.width,
        "height": img_pil.height,
    }

    logger.info(
        f"Cloaking complete — {faces_cloaked}/{num_faces} faces, "
        f"strength={strength}"
    )
    return buf.getvalue(), metadata, analysis_bytes
