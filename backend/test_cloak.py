"""
VOiD — Cloaking Pipeline Test

Verifies:
  1. DNN face detector loads
  2. SFace recognition model loads
  3. Model-guided perturbation produces measurable embedding shift
  4. Pixel differences are present in the face region
  5. Embedding distances prove FR disruption
"""

import urllib.request
import os
import time
import numpy as np
from PIL import Image
import io

from app.ml.face_cloaker import (
    cloak_image,
    _ensure_dnn_model,
    _ensure_recognizer,
    _get_embedding,
    _cosine_distance,
    _face_to_bgr_112,
    SFACE_INPUT_SIZE,
)

FACE_URL = "https://thispersondoesnotexist.com"

SEP = "=" * 64


def main():
    print(SEP)
    print("  VOiD -- Model-Guided Cloaking Pipeline Test")
    print(SEP)

    # ── 1. DNN Face Detector ──
    print("\n[1/6] DNN Face Detector")
    if _ensure_dnn_model():
        print("  OK  -- DNN model loaded")
    else:
        print("  WARN -- DNN model NOT available (Haar fallback)")

    # ── 2. SFace Recognition Model ──
    print("\n[2/6] SFace Recognition Model")
    if _ensure_recognizer():
        print("  OK  -- SFace loaded (model-guided cloaking active)")
    else:
        print("  WARN -- SFace NOT available (untargeted fallback)")

    # ── 3. Download test image ──
    print("\n[3/6] Test Image")
    try:
        req = urllib.request.Request(
            FACE_URL, headers={"User-Agent": "Mozilla/5.0"}
        )
        img_bytes = urllib.request.urlopen(req, timeout=10).read()
        print(f"  OK  -- Downloaded {len(img_bytes):,} bytes from thispersondoesnotexist.com")
    except Exception as e:
        print(f"  WARN -- Download failed ({e}), using synthetic image")
        img = Image.new("RGB", (300, 300), (200, 180, 170))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

    # ── 4. Run cloaking for each strength ──
    os.makedirs("test_output", exist_ok=True)
    with open("test_output/original.jpg", "wb") as f:
        f.write(img_bytes)

    for strength in ["subtle", "standard", "maximum"]:
        print(f"\n[4/6] Cloaking -- strength={strength}")
        t0 = time.time()
        try:
            cloaked_bytes, meta, analysis_bytes = cloak_image(
                img_bytes, strength=strength,
            )
            elapsed = time.time() - t0

            print(f"  Faces detected:      {meta['faces_detected']}")
            print(f"  Faces cloaked:       {meta['faces_cloaked']}")
            print(f"  Model-guided:        {meta['model_guided']}")
            print(f"  Avg embedding dist:  {meta['avg_embedding_distance']:.4f}")
            print(f"  Per-face distances:  {meta['embedding_distances']}")
            print(f"  Processing time:     {elapsed:.2f}s")
            print(f"  Output size:         {len(cloaked_bytes):,} bytes")

            with open(f"test_output/cloaked_{strength}.jpg", "wb") as f:
                f.write(cloaked_bytes)
            if analysis_bytes:
                with open(f"test_output/analysis_{strength}.jpg", "wb") as f:
                    f.write(analysis_bytes)
                print(f"  Analysis:            {len(analysis_bytes):,} bytes")

            # ── Pixel diff ──
            orig_arr = np.array(
                Image.open(io.BytesIO(img_bytes)).convert("RGB"),
                dtype=np.float64,
            )
            cloak_arr = np.array(
                Image.open(io.BytesIO(cloaked_bytes)).convert("RGB"),
                dtype=np.float64,
            )
            diff = np.abs(orig_arr - cloak_arr)
            print(f"  Max pixel diff:      {diff.max():.1f}/255")
            print(f"  Mean pixel diff:     {diff.mean():.2f}/255")
            changed = np.count_nonzero(diff > 0.5)
            total = diff.size
            print(f"  Changed pixels:      {changed:,}/{total:,} ({100*changed/total:.1f}%)")

        except Exception as e:
            print(f"  FAIL -- {e}")
            import traceback
            traceback.print_exc()

    # ── 5. Independent embedding verification ──
    print(f"\n[5/6] Independent Embedding Verification")
    if _ensure_recognizer():
        try:
            # Load original + cloaked (standard) and compare embeddings
            orig_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            orig_np = np.array(orig_pil, dtype=np.float64) / 255.0

            cloaked_std = open("test_output/cloaked_standard.jpg", "rb").read()
            cloak_pil = Image.open(io.BytesIO(cloaked_std)).convert("RGB")
            cloak_np = np.array(cloak_pil, dtype=np.float64) / 255.0

            # Get full-image embeddings (not ideal but demonstrates the model)
            orig_112 = _face_to_bgr_112(orig_np)
            cloak_112 = _face_to_bgr_112(cloak_np)

            emb_orig = _get_embedding(orig_112)
            emb_cloak = _get_embedding(cloak_112)

            if emb_orig is not None and emb_cloak is not None:
                dist = _cosine_distance(emb_orig, emb_cloak)
                l2 = float(np.linalg.norm(emb_orig - emb_cloak))
                print(f"  Cosine distance:     {dist:.4f} ({dist:.1%})")
                print(f"  L2 distance:         {l2:.4f}")
                print(f"  Embedding dim:       {len(emb_orig)}")

                # Interpretation
                if dist >= 0.4:
                    print("  >> STRONG DISRUPTION -- identity is effectively destroyed")
                elif dist >= 0.2:
                    print("  >> MODERATE DISRUPTION -- most FR systems would fail")
                elif dist >= 0.1:
                    print("  >> LIGHT DISRUPTION -- some FR systems affected")
                else:
                    print("  >> MINIMAL -- perturbation may not be sufficient")
            else:
                print("  WARN -- Could not extract embeddings for verification")
        except Exception as e:
            print(f"  FAIL -- Verification error: {e}")
    else:
        print("  SKIP -- SFace model not available")

    # ── 6. Summary ──
    print(f"\n[6/6] Output Files")
    for f in sorted(os.listdir("test_output")):
        size = os.path.getsize(os.path.join("test_output", f))
        print(f"  {f:30s} {size:>10,} bytes")

    print(f"\n{SEP}")
    print("  Test complete. Inspect test_output/ for visual comparison.")
    print(SEP)


if __name__ == "__main__":
    main()
