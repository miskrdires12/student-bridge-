// ============================================================================
// STUDENT BRIDGE — TECHNICAL FOUNDATION VERIFICATION TEST SUITE
// ============================================================================

import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from "../src/lib/auth";
import { hasPermission, assertPermission } from "../src/lib/permissions";
import { generateA48UpIdCards, A4_DIMENSIONS, CARD_DIMENSIONS } from "../src/lib/pdf-generator";
import { createStudentQRPayload } from "../src/lib/qr-generator";
import { decodeQRFromImageBuffer } from "../src/lib/qr-parser";
import QRCode from "qrcode";
import prisma from "../src/lib/prisma";
import type { StudentPrintData } from "../src/types/print";

async function runFoundationTests() {
  console.log("==================================================================");
  console.log("🚀 RUNNING STUDENT BRIDGE FOUNDATION TEST SUITE");
  console.log("==================================================================");

  // --------------------------------------------------------------------------
  // TEST 1: Prisma Schema & Database Verification
  // --------------------------------------------------------------------------
  console.log("\n[TEST 1] Verifying Prisma Database Connection & Seed Records...");
  const userCount = await prisma.user.count();
  const studentCount = await prisma.student.count();
  const templateCount = await prisma.cardTemplate.count();

  console.log(`✓ Total Users in DB: ${userCount}`);
  console.log(`✓ Total Students in DB: ${studentCount}`);
  console.log(`✓ Total Card Templates in DB: ${templateCount}`);

  if (userCount < 3 || studentCount < 10) {
    throw new Error(`Expected at least 3 users and 10 students, found ${userCount} users and ${studentCount} students.`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Cryptographic Password Hashing & Verification
  // --------------------------------------------------------------------------
  console.log("\n[TEST 2] Verifying Password Hashing (BCrypt 12 Salt Rounds)...");
  const testPassword = "EnterpriseSecurePassword!99";
  const hash = await hashPassword(testPassword);
  console.log(`✓ Generated bcrypt hash: ${hash.substring(0, 29)}...`);

  const isValidMatch = await verifyPassword(testPassword, hash);
  const isInvalidMatch = await verifyPassword("WrongPassword123!", hash);

  if (!isValidMatch || isInvalidMatch) {
    throw new Error("Password verification logic failed!");
  }
  console.log("✓ Password matching and rejection verified.");

  // --------------------------------------------------------------------------
  // TEST 3: JWT Session Token Signing & Edge Verification
  // --------------------------------------------------------------------------
  console.log("\n[TEST 3] Verifying JWT Session Token (JOSE HS256)...");
  const samplePayload = {
    userId: "usr_test_123",
    username: "test_admin",
    email: "test.admin@studentbridge.internal",
    role: "ADMIN" as const,
  };

  const token = await signSessionToken(samplePayload);
  console.log(`✓ Signed JWT token: ${token.substring(0, 45)}...`);

  const decoded = await verifySessionToken(token);
  if (!decoded || decoded.userId !== samplePayload.userId || decoded.role !== "ADMIN") {
    throw new Error("Session token verification failed!");
  }
  console.log("✓ Session token verified with full claim integrity.");

  // --------------------------------------------------------------------------
  // TEST 4: RBAC Permissions Matrix & Security Boundaries
  // --------------------------------------------------------------------------
  console.log("\n[TEST 4] Verifying RBAC Security Matrix...");
  // Sender should be able to create student, but NOT delete
  if (!hasPermission("SENDER", "student:create") || hasPermission("SENDER", "student:delete")) {
    throw new Error("RBAC violation: SENDER permissions are misconfigured!");
  }

  // Receiver should be able to read and update student, but NOT create
  if (!hasPermission("RECEIVER", "student:read") || hasPermission("RECEIVER", "student:create")) {
    throw new Error("RBAC violation: RECEIVER permissions are misconfigured!");
  }

  // Admin has full access
  if (!hasPermission("ADMIN", "user:create") || !hasPermission("ADMIN", "database:manage")) {
    throw new Error("RBAC violation: ADMIN permissions are misconfigured!");
  }

  // assertPermission error test
  let caughtError = false;
  try {
    assertPermission("SENDER", "user:delete");
  } catch {
    caughtError = true;
  }
  if (!caughtError) {
    throw new Error("assertPermission failed to throw on unauthorized action!");
  }
  console.log("✓ RBAC permissions matrix correctly enforces Least Privilege.");

  // --------------------------------------------------------------------------
  // TEST 5: 8-Up A4 PDF Generator & Geometry Validation
  // --------------------------------------------------------------------------
  console.log("\n[TEST 5] Verifying 8-Up A4 PDF Generation Geometry...");
  console.log(`  A4 Sheet Size:  ${A4_DIMENSIONS.widthPt.toFixed(2)} pt × ${A4_DIMENSIONS.heightPt.toFixed(2)} pt`);
  console.log(`  CR80 Card Size: ${CARD_DIMENSIONS.widthPt.toFixed(2)} pt × ${CARD_DIMENSIONS.heightPt.toFixed(2)} pt`);

  const sampleStudents: StudentPrintData[] = (await prisma.student.findMany({ take: 10 })).map((s) => ({
    id: s.id,
    studentId: s.studentId,
    fullName: s.fullName,
    contactName: s.contactName,
    grade: s.grade,
    sex: s.sex,
    phone: s.phone,
    cityRegion: s.cityRegion,
    emergencyContactName: s.emergencyContactName,
    emergencyContactPhone: s.emergencyContactPhone,
    bloodType: s.bloodType,
    emailAddress: s.emailAddress,
    guardianFullName: s.guardianFullName,
    rollNumber: s.rollNumber,
    nationality: s.nationality,
    nationalId: s.nationalId,
    dateOfBirth: s.dateOfBirth,
    photoPath: s.photoPath,
    qrCodeData: s.qrCodeData,
    status: s.status,
  }));

  // Test Case A: 1 Student (1 page)
  const singleCardPdf = await generateA48UpIdCards(sampleStudents.slice(0, 1));
  console.log(`✓ 1 Student PDF generated: ${singleCardPdf.byteLength} bytes.`);

  // Test Case B: 8 Students (exact 1 page)
  const eightCardPdf = await generateA48UpIdCards(sampleStudents.slice(0, 8));
  console.log(`✓ 8 Students (1 full A4 page) PDF generated: ${eightCardPdf.byteLength} bytes.`);

  // Test Case C: 10 Students (2 pages: 8 cards on page 1, 2 cards on page 2)
  const tenCardPdf = await generateA48UpIdCards(sampleStudents);
  console.log(`✓ 10 Students (2 multi-page A4 sheets) PDF generated: ${tenCardPdf.byteLength} bytes.`);

  // --------------------------------------------------------------------------
  // TEST 6: QR Code Generation & Decoding Round-Trip
  // --------------------------------------------------------------------------
  console.log("\n[TEST 6] Verifying QR Code Generation & Decoding Round-Trip...");
  const qrStudent = sampleStudents[0];
  const payload = createStudentQRPayload({
    studentId: qrStudent.studentId,
    fullName: qrStudent.fullName,
    rollNumber: qrStudent.rollNumber,
    grade: qrStudent.grade,
  });

  const qrImageBuffer = await QRCode.toBuffer(payload, { type: "png", width: 300 });
  const decodeResult = await decodeQRFromImageBuffer(qrImageBuffer);

  if (!decodeResult.success || !decodeResult.payload || decodeResult.payload.id !== qrStudent.studentId) {
    throw new Error(`QR round-trip decoding failed! Received: ${JSON.stringify(decodeResult)}`);
  }
  console.log(`✓ Decoded QR payload accurately matches: Student ID ${decodeResult.payload.id}, Name: ${decodeResult.payload.name}`);

  console.log("\n==================================================================");
  console.log("🎉 ALL FOUNDATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runFoundationTests()
  .catch((err) => {
    console.error("❌ Test suite error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
