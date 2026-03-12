/**
 * VOiD — File I/O + Key Generation for Cloaking
 *
 * Reads images as base64, generates random keys/IVs,
 * and writes cloaked results back to local storage.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { encode as btoa } from 'base-64';

// ─── Key Generation ─────────────────────────────────

/**
 * Generate a random 32-byte AES-256 key, returned as base64.
 */
export function generateKey(): string {
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = Math.floor(Math.random() * 256);
  }
  return uint8ArrayToBase64(keyBytes);
}

/**
 * Generate a random 12-byte IV, returned as base64.
 */
export function generateIV(): string {
  const ivBytes = new Uint8Array(12);
  for (let i = 0; i < 12; i++) {
    ivBytes[i] = Math.floor(Math.random() * 256);
  }
  return uint8ArrayToBase64(ivBytes);
}

// ─── File I/O ───────────────────────────────────────

/**
 * Read an image file and return its content as base64 string.
 */
export async function readFileAsBase64(uri: string): Promise<string> {
  // Use string literal 'base64' instead of EncodingType enum for compatibility
  const base64Data = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as any,
  });
  return base64Data;
}

/**
 * Write base64 data to a temporary file and return the URI.
 */
export async function writeBase64ToFile(
  base64Data: string,
  filename: string
): Promise<string> {
  const dir = (FileSystem.cacheDirectory || '') + 'void-cloaked/';

  // Create directory (intermediates = mkdir -p, ignores existing)
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {
    // Fallback: try creating anyway
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {
      // Directory already exists — safe to continue
    }
  }

  // Use unique path to avoid "file already exists" collisions
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${filename}`;
  const path = dir + uniqueName;
  await FileSystem.writeAsStringAsync(path, base64Data, {
    encoding: 'base64' as any,
  });
  return path;
}

// ─── Helpers ────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Prepare image for upload to the cloaking server.
 */
export async function prepareImageForUpload(imageUri: string) {
  const imageBase64 = await readFileAsBase64(imageUri);
  const key = generateKey();
  const iv = generateIV();

  return {
    imageBase64,
    key,
    iv,
  };
}
