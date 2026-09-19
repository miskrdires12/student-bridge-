// ============================================================================
// STUDENT BRIDGE — CONFIGURABLE VECTOR ID CARD PDF PRINT ENGINE
// Physical specifications:
// - Sheet: A4 (default), A3, Letter, Legal, or Custom Dimensions
// - Card:  Standard CR80 (85.60 mm × 53.98 mm) or Custom
// - Imposition: Configurable grid (Default 8-Up: 2 columns × 4 rows)
// - Embeds real student photos & external imported QR images
// ============================================================================

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs/promises";
import path from "path";
import type {
  StudentPrintData,
  CardDimensions,
  SheetDimensions,
  PrintEngineOptions,
} from "@/types/print";

const MM_TO_PT = 72 / 25.4; // 2.834645669291339 pt/mm

export const CARD_DIMENSIONS: CardDimensions = {
  widthMm: 85.6,
  heightMm: 53.98,
  widthPt: 85.6 * MM_TO_PT, // ~242.646 pt
  heightPt: 53.98 * MM_TO_PT, // ~153.014 pt
};

export const A4_DIMENSIONS: SheetDimensions = {
  widthMm: 210,
  heightMm: 297,
  widthPt: 210 * MM_TO_PT, // ~595.276 pt
  heightPt: 297 * MM_TO_PT, // ~841.890 pt
};

// Default Imposition: 2 columns × 4 rows = 8 cards / A4 sheet
const DEFAULT_COLUMNS = 2;
const DEFAULT_ROWS = 4;

const PALETTE = {
  sheetBackground: rgb(1, 1, 1),
  cardBackground: rgb(1, 1, 1), // 90% White
  cardHeader: rgb(0, 0, 0), // 10% Black
  accentGreen: rgb(0, 0, 0), // Monochromatic Black
  textPrimary: rgb(0, 0, 0), // Black
  textSecondary: rgb(100 / 255, 100 / 255, 100 / 255),
  textSubtle: rgb(140 / 255, 140 / 255, 140 / 255),
  borderDark: rgb(0, 0, 0),
  cutMarkColor: rgb(160 / 255, 160 / 255, 160 / 255),
  photoPlaceholder: rgb(245 / 255, 245 / 255, 245 / 255),
};

function fitText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
    return text;
  }
  const ellipsis = "...";
  const ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);
  let truncated = text;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated, fontSize) + ellipsisWidth > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

function hexToRgb(hex?: string) {
  if (!hex) return null;
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return null;
}

/**
 * Loads student portrait image from filesystem (JPEG or PNG).
 */
async function loadStudentPhoto(pdfDoc: PDFDocument, photoPath?: string | null): Promise<PDFImage | null> {
  if (!photoPath) return null;

  try {
    if (photoPath.startsWith("data:")) {
      const base64Data = photoPath.split(",")[1];
      if (!base64Data) return null;
      const imageBuffer = Buffer.from(base64Data, "base64");
      const isPng = photoPath.includes("image/png");
      return isPng ? await pdfDoc.embedPng(imageBuffer) : await pdfDoc.embedJpg(imageBuffer);
    }

    let cleanPath = photoPath.startsWith("/") ? photoPath.slice(1) : photoPath;
    cleanPath = cleanPath.split("?")[0];
    const fullPath = path.join(process.cwd(), "public", cleanPath);

    const imageBuffer = await fs.readFile(fullPath);
    const isPng = cleanPath.toLowerCase().endsWith(".png");

    if (isPng) {
      return await pdfDoc.embedPng(imageBuffer);
    } else {
      return await pdfDoc.embedJpg(imageBuffer);
    }
  } catch {
    return null;
  }
}

/**
 * Loads imported external QR image from filesystem.
 */
