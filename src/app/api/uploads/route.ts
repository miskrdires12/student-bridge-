// ============================================================================
// STUDENT BRIDGE — PHOTO UPLOAD & DUAL STORAGE (ORIGINAL + EDITED) API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processAndSaveStudentPhoto } from "@/lib/image-processing";
import prisma from "@/lib/prisma";
import { publishStudentSync } from "@/lib/sync-engine";
import {
  extractR2StorageKey,
  deleteMultipleFromR2Bucket,
  invalidateR2StorageCache,
} from "@/lib/r2-storage";
import {
  extractSupabaseStorageKey,
  deleteMultipleFromSupabaseBucket,
} from "@/lib/supabase-storage";


export async function POST(request: NextRequest) {
  // 1. Enforce authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SENDER and ADMIN are authorized to upload student photos
  if (session.role !== "SENDER" && session.role !== "ADMIN" && session.role !== "RECEIVER") {
    return NextResponse.json(
      { error: "Forbidden: SENDER, RECEIVER, or ADMIN role required" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const originalFile = formData.get("originalFile");
    const studentId = formData.get("studentId") as string | null;
    let studentFullName = (formData.get("fullName") as string | null) || "";
    let studentGrade = (formData.get("grade") as string | null) || "";
    const cropData = formData.get("cropData") as string | null;
    const filterData = formData.get("filterData") as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No edited/primary image file provided in request payload." },
        { status: 400 }
      );
    }

    const editedBuffer = Buffer.from(await file.arrayBuffer());
    const editedMime = file.type || "image/jpeg";
    const editedResult = await processAndSaveStudentPhoto(editedBuffer, editedMime, "edited");

    let originalResult = editedResult;
    if (originalFile && originalFile instanceof Blob) {
      const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
      const originalMime = originalFile.type || "image/jpeg";
      originalResult = await processAndSaveStudentPhoto(originalBuffer, originalMime, "original");
    }

    if (studentId && (!studentFullName || !studentGrade)) {
      try {
        const found = await prisma.student.findUnique({
          where: { studentId },
          select: { fullName: true, grade: true },
        });
        if (found) {
          studentFullName = studentFullName || found.fullName;
          studentGrade = studentGrade || found.grade;
        }
      } catch {}
    }

    // Generate 3-phase progressive photos & save to local desktop backup
    let progressive = null;
    try {
      const { generate3PhasePhotos } = await import("@/lib/progressive-photo");
      progressive = await generate3PhasePhotos(editedBuffer, {
        studentId: studentId || "STU",
        fullName: studentFullName || "student",
        grade: studentGrade || "General",
        isEdited: Boolean(studentId),
      });
    } catch (progErr) {
      console.warn("Notice: Progressive generation notice:", progErr);
    }

    let photoRecord = null;
    if (studentId) {
      try {
        const student = await prisma.student.findUnique({
          where: { studentId },
        });

        if (student) {
          const finalThumbnail = progressive?.thumbnailPath || null;
          const finalPreview = progressive?.previewPath || null;
          const finalOriginal = progressive?.originalPath || originalResult.relativePath;
          const finalPhotoUrl = finalPreview || finalOriginal || editedResult.relativePath;

          // Collect new keys that were just uploaded to Cloudflare R2 / Storage
          const newR2Keys = [
            extractR2StorageKey(finalPhotoUrl),
            extractR2StorageKey(finalOriginal),
            extractR2StorageKey(finalPreview),
            extractR2StorageKey(finalThumbnail),
          ].filter(Boolean) as string[];

          // Identify previous photo(s) from Cloudflare R2
          const candidateOldR2Keys = [
            extractR2StorageKey(student.photoPath),
            extractR2StorageKey(student.previewPath),
            extractR2StorageKey(student.originalPhotoPath),
            extractR2StorageKey(student.thumbnailPath),
          ].filter(Boolean) as string[];

          // STRICT SAFETY: Never delete a key that was just uploaded
          const oldR2KeysToDelete = candidateOldR2Keys.filter(
            (k) => !newR2Keys.includes(k)
          );

          if (oldR2KeysToDelete.length > 0) {
            try {
              await deleteMultipleFromR2Bucket(oldR2KeysToDelete);
              invalidateR2StorageCache();
              console.log(`[Uploads] Cleaned up ${oldR2KeysToDelete.length} previous Cloudflare R2 photo(s) for student ${student.studentId}`);
            } catch (delErr) {
              console.warn("[Uploads] Notice: Old Cloudflare R2 photo cleanup warning:", delErr);
            }
          }

          // Legacy cleanup: also check and clean up any old Supabase bucket keys if student migrated
          const candidateOldSbKeys = [
            extractSupabaseStorageKey(student.photoPath),
            extractSupabaseStorageKey(student.previewPath),
            extractSupabaseStorageKey(student.originalPhotoPath),
            extractSupabaseStorageKey(student.thumbnailPath),
          ].filter(Boolean) as string[];

          if (candidateOldSbKeys.length > 0) {
            try {
              await deleteMultipleFromSupabaseBucket(candidateOldSbKeys);
            } catch {}
          }

          photoRecord = await prisma.studentPhoto.create({
            data: {
              studentId: student.id,
              originalPath: finalOriginal,
              editedPath: finalPhotoUrl,
              thumbnailPath: finalThumbnail,
              previewPath: finalPreview,
              width: progressive?.width || editedResult.width,
              height: progressive?.height || editedResult.height,
              cropData: cropData || null,
              filterData: filterData || null,
              status: "EDITED",
            },
          });

          const updatedStudent = await prisma.student.update({
            where: { id: student.id },
            data: {
              photoPath: finalPhotoUrl,
              thumbnailPath: finalThumbnail,
              previewPath: finalPreview,
              originalPhotoPath: finalOriginal,
            },
          });

          // Broadcast updated photo to receiver in real-time
          publishStudentSync("UPSERT", {
            id: updatedStudent.id,
            studentId: updatedStudent.studentId,
            fullName: updatedStudent.fullName,
            phone: updatedStudent.phone,
            sex: updatedStudent.sex,
            grade: updatedStudent.grade,
            school: updatedStudent.school,
            department: updatedStudent.department,
            academicYear: updatedStudent.academicYear,
            photoPath: updatedStudent.photoPath,
            thumbnailPath: updatedStudent.thumbnailPath,
            previewPath: updatedStudent.previewPath,
            originalPhotoPath: updatedStudent.originalPhotoPath,
            qrCodeData: updatedStudent.qrCodeData || `STUDENT:${updatedStudent.studentId}`,
            status: updatedStudent.status,
            createdAt: updatedStudent.createdAt.toISOString(),
            updatedAt: updatedStudent.updatedAt.toISOString(),
          }).catch(() => {});
        }
      } catch (dbErr) {
        console.warn("Notice: Non-fatal student photo association warning:", dbErr);
      }
    }

    const primaryReturnPath = progressive?.previewPath || progressive?.originalPath || editedResult.relativePath;

    return NextResponse.json(
      {
        relativePath: primaryReturnPath,
        originalPath: progressive?.originalPath || originalResult.relativePath,
        thumbnailPath: progressive?.thumbnailPath || null,
        previewPath: progressive?.previewPath || null,
        backupLocalPath: progressive?.backupLocalPath || null,
        fileName: editedResult.fileName,
        width: editedResult.width,
        height: editedResult.height,
        photoId: photoRecord?.id ?? null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Critical upload route failure:", err);
    const message = err instanceof Error ? err.message : "Failed to process photo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * Direct Image Link Generator & Photo Resolver
 * Returns the student's portrait directly as an image binary or redirects to photo path.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const fileParam = searchParams.get("file");

  try {
    let photoPath: string | null = null;

    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          OR: [{ studentId }, { id: studentId }],
        },
        select: { photoPath: true, fullName: true, studentId: true },
      });
      photoPath = student?.photoPath || null;
    } else if (fileParam) {
      photoPath = fileParam;
    }

    if (!photoPath) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Handle base64 Data URIs directly
    if (photoPath.startsWith("data:image/")) {
      const parts = photoPath.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(parts[1], "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    // Handle local file system storage
    const cleanRel = photoPath.split("?")[0].replace(/^\//, "");
    const fs = await import("fs");
    const path = await import("path");
    const fullPath = path.join(process.cwd(), "public", cleanRel);

    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    // Stream remote external image with CORS headers so canvas can safely ingest without tainting
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      try {
        const remoteRes = await fetch(photoPath);
        if (remoteRes.ok) {
          const buffer = Buffer.from(await remoteRes.arrayBuffer());
          const contentType = remoteRes.headers.get("content-type") || "image/jpeg";
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=86400",
            },
          });
        }
      } catch {}
      return NextResponse.redirect(photoPath);
    }

    return NextResponse.json({ photoPath, status: "READY" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to resolve photo" }, { status: 500 });
  }
}

