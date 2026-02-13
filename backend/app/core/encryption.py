"""
VOiD Backend — End-to-End Encryption Utilities

AES-256-GCM encryption/decryption for image data in transit.
The client generates a random key, encrypts the image, sends it to
the server with the key. The server decrypts, processes, re-encrypts
with the SAME key, and sends back. The key never persists on disk.

Flow:
  Client: key = random(32) → encrypt(image, key) → POST {encrypted, key, iv, tag}
  Server: decrypt(encrypted, key, iv, tag) → process → encrypt(result, key) → response
  Client: decrypt(response, key) → save locally

In production, use TLS + ephemeral keys for additional security.
"""

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def generate_key() -> bytes:
    """Generate a random 256-bit AES key."""
    return AESGCM.generate_key(bit_length=256)


def encrypt(data: bytes, key: bytes) -> tuple[bytes, bytes, bytes]:
    """
    Encrypt data using AES-256-GCM.

    Returns:
        (ciphertext, iv, tag) — tag is appended to ciphertext by AESGCM,
        so we return (ciphertext_with_tag, iv, b'') for compat.
        Actually AESGCM appends the tag automatically.
    """
    iv = os.urandom(12)  # 96-bit nonce
    aesgcm = AESGCM(key)
    # AESGCM.encrypt appends 16-byte auth tag to ciphertext
    ciphertext = aesgcm.encrypt(iv, data, None)
    return ciphertext, iv


def decrypt(ciphertext: bytes, key: bytes, iv: bytes) -> bytes:
    """
    Decrypt AES-256-GCM ciphertext.

    Args:
        ciphertext: The encrypted data (includes 16-byte auth tag)
        key: 32-byte AES key
        iv: 12-byte initialization vector

    Returns:
        Decrypted plaintext bytes
    """
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext, None)
