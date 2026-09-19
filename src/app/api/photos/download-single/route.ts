// ============================================================================
// STUDENT BRIDGE — SINGLE PHOTO DOWNLOAD PROXY / STREAM ENGINE
// Ensures cross-origin images download cleanly as attachments with
// correct filenames and accurate Content-Length headers (displaying MB metrics).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.userId) {
      prisma.user.update({
        where: { id: session.userId },
        data: { recordsEncoded: { increment: 1 } },
      }).catch(() => {});
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const rawUrl = searchParams.get("url");
    const rawName = searchParams.get("name");

    let photoPath = rawUrl;
    let studentName = rawName || "Student_Portrait";

    if (id) {
      const student = await prisma.student.findFirst({
        where: {
          OR: [{ id }, { studentId: id }],
        },
        select: {
          id: true,
          studentId: true,
          fullName: true,
          photoPath: true,
          originalPhotoPath: true,
        },
      });

      if (student) {
        photoPath = student.originalPhotoPath || student.photoPath || photoPath;
        if (student.fullName) studentName = student.fullName;
      }
    }

    if (!photoPath) {
      return NextResponse.json({ error: "No photo found for student" }, { status: 404 });
    }

    const cleanName = studentName
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ") || "Student_Photo";

    const filename = `${cleanName}.jpg`;

    // 1. Remote CDN URL (Supabase Storage)
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      const res = await fetch(photoPath, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image from CDN: ${res.statusText}` },
          { status: 502 }
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = res.headers.get("content-type") || "image/jpeg";

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 2. Local Disk File
    const publicDir = path.join(process.cwd(), "public");
    const relativeClean = photoPath.replace(/^\//, "");
    const absolutePath = path.join(publicDir, relativeClean);

    if (fs.existsSync(absolutePath)) {
      const buffer = fs.readFileSync(absolutePath);
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 3. Base64 Data URI
    if (photoPath.startsWith("data:")) {
      const parts = photoPath.split(",");
      const base64Data = parts[1];
      const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
      if (base64Data) {
        const buffer = Buffer.from(base64Data, "base64");
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
            "Content-Length": String(buffer.length),
          },
        });
      }
    }

    return NextResponse.json({ error: "Photo file not accessible" }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to download photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
