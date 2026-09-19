// ============================================================================
// STUDENT BRIDGE — QR CODE GENERATION SERVICE
// ============================================================================

import QRCode from "qrcode";

export interface StudentQRPayload {
  id: string; // studentId
  name: string; // fullName
  roll: string; // rollNumber
  grade: string; // grade
}

/**
 * Creates the canonical JSON payload string stored and encoded on ID cards.
 */
export function createStudentQRPayload(student: {
  studentId: string;
  fullName: string;
  rollNumber: string;
  grade: string;
}): string {
  const payload: StudentQRPayload = {
    id: student.studentId,
    name: student.fullName,
    roll: student.rollNumber,
    grade: student.grade,
  };
  return JSON.stringify(payload);
}

/**
 * Generates an SVG string representation of the QR code.
 */
export async function generateQRSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Generates a Data URL (PNG base64) suitable for web preview.
 */
export async function generateQRDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    type: "image/png",
    margin: 1,
    width: 300,
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates a PNG binary Buffer for server-side saving or embedding.
 */
export async function generateQRBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: "png",
    margin: 1,
    width: 300,
    errorCorrectionLevel: "M",
  });
}