async function loadStudentQRImage(pdfDoc: PDFDocument, qrData?: string | null): Promise<PDFImage | null> {
  if (!qrData) return null;

  if (qrData.startsWith("data:")) {
    try {
      const base64Data = qrData.split(",")[1];
      if (base64Data) {
        const imageBuffer = Buffer.from(base64Data, "base64");
        const isPng = qrData.includes("image/png");
        return isPng ? await pdfDoc.embedPng(imageBuffer) : await pdfDoc.embedJpg(imageBuffer);
      }
    } catch {
      // Fallback to QR generation below
    }
  }

  if (qrData.startsWith("/") || qrData.startsWith("uploads/")) {
    try {
      const cleanPath = qrData.startsWith("/") ? qrData.slice(1) : qrData;
      const fullPath = path.join(process.cwd(), "public", cleanPath);
      const imageBuffer = await fs.readFile(fullPath);

      if (cleanPath.toLowerCase().endsWith(".png")) {
        return await pdfDoc.embedPng(imageBuffer);
      } else {
        return await pdfDoc.embedJpg(imageBuffer);
      }
    } catch {
      // Fallback
    }
  }

  // Fallback generation if external image file is unavailable
  try {
    const qrBuffer = await QRCode.toBuffer(qrData, {
      type: "png",
      margin: 1,
      width: 200,
      errorCorrectionLevel: "M",
    });
    return await pdfDoc.embedPng(qrBuffer);
  } catch {
    return null;
  }
}

/**
 * Draws precision corner crop marks at card corners.
 */
function drawCropMarks(
  page: PDFPage,
  cardX: number,
  cardY: number,
  cardWidth: number,
  cardHeight: number,
  bleedPt: number = 0
): void {
  const arm = 8;
  const offset = 3 + bleedPt;
  const markColor = PALETTE.cutMarkColor;
  const thickness = 0.5;

  // Bottom-Left
  page.drawLine({
    start: { x: cardX - offset - arm, y: cardY },
    end: { x: cardX - offset, y: cardY },
    thickness,
    color: markColor,
  });
  page.drawLine({
    start: { x: cardX, y: cardY - offset - arm },
    end: { x: cardX, y: cardY - offset },
    thickness,
    color: markColor,
  });

  // Bottom-Right
  page.drawLine({
    start: { x: cardX + cardWidth + offset, y: cardY },
    end: { x: cardX + cardWidth + offset + arm, y: cardY },
    thickness,
    color: markColor,
  });
  page.drawLine({
    start: { x: cardX + cardWidth, y: cardY - offset - arm },
    end: { x: cardX + cardWidth, y: cardY - offset },
    thickness,
    color: markColor,
  });

  // Top-Left
  page.drawLine({
    start: { x: cardX - offset - arm, y: cardY + cardHeight },
    end: { x: cardX - offset, y: cardY + cardHeight },
    thickness,
    color: markColor,
  });
  page.drawLine({
    start: { x: cardX, y: cardY + cardHeight + offset },
    end: { x: cardX, y: cardY + cardHeight + offset + arm },
    thickness,
    color: markColor,
  });

  // Top-Right
  page.drawLine({
    start: { x: cardX + cardWidth + offset, y: cardY + cardHeight },
    end: { x: cardX + cardWidth + offset + arm, y: cardY + cardHeight },
    thickness,
    color: markColor,
  });
  page.drawLine({
    start: { x: cardX + cardWidth, y: cardY + cardHeight + offset },
    end: { x: cardX + cardWidth, y: cardY + cardHeight + offset + arm },
    thickness,
    color: markColor,
  });
}

/**
 * Renders an individual student card at physical coordinates (cardX, cardY).
 */
