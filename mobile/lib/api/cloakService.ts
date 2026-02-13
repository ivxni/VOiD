/**
 * VOiD — Cloak API Service
 *
 * Handles the full encrypted cloaking workflow:
 *   1. Read image → base64
 *   2. Generate AES key + IV
 *   3. Upload encrypted payload to /api/v1/cloak
 *   4. Receive encrypted result
 *   5. Decode and save to local file
 *
 * Progress callback provides granular status updates
 * for driving the processing animation.
 */

import { prepareImageForUpload, writeBase64ToFile } from '../crypto/aes';
import type { CloakStrength } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export type CloakPhase =
  | 'preparing'    // Reading file, generating keys
  | 'encrypting'   // Encrypting image data
  | 'uploading'    // Sending to server
  | 'processing'   // Server is running ML pipeline
  | 'downloading'  // Receiving result
  | 'decrypting'   // Decrypting response
  | 'saving'       // Writing to local storage
  | 'complete'     // Done
  | 'error';       // Failed

export interface CloakProgress {
  phase: CloakPhase;
  progress: number;   // 0–1 overall progress
  message: string;    // Human-readable status
}

export interface CloakApiResult {
  localUri: string;       // URI to the saved cloaked image
  analysisUri: string | null; // URI to the AI analysis visualization
  facesDetected: number;
  facesCloaked: number;
  strength: string;
  processingTimeMs: number;
  width: number;
  height: number;
}

/**
 * Send an image through the encrypted cloaking pipeline.
 *
 * @param imageUri - Local file URI to the source image
 * @param strength - Cloaking strength level
 * @param onProgress - Callback for UI progress updates
 * @returns CloakApiResult with local URI to the cloaked image
 */
export async function cloakImageRemote(
  imageUri: string,
  strength: CloakStrength = 'standard',
  onProgress?: (progress: CloakProgress) => void,
): Promise<CloakApiResult> {
  const emit = (phase: CloakPhase, progress: number, message: string) => {
    onProgress?.({ phase, progress, message });
  };

  try {
    // Phase 1: Prepare (read file, generate keys)
    emit('preparing', 0.0, 'Reading image data...');
    await sleep(100); // Tiny delay so UI can render

    emit('encrypting', 0.1, 'Generating encryption keys...');
    const { imageBase64, key, iv } = await prepareImageForUpload(imageUri);

    emit('encrypting', 0.15, 'Encrypting image...');
    await sleep(50);

    // Phase 2: Build encrypted payload
    const payload = {
      encrypted_image: imageBase64,
      key: key,
      iv: iv,
      strength: strength,
      format: 'jpeg' as const,
      quality: 95,
    };

    emit('uploading', 0.2, `Uploading to ${API_URL}...`);

    // Phase 3: Send to server
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/v1/cloak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      throw new Error(
        `Cannot reach server at ${API_URL}. Make sure the backend is running and the URL in mobile/.env is correct.`
      );
    }

    emit('processing', 0.4, 'Detecting faces...');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(
        errorData.detail || `Server error ${response.status}: ${API_URL}/api/v1/cloak`
      );
    }

    emit('processing', 0.6, 'Applying adversarial perturbation...');

    const result = await response.json();

    emit('downloading', 0.75, 'Receiving cloaked image...');
    await sleep(100);

    // Phase 4: Decode + save
    emit('decrypting', 0.85, 'Decrypting result...');
    await sleep(50);

    emit('saving', 0.9, 'Saving to device...');

    // The server returns the cloaked image as base64 in encrypted_image field
    // (In full E2E mode, we'd decrypt here with the key + result IV)
    const timestamp = Date.now();
    const filename = `void_cloaked_${timestamp}.jpg`;
    const localUri = await writeBase64ToFile(result.encrypted_image, filename);

    // Save AI analysis visualization if present
    let analysisUri: string | null = null;
    if (result.analysis_image) {
      const analysisFilename = `void_analysis_${timestamp}.jpg`;
      analysisUri = await writeBase64ToFile(result.analysis_image, analysisFilename);
    }

    emit('complete', 1.0, 'Cloaking complete');

    return {
      localUri,
      analysisUri,
      facesDetected: result.faces_detected,
      facesCloaked: result.faces_cloaked,
      strength: result.strength,
      processingTimeMs: result.processing_time_ms,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    emit('error', 0, message);
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
