"""
VOiD Backend — Cloak API Endpoint

Receives encrypted image data, decrypts it, applies adversarial
face cloaking, re-encrypts the result, and returns it.

Security model:
  - Client generates a random AES-256 key per request
  - Image is encrypted client-side with AES-256-GCM before upload
  - Server decrypts in memory, processes, re-encrypts with same key
  - No image data ever touches disk on the server
  - Key is transmitted over TLS (HTTPS) and discarded after request
"""

import base64
import time
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal

from app.core.encryption import encrypt, decrypt
from app.ml.face_cloaker import cloak_image

logger = logging.getLogger("void.api.cloak")

router = APIRouter(prefix="/cloak", tags=["Cloak"])


class CloakRequest(BaseModel):
    """
    Encrypted image cloaking request.

    All binary data is base64-encoded for JSON transport.
    """
    encrypted_image: str = Field(
        ..., description="Base64-encoded AES-256-GCM encrypted image data"
    )
    key: str = Field(
        ..., description="Base64-encoded 32-byte AES key"
    )
    iv: str = Field(
        ..., description="Base64-encoded 12-byte initialization vector"
    )
    strength: Literal["subtle", "standard", "maximum"] = Field(
        default="standard", description="Cloaking strength level"
    )
    format: Literal["jpeg", "png"] = Field(
        default="jpeg", description="Output image format"
    )
    quality: int = Field(
        default=95, ge=50, le=100, description="Output JPEG quality"
    )


class CloakResponse(BaseModel):
    """Encrypted cloaked image response."""
    encrypted_image: str = Field(
        ..., description="Base64-encoded AES-256-GCM encrypted cloaked image"
    )
    iv: str = Field(
        ..., description="Base64-encoded IV for the response encryption"
    )
    faces_detected: int
    faces_cloaked: int
    strength: str
    processing_time_ms: int
    width: int
    height: int
    analysis_image: str | None = Field(
        None,
        description="Base64-encoded AI analysis visualization (JPEG). "
        "Shows edge detection + perturbation heatmap — what AI 'sees'.",
    )


@router.post("", response_model=CloakResponse)
async def cloak_endpoint(request: CloakRequest):
    """
    Process an image through the adversarial cloaking pipeline.

    Supports two modes:
    - **Encrypted mode**: Client sends AES-256-GCM encrypted image data
      with key + IV. Server decrypts, processes, re-encrypts.
    - **TLS-only mode**: Client sends raw base64 image data (key/iv can be
      dummy values). Data is protected by HTTPS in transit.

    The server never persists image data to disk.
    """
    start_time = time.time()

    try:
        image_data = base64.b64decode(request.encrypted_image)
        key_bytes = base64.b64decode(request.key)
        iv_bytes = base64.b64decode(request.iv)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoding in request fields",
        )

    # Determine mode: if key is 32 bytes, try AES decryption first
    image_bytes = None
    encrypted_mode = len(key_bytes) == 32

    if encrypted_mode:
        try:
            image_bytes = decrypt(image_data, key_bytes, iv_bytes)
            logger.info(f"AES decryption successful: {len(image_bytes)} bytes")
        except Exception:
            # Decryption failed — data might be raw base64 (TLS-only mode)
            logger.info("AES decryption failed, assuming TLS-only mode")
            image_bytes = None

    if image_bytes is None:
        # TLS-only mode: image_data is the raw image bytes
        image_bytes = image_data
        encrypted_mode = False

    logger.info(
        f"Processing image: {len(image_bytes)} bytes, strength={request.strength}, "
        f"mode={'encrypted' if encrypted_mode else 'tls-only'}"
    )

    # Run cloaking pipeline
    try:
        output_format = "JPEG" if request.format == "jpeg" else "PNG"
        cloaked_bytes, metadata, analysis_bytes = cloak_image(
            image_bytes,
            strength=request.strength,
            output_format=output_format,
            output_quality=request.quality,
        )
    except Exception as e:
        logger.error(f"Cloaking pipeline failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image processing failed",
        )

    # Prepare response
    if encrypted_mode:
        # Re-encrypt with the SAME key (new IV)
        try:
            result_data, result_iv = encrypt(cloaked_bytes, key_bytes)
        except Exception as e:
            logger.error(f"Re-encryption failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Result encryption failed",
            )
    else:
        # TLS-only: return raw base64
        result_data = cloaked_bytes
        result_iv = iv_bytes

    processing_time_ms = int((time.time() - start_time) * 1000)

    logger.info(
        f"Cloak complete: {metadata['faces_cloaked']}/{metadata['faces_detected']} faces, "
        f"{processing_time_ms}ms, {len(cloaked_bytes)} bytes"
    )

    # Encode analysis image if available
    analysis_b64 = None
    if analysis_bytes is not None:
        analysis_b64 = base64.b64encode(analysis_bytes).decode()

    return CloakResponse(
        encrypted_image=base64.b64encode(result_data).decode(),
        iv=base64.b64encode(result_iv).decode(),
        faces_detected=metadata["faces_detected"],
        faces_cloaked=metadata["faces_cloaked"],
        strength=metadata["strength"],
        processing_time_ms=processing_time_ms,
        width=metadata["width"],
        height=metadata["height"],
        analysis_image=analysis_b64,
    )


class CloakStatusResponse(BaseModel):
    """Server cloaking capability status."""
    available: bool
    engine: str
    supported_strengths: list[str]
    max_image_size_mb: int


@router.get("/status", response_model=CloakStatusResponse)
async def cloak_status():
    """Check if the cloaking engine is available and ready."""
    return CloakStatusResponse(
        available=True,
        engine="void-cloak-v1",
        supported_strengths=["subtle", "standard", "maximum"],
        max_image_size_mb=20,
    )
