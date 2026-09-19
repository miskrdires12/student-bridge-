// ============================================================================
// STUDENT BRIDGE — QR IMAGE PARSER & DECODER
// Decodes uploaded QR code images using sharp (for pixel extraction) and jsQR.
// ============================================================================

import jsQR from "jsqr";
import sharp from "sharp";
import type { StudentQRPayload } from "@/lib/qr-generator";

export interface QRDecodeResult {
  success: boolean;
  rawText?: string;
  payload?: StudentQRPayload;
  error?: string;
}

/**
 * Parses and extracts QR code data from an image buffer (PNG, JPEG, etc.).
 */
export async function decodeQRFromImageBuffer(imageBuffer: Buffer): Promise<QRDecodeResult> {
  try {
    // 1. Normalize image with sharp to raw RGBA pixel buffer for jsQR
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const clampedArray = new Uint8ClampedArray(data);

    // 2. Run jsQR decoder algorithm over the raw RGBA pixels
    const code = jsQR(clampedArray, info.width, info.height, {
      inversionAttempts: "attemptBoth",
    });

    if (!code || !code.data) {
      return {
        success: false,
        error: "No readable QR code found in the uploaded image.",
      };
    }

    const rawText = code.data;

    // 3. Attempt parsing as canonical StudentQRPayload
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      if (parsed && typeof parsed.id === "string") {
        return {
          success: true,
          rawText,
          payload: {
            id: String(parsed.id),
            name: String(parsed.name ?? ""),
            roll: String(parsed.roll ?? ""),
            grade: String(parsed.grade ?? ""),
          },
        };
      }
    } catch {
      // Non-JSON QR code content
    }

    return {
      success: true,
      rawText,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Image decoding failed";
    return {
      success: false,
      error: `QR parsing exception: ${message}`,
    };
  }
}
