// ============================================================================
// STUDENT BRIDGE — QR IMAGE DECODE & STUDENT MATCHING API ROUTE
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { decodeQRFromImageBuffer } from "@/lib/qr-parser";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No image file provided for QR parsing." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await decodeQRFromImageBuffer(buffer);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Match student in database if payload has studentId
    let student = null;
    if (result.payload?.id) {
      student = await prisma.student.findUnique({
        where: { studentId: result.payload.id },
      });
    }

    return NextResponse.json({
      success: true,
      rawText: result.rawText,
      payload: result.payload,
      matchedStudent: student,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "QR decoding error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
