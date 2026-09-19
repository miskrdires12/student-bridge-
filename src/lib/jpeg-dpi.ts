// ============================================================================
// STUDENT BRIDGE — CLIENT & SERVER SAFE 300 DPI JFIF METADATA INJECTOR
// Injects standard 18-byte JFIF APP0 header (units = 1 [dots/inch], X/Y density = 300)
// into any JPEG binary stream. Pure binary manipulation with zero dependencies.
// ============================================================================

/**
 * Injects or updates the JFIF APP0 header of a JPEG Uint8Array to set resolution to 300 DPI.
 * Standard format:
 * - 0xFF 0xE0 (APP0 marker)
 * - 0x00 0x10 (Length 16)
 * - 0x4A 0x46 0x49 0x46 0x00 ('JFIF\0')
 * - 0x01 0x01 (Version 1.1)
 * - 0x01       (Units: 1 = Dots Per Inch / DPI)
 * - 0x01 0x2C (Xdensity: 300 in decimal = 0x012C)
 * - 0x01 0x2C (Ydensity: 300 in decimal = 0x012C)
 * - 0x00 0x00 (Thumbnail 0x0)
 */
export function setJpeg300Dpi(jpegBytes: Uint8Array): Uint8Array {
  if (jpegBytes.length < 4 || jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
    return jpegBytes; // Not a valid JPEG stream
  }

  // Case 1: Existing APP0 JFIF marker present
  if (
    jpegBytes[2] === 0xFF &&
    jpegBytes[3] === 0xE0 &&
    jpegBytes[6] === 0x4A && // 'J'
    jpegBytes[7] === 0x46 && // 'F'
    jpegBytes[8] === 0x49 && // 'I'
    jpegBytes[9] === 0x46 && // 'F'
    jpegBytes[10] === 0x00
  ) {
    const updated = new Uint8Array(jpegBytes);
    updated[13] = 1; // Units: 1 = dots per inch (DPI)
    updated[14] = (300 >> 8) & 0xFF; // Xdensity high byte: 1
    updated[15] = 300 & 0xFF;        // Xdensity low byte: 44 (0x2C)
    updated[16] = (300 >> 8) & 0xFF; // Ydensity high byte: 1
    updated[17] = 300 & 0xFF;        // Ydensity low byte: 44 (0x2C)
    return updated;
  }

  // Case 2: Insert standard 18-byte JFIF APP0 marker immediately after SOI (0xFF, 0xD8)
  const jfifHeader = new Uint8Array([
    0xFF, 0xE0, // APP0 marker
    0x00, 0x10, // Length = 16 bytes
    0x4A, 0x46, 0x49, 0x46, 0x00, // 'JFIF\0'
    0x01, 0x01, // Version 1.1
    0x01,       // Units: 1 = DPI
    0x01, 0x2C, // Xdensity: 300
    0x01, 0x2C, // Ydensity: 300
    0x00, 0x00  // Thumbnail dimensions: 0x0
  ]);

  const result = new Uint8Array(jpegBytes.length + jfifHeader.length);
  result.set(jpegBytes.subarray(0, 2), 0); // SOI (FF D8)
  result.set(jfifHeader, 2);                // APP0 (18 bytes)
  result.set(jpegBytes.subarray(2), 2 + jfifHeader.length); // Remainder
  return result;
}

/**
 * Converts a browser Blob to a 300 DPI JPEG Blob.
 */
export async function convertBlobTo300Dpi(blob: Blob): Promise<Blob> {
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const with300Dpi = setJpeg300Dpi(bytes);
    const arrayBuffer = with300Dpi.buffer.slice(
      with300Dpi.byteOffset,
      with300Dpi.byteOffset + with300Dpi.byteLength
    ) as ArrayBuffer;
    return new Blob([arrayBuffer], { type: "image/jpeg" });
  } catch {
    return blob;
  }
}