async function renderStudentCard(
  pdfDoc: PDFDocument,
  page: PDFPage,
  student: StudentPrintData,
  cardX: number,
  cardY: number,
  cardWidth: number,
  cardHeight: number,
  fonts: { bold: PDFFont; regular: PDFFont; mono: PDFFont },
  options: PrintEngineOptions
): Promise<void> {
  const cardBgColor = hexToRgb(options.cardBackgroundColor) ?? PALETTE.cardBackground;
  const cardBorderColor = hexToRgb(options.cardBorderColor) ?? PALETTE.borderDark;

  // 1. Draw Card Background
  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    color: cardBgColor,
    borderColor: cardBorderColor,
    borderWidth: 0.75,
  });

  // 2. Card Header Banner
  const headerHeight = 24 * (cardHeight / CARD_DIMENSIONS.heightPt);
  page.drawRectangle({
    x: cardX,
    y: cardY + cardHeight - headerHeight,
    width: cardWidth,
    height: headerHeight,
    color: PALETTE.cardHeader,
  });

  page.drawLine({
    start: { x: cardX, y: cardY + cardHeight - headerHeight },
    end: { x: cardX + cardWidth, y: cardY + cardHeight - headerHeight },
    thickness: 1.25,
    color: PALETTE.accentGreen,
  });

  const orgTitle = options.organizationName ?? "STUDENT BRIDGE ACADEMY";
  page.drawText(orgTitle, {
    x: cardX + 10,
    y: cardY + cardHeight - 16,
    size: 8,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });

  page.drawText("OFFICIAL STUDENT ID", {
    x: cardX + cardWidth - 105,
    y: cardY + cardHeight - 15.5,
    size: 6,
    font: fonts.bold,
    color: rgb(0.8, 0.8, 0.8),
  });

  // 3. Student Portrait Slot
  const photoW = 48 * (cardWidth / CARD_DIMENSIONS.widthPt);
  const photoH = 62 * (cardHeight / CARD_DIMENSIONS.heightPt);
  const photoX = cardX + 10;
  const photoY = cardY + cardHeight - headerHeight - photoH - 10;

  page.drawRectangle({
    x: photoX,
    y: photoY,
    width: photoW,
    height: photoH,
    color: PALETTE.photoPlaceholder,
    borderColor: PALETTE.borderDark,
    borderWidth: 0.75,
  });

  const photoImage = await loadStudentPhoto(pdfDoc, student.photoPath);
  if (photoImage) {
    page.drawImage(photoImage, {
      x: photoX + 1,
      y: photoY + 1,
      width: photoW - 2,
      height: photoH - 2,
    });
  } else {
    page.drawText("PHOTO", {
      x: photoX + (photoW - 28) / 2,
      y: photoY + (photoH - 8) / 2,
      size: 7,
      font: fonts.bold,
      color: PALETTE.textSubtle,
    });
  }

  // 4. Student Core Details
  const infoX = photoX + photoW + 10;
  const maxTextWidth = cardX + cardWidth - infoX - 52;

  const nameText = fitText((student.fullName || "").toUpperCase(), fonts.bold, 9, maxTextWidth);
  page.drawText(nameText, {
    x: infoX,
    y: cardY + cardHeight - headerHeight - 16,
    size: 9,
    font: fonts.bold,
    color: PALETTE.textPrimary,
  });

  page.drawText("ID:", {
    x: infoX,
    y: cardY + cardHeight - headerHeight - 27,
    size: 6.5,
    font: fonts.bold,
    color: PALETTE.textSecondary,
  });
  page.drawText(student.studentId || "N/A", {
    x: infoX + 16,
    y: cardY + heightAdjusted(cardHeight, 27),
    size: 7,
    font: fonts.mono,
    color: PALETTE.textPrimary,
  });

  page.drawText("GRADE:", {
    x: infoX,
    y: cardY + heightAdjusted(cardHeight, 37),
    size: 6,
    font: fonts.regular,
    color: PALETTE.textSecondary,
  });
  page.drawText(student.grade || "N/A", {
    x: infoX + 28,
    y: cardY + heightAdjusted(cardHeight, 37),
    size: 6.5,
    font: fonts.bold,
    color: PALETTE.textPrimary,
  });

  page.drawText("PHONE:", {
    x: infoX,
    y: cardY + heightAdjusted(cardHeight, 47),
    size: 6,
    font: fonts.regular,
    color: PALETTE.textSecondary,
  });
  page.drawText(student.phone || "N/A", {
    x: infoX + 28,
    y: cardY + heightAdjusted(cardHeight, 47),
    size: 6.5,
    font: fonts.mono,
    color: PALETTE.textPrimary,
  });

  // 5. External Imported QR Code Embedding
  const qrImage = await loadStudentQRImage(pdfDoc, student.qrCodeData || student.studentId);
  const qrSize = 44 * (cardWidth / CARD_DIMENSIONS.widthPt);
  const qrX = cardX + cardWidth - qrSize - 8;
  const qrY = cardY + 12;

  page.drawRectangle({
    x: qrX - 2,
    y: qrY - 2,
    width: qrSize + 4,
    height: qrSize + 4,
    color: rgb(1, 1, 1),
    borderColor: PALETTE.borderDark,
    borderWidth: 0.5,
  });

  if (qrImage) {
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
  }

  function heightAdjusted(h: number, offset: number) {
    return h - headerHeight - offset;
  }
}

