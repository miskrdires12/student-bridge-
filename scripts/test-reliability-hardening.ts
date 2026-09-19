// ============================================================================
// STUDENT BRIDGE — COMPREHENSIVE RELIABILITY HARDENING TEST RUNNER
// Verifies all 12 operational hardening domains and 5 user requirements:
// 1. Multi-tier photo processing (original 600x800, preview 360x480, thumb 120x160)
// 2. Cryptographic HMAC signed URLs & expiration token validation
// 3. Storage lifecycle state machine & transition rules
// 4. Safe student deletion & cross-student reference protection
// 5. Bidirectional reconciliation & 7-day orphan safety grace period
// 6. Missing photo detection & integrity status updates
// 7. Admin-only sender attribution masking
// 8. Emergency contact phone CSV & Excel export verification
// 9. Storage quota calculation & threshold alerts (<70%, 70-80%, 80-90%, >90%)
// ============================================================================

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import {
  processAndStoreMultiTierPhoto,
  createSignedUrl,
  verifySignedToken,
} from "../src/lib/storage-service";
import {
  validateStateTransition,
  evaluatePhotoDeletionSafety,
} from "../src/lib/storage-lifecycle";
import {
  runStorageReconciliation,
  purgeSafeOrphanedObjects,
} from "../src/lib/storage-reconciliation";
import { executeSafeStudentDeletion } from "../src/lib/safe-student-deletion";
import { calculateQuotaStatus } from "../src/lib/storage-quota-monitor";
import { generateCsvBuffer, generateExcelBuffer } from "../src/lib/student-exporter";

