// ============================================================================
// STUDENT BRIDGE — EXTERNAL QR CODE IMAGE UPLOAD & LINKING API
// Strict Requirement 9: DO NOT GENERATE QR CODES. External QR images only.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const studentId = formData.get("studentId") as string | null;
    const originalFileName = (formData.get("fileName") as string | null) || "qr_code.png";
    const matchedMethod = (formData.get("matchedMethod") as string | null) || "AUTO_FILENAME";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No QR image file provided." }, { status: 400 });
    }

    if (!studentId) {
      return NextResponse.json({ error: "Target studentId is required." }, { status: 400 });
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { studentId },
    });

    if (!student) {
      return NextResponse.json({ error: `Student with ID "${studentId}" not found.` }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(originalFileName) || ".png";
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const safeFileName = `qr_${studentId}_${Date.now()}_${uniqueId}${ext}`;

    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
    );

    let relativePath = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;

    if (!isServerless) {
      try {
        const targetDir = path.join(process.cwd(), "public", "uploads", "qr");
        await fs.mkdir(targetDir, { recursive: true });
        const absolutePath = path.join(targetDir, safeFileName);
        await fs.writeFile(absolutePath, buffer);
        relativePath = `/uploads/qr/${safeFileName}`;
      } catch (writeErr) {
        console.warn("Notice: Local QR disk write failed, retaining Base64 data URL:", writeErr);
      }
    }

    // Create StudentQR record
    const qrRecord = await prisma.studentQR.create({
      data: {
        studentId: student.id,
        fileName: originalFileName,
        imagePath: relativePath,
        mimeType: file.type || "image/png",
        matchedMethod,
        status: "MATCHED",
      },
    });

    // Update student's primary QR image reference
    await prisma.student.update({
      where: { id: student.id },
      data: {
        qrCodeData: relativePath, // Points to external QR image (relative path or base64 URI)
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "QR_IMPORT",
        entityType: "STUDENT_QR",
        entityId: qrRecord.id,
        metadata: JSON.stringify({ studentId, fileName: originalFileName }),
      },
    });

    return NextResponse.json({
      success: true,
      qrId: qrRecord.id,
      imagePath: relativePath,
      studentId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save QR image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