/**
 * Production PDF Generator with Configurable Multi-Card Bulker Layouts.
 * Supports:
 * - 8 cards per page (default)
 * - 1, 2, 4, 6, 8, 10, or custom grids
 * - Physical paper dimensions (A4, A3, Letter, Legal, Custom)
 * - Scalable chunk processing for 20,000+ records
 */
export async function generateA48UpIdCards(
  students: StudentPrintData[],
  options: PrintEngineOptions = {}
): Promise<Uint8Array> {
  if (!students || students.length === 0) {
    throw new Error("Cannot generate ID card PDF: student list is empty.");
  }

  const pdfDoc = await PDFDocument.create();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const fonts = { bold: fontBold, regular: fontRegular, mono: fontMono };

  // 1. Resolve Grid Dimensions & Layout
  const columns = options.grid?.columns ?? DEFAULT_COLUMNS;
  const rows = options.grid?.rows ?? DEFAULT_ROWS;
  const cardsPerPage = columns * rows;

  const cardWidthPt = options.cardDimensions?.widthPt ?? CARD_DIMENSIONS.widthPt;
  const cardHeightPt = options.cardDimensions?.heightPt ?? CARD_DIMENSIONS.heightPt;

  const sheetWidthPt = options.pageSize?.widthPt ?? A4_DIMENSIONS.widthPt;
  const sheetHeightPt = options.pageSize?.heightPt ?? A4_DIMENSIONS.heightPt;

  // Calculate Margins & Gutters symmetrically
  const totalCardsWidth = columns * cardWidthPt;
  const hRemainder = Math.max(0, sheetWidthPt - totalCardsWidth);
  const marginXPt = options.grid?.marginXPt ?? hRemainder / (columns + 1);

  const totalCardsHeight = rows * cardHeightPt;
  const vRemainder = Math.max(0, sheetHeightPt - totalCardsHeight);
  const marginYPt = options.grid?.marginYPt ?? vRemainder / (rows + 1);

  const bleedPt = (options.bleedMm ?? 0) * MM_TO_PT;

  const totalStudents = students.length;
  const totalPages = Math.ceil(totalStudents / cardsPerPage);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.addPage([sheetWidthPt, sheetHeightPt]);

    // Background sheet
    page.drawRectangle({
      x: 0,
      y: 0,
      width: sheetWidthPt,
      height: sheetHeightPt,
      color: PALETTE.sheetBackground,
    });

    // Sheet header annotation for print operators
    page.drawText(
      `STUDENT BRIDGE ENTERPRISE ID PRODUCTION — SHEET ${pageIdx + 1} OF ${totalPages} (${columns}×${rows} GRID)`,
      {
        x: marginXPt,
        y: sheetHeightPt - 18,
        size: 7,
        font: fontBold,
        color: PALETTE.cutMarkColor,
      }
    );

    const pageStart = pageIdx * cardsPerPage;
    const pageStudents = students.slice(pageStart, pageStart + cardsPerPage);

    for (let slotIdx = 0; slotIdx < pageStudents.length; slotIdx++) {
      const student = pageStudents[slotIdx];

      const col = slotIdx % columns;
      const row = Math.floor(slotIdx / columns);

      const cardX = marginXPt + col * (cardWidthPt + marginXPt);
      const cardYTopDown = marginYPt + row * (cardHeightPt + marginYPt);
      const cardY = sheetHeightPt - cardYTopDown - cardHeightPt;

      if (options.includeCutMarks !== false) {
        drawCropMarks(page, cardX, cardY, cardWidthPt, cardHeightPt, bleedPt);
      }

      await renderStudentCard(
        pdfDoc,
        page,
        student,
        cardX,
        cardY,
        cardWidthPt,
        cardHeightPt,
        fonts,
        options
      );
    }
  }

  return pdfDoc.save();
}