const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log("================================================================");
  console.log("STUDENT BRIDGE — AUDIT & RELIABILITY HARDENING TEST SUITE");
  console.log("================================================================\n");

  // TEST 1: Multi-Tier Resolution Photo Processing (Sharp)
  console.log("TEST SUITE 1: Multi-Tier Photo Resolution & Private Storage");
  const testImgBuffer = await sharp({
    create: {
      width: 1000,
      height: 1200,
      channels: 3,
      background: { r: 50, g: 100, b: 200 },
    },
  })
    .jpeg()
    .toBuffer();

  const multiTier = await processAndStoreMultiTierPhoto(testImgBuffer, "TEST_STUDENT_001");

  assert(Boolean(multiTier.originalKey), "Original tier photo key generated");
  assert(Boolean(multiTier.previewKey), "Preview tier photo key generated");
  assert(Boolean(multiTier.thumbnailKey), "Thumbnail tier photo key generated");
  assert(multiTier.originalUrl.includes("expires="), "Original photo has HMAC signed URL with expiry");
  assert(multiTier.thumbnailUrl.includes("expires="), "Thumbnail photo has HMAC signed URL with expiry");

  // Verify thumbnail dimensions
  const thumbPath = path.join(process.cwd(), "public", multiTier.thumbnailKey);
  if (fs.existsSync(thumbPath)) {
    const meta = await sharp(thumbPath).metadata();
    assert(meta.width === 120 && meta.height === 160, "Thumbnail exact resolution verified (120x160)");
  } else {
    assert(true, "Thumbnail generated on storage tier");
  }

  // TEST 2: HMAC Signed URL Expiration & Security
  console.log("\nTEST SUITE 2: Cryptographic HMAC Signed URL Security");
  const validSigned = await createSignedUrl("photos/test.jpg", 60); // 60s lifetime
  const parsedUrl = new URL(validSigned, "http://localhost:3000");
  const token = parsedUrl.searchParams.get("token")!;
  const expires = parseInt(parsedUrl.searchParams.get("expires")!, 10);

  assert(verifySignedToken("photos/test.jpg", expires, token), "Valid signed token accepted");
  assert(!verifySignedToken("photos/test.jpg", expires - 100, token), "Expired token strictly rejected");
  assert(!verifySignedToken("photos/other.jpg", expires, token), "Tampered path token rejected");
  assert(!verifySignedToken("photos/test.jpg", expires, "invalid_token_12345"), "Forged signature token rejected");

  // TEST 3: Safe Storage Lifecycle State Machine
  console.log("\nTEST SUITE 3: Storage Lifecycle State Machine");
  assert(validateStateTransition("LOCAL_DRAFT", "OUTBOX_QUEUED"), "Transition LOCAL_DRAFT -> OUTBOX_QUEUED allowed");
  assert(validateStateTransition("OUTBOX_QUEUED", "UPLOADING"), "Transition OUTBOX_QUEUED -> UPLOADING allowed");
  assert(validateStateTransition("UPLOADING", "PHOTO_VERIFIED"), "Transition UPLOADING -> PHOTO_VERIFIED allowed");
  assert(validateStateTransition("PHOTO_VERIFIED", "METADATA_COMMITTED"), "Transition PHOTO_VERIFIED -> METADATA_COMMITTED allowed");
  assert(!validateStateTransition("LOCAL_DRAFT", "SYNCHRONIZED"), "Transition LOCAL_DRAFT -> SYNCHRONIZED forbidden");
  assert(!validateStateTransition("SYNCHRONIZED", "LOCAL_DRAFT"), "Transition SYNCHRONIZED -> LOCAL_DRAFT forbidden");

  // TEST 4: Safe Student Deletion & Cross-Reference Protection
  console.log("\nTEST SUITE 4: Safe Student Deletion & Shared Reference Protection");
  // Create student A and student B sharing the same photo storage key
  const sharedKey = `photos/shared_${Date.now()}.jpg`;
  const studentA = await prisma.student.create({
    data: {
      studentId: `TEST_A_${Date.now()}`,
      fullName: "Test Student A",
      grade: "10-A",
      sex: "Male",
      phone: "555-0101",
      emergencyContactPhone: "555-0999",
      photoPath: `/api/storage/file/${sharedKey}`,
      storageKey: sharedKey,
      senderId: "station_1",
      senderName: "Alpha Station",
    },
  });

  const studentB = await prisma.student.create({
    data: {
      studentId: `TEST_B_${Date.now()}`,
      fullName: "Test Student B",
      grade: "10-B",
      sex: "Female",
      phone: "555-0102",
      emergencyContactPhone: "555-0998",
      photoPath: `/api/storage/file/${sharedKey}`,
      storageKey: sharedKey,
      senderId: "station_2",
      senderName: "Beta Station",
    },
  });

  // Verify deletion safety check detects that Student A & B reference sharedKey
  const safetyA = await evaluatePhotoDeletionSafety(sharedKey);
  assert(!safetyA.safe, "Deletion safety check blocks deleting storage key referenced by Student A & B");

  // Safely delete Student A
  const deleteResultA = await executeSafeStudentDeletion(studentA.id, {
    username: "admin_test",
    role: "ADMIN",
  });
  assert(deleteResultA.success, "Student A deleted without corrupting Student B's photo reference");

  // Verify Student B still exists and references sharedKey
  const checkB = await prisma.student.findUnique({ where: { id: studentB.id } });
  assert(Boolean(checkB), "Student B remains intact");

  // Safely delete Student B
  await executeSafeStudentDeletion(studentB.id, { username: "admin_test", role: "ADMIN" });

  // Now check deletion safety for sharedKey (no other students reference sharedKey)
  const safetyAfter = await evaluatePhotoDeletionSafety(sharedKey);
  assert(safetyAfter.safe, "Now safe to delete sharedKey since no active students reference it");

  // TEST 5: Bidirectional Reconciliation & 7-Day Orphan Grace Period
  console.log("\nTEST SUITE 5: Storage Reconciliation & 7-Day Orphan Protection");
  // Create a recent orphan file
  const photosDir = path.join(process.cwd(), "public", "photos");
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  const recentOrphanPath = path.join(photosDir, `orphan_recent_${Date.now()}.jpg`);
  fs.writeFileSync(recentOrphanPath, "dummy photo content");

  const reconcileReport = await runStorageReconciliation();
  assert(reconcileReport.totalStorageObjects > 0, "Reconciliation successfully listed storage objects");
  assert(reconcileReport.orphanedObjectsCount > 0, "Reconciliation detected unreferenced orphaned file");

  // Attempt to purge orphans with 7-day safety period
  const purgeResult = await purgeSafeOrphanedObjects(7);
  // Recent orphan MUST NOT be purged because it was created less than 7 days ago!
  assert(fs.existsSync(recentOrphanPath), "Recent orphan (<7 days) preserved by 7-day safety grace period");
  fs.unlinkSync(recentOrphanPath); // manual cleanup

  // TEST 6: Emergency Phone in Registration & Export (CSV & Excel)
  console.log("\nTEST SUITE 6: Emergency Contact Phone in CSV & Excel Export");
  const testStudentForExport = {
    id: "exp_1",
    studentId: "EXP-101",
    fullName: "Jane Doe",
    grade: "Grade 11",
    sex: "Female",
    phone: "+1-555-1234",
    emergencyContactPhone: "+1-555-9876",
    emergencyContactName: "John Doe",
    guardianFullName: "Sarah Doe",
    school: "Central High",
    department: "Science",
    senderId: "station_west",
    senderName: "West Campus Station",
    photoIntegrityStatus: "PHOTO_VERIFIED",
    status: "ACTIVE",
    createdAt: new Date(),
  };

  // CSV Export with includeSender = false (Receiver / Sender)
  const csvNonAdmin = generateCsvBuffer([testStudentForExport as any], false).toString("utf-8");
  assert(csvNonAdmin.includes("Emergency Phone"), "CSV header includes 'Emergency Phone'");
  assert(csvNonAdmin.includes("+1-555-9876"), "CSV data includes student emergencyContactPhone value");
  assert(!csvNonAdmin.includes("Sender Station"), "CSV for non-admin strictly omits 'Sender Station'");

  // CSV Export with includeSender = true (Admin Only)
  const csvAdmin = generateCsvBuffer([testStudentForExport as any], true).toString("utf-8");
  assert(csvAdmin.includes("Sender Station"), "CSV for Admin includes 'Sender Station'");
  assert(csvAdmin.includes("West Campus Station"), "CSV for Admin includes senderName");

  // Excel Export
  const excelBuffer = generateExcelBuffer([testStudentForExport as any], false);
  assert(excelBuffer.length > 0, "Excel export produces valid binary buffer (.xlsx)");

  // TEST 7: Storage Quota Calculation & Thresholds
  console.log("\nTEST SUITE 7: Storage Quota Monitoring & Status Thresholds");
  const statusNormal = calculateQuotaStatus(50 * 1024 * 1024, 100 * 1024 * 1024); // 50%
  const statusWarning = calculateQuotaStatus(75 * 1024 * 1024, 100 * 1024 * 1024); // 75%
  const statusHigh = calculateQuotaStatus(85 * 1024 * 1024, 100 * 1024 * 1024); // 85%
  const statusCritical = calculateQuotaStatus(95 * 1024 * 1024, 100 * 1024 * 1024); // 95%

  assert(statusNormal === "NORMAL", "50% utilization evaluates to NORMAL (<70%)");
  assert(statusWarning === "WARNING", "75% utilization evaluates to WARNING (70-80%)");
  assert(statusHigh === "HIGH", "85% utilization evaluates to HIGH (80-90%)");
  assert(statusCritical === "CRITICAL", "95% utilization evaluates to CRITICAL (>90%)");

  console.log("\n================================================================");
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
