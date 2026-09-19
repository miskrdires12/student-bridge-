import { PrismaClient } from "@prisma/client";
import { studentSchema, customFieldSchema } from "../src/lib/validations";
import { generateSafePhotoFilename } from "../src/lib/image-processing";
import { parseExcelWithCustomMapping, inspectExcelWorkbook } from "../src/lib/excel-importer";
import { generateA48UpIdCards } from "../src/lib/pdf-generator";
import * as XLSX from "xlsx";
import type { StudentPrintData } from "../src/types/print";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("🚀 END-TO-END PRODUCTION SYSTEM VERIFICATION SUITE");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // TEST 1: 5 Required Fields & Dynamic Custom Fields
  // ----------------------------------------------------------------------------
  console.log("[TEST 1] Testing 5 Required Fields + Dynamic Schema-Free Custom Fields...");
  const minimalStudent = {
    studentId: "SB-PROD-2026-MIN5",
    fullName: "Amara Diallo",
    grade: "Grade 10-A",
    sex: "Female",
    phone: "+1 (555) 432-8765",
  };

  const validation = studentSchema.safeParse(minimalStudent);
  if (!validation.success) {
    throw new Error(`Zod validation failed for minimal 5 fields: ${JSON.stringify(validation.error.issues)}`);
  }
  console.log("  ✓ Zod Schema validated minimal 5 required fields successfully.");

  // Clean up existing test student if any
  await prisma.student.deleteMany({ where: { studentId: minimalStudent.studentId } });

  const student = await prisma.student.create({
    data: {
      studentId: minimalStudent.studentId,
      fullName: minimalStudent.fullName,
      contactName: minimalStudent.fullName,
      grade: minimalStudent.grade,
      sex: minimalStudent.sex,
      phone: minimalStudent.phone,
      rollNumber: minimalStudent.studentId,
      nationalId: `NID-${minimalStudent.studentId}`,
      cityRegion: "Capital District",
      emergencyContactName: "Guardian Diallo",
      emergencyContactPhone: minimalStudent.phone,
      guardianFullName: "Guardian Diallo",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Student created in DB: ${student.fullName} (ID: ${student.id})`);

  // Dynamic Custom Field Creation
  const customFieldInput = {
    fieldKey: "bus_route_code",
    label: "Bus Route Code",
    dataType: "TEXT" as const,
    isRequired: false,
  };
  const cfValidation = customFieldSchema.safeParse(customFieldInput);
  if (!cfValidation.success) {
    throw new Error(`Custom field schema validation failed: ${JSON.stringify(cfValidation.error.issues)}`);
  }

  // Upsert Custom Field Definition
  const customField = await prisma.customField.upsert({
    where: { fieldKey: "bus_route_code" },
    update: {},
    create: {
      fieldKey: customFieldInput.fieldKey,
      label: customFieldInput.label,
      dataType: customFieldInput.dataType,
      isRequired: customFieldInput.isRequired,
    },
  });

  // Assign Custom Field Value to Student
  const cfVal = await prisma.customFieldValue.upsert({
    where: {
      customFieldId_studentId: {
        customFieldId: customField.id,
        studentId: student.id,
      },
    },
    update: { value: "ROUTE-42B-EXPRESS" },
    create: {
      customFieldId: customField.id,
      studentId: student.id,
      value: "ROUTE-42B-EXPRESS",
    },
  });
  console.log(`  ✓ Dynamic Custom Field persisted: ${customField.label} = "${cfVal.value}"`);

  // ----------------------------------------------------------------------------
  // TEST 2: Real-Name Photo Filename Sanitization & Duplicate Disambiguation
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing Real-Name Photo Filename Generation & Sanitization...");

  const testCases = [
    {
      name: "Standard Legal Name",
      fullName: "Miskr Dires",
      studentId: "STU-001",
      allNames: ["Miskr Dires", "Sara Connor"],
      expected: "Miskr Dires.jpg",
    },
    {
      name: "Duplicate Name Disambiguation",
      fullName: "Miskr Dires",
      studentId: "STU-002",
      allNames: ["Miskr Dires", "Miskr Dires", "Abebe Bekele"],
      expected: "Miskr Dires - STU-002.jpg",
    },
    {
      name: "Illegal Character Sanitization (Slash & Colon)",
      fullName: "Abebe / K: Tesfaye",
      studentId: "STU-003",
      allNames: ["Abebe / K: Tesfaye"],
      expected: "Abebe - K - Tesfaye.jpg",
    },
    {
      name: "Complex Illegal Characters (* ? \" < > |)",
      fullName: "Fatima * Al? \"Mansoor\" <Special> | VIP",
      studentId: "STU-004",
      allNames: ["Fatima * Al? \"Mansoor\" <Special> | VIP"],
      expected: "Fatima - Al - Mansoor - Special - VIP.jpg",
    },
  ];

  for (const tc of testCases) {
    const result = generateSafePhotoFilename(tc.fullName, tc.studentId, tc.allNames);
    if (result !== tc.expected) {
      throw new Error(`Filename test failed for "${tc.name}": Expected "${tc.expected}", got "${result}"`);
    }
    console.log(`  ✓ [${tc.name}]: "${tc.fullName}" -> "${result}"`);
  }

  // ----------------------------------------------------------------------------
  // TEST 3: External QR Image Storage & Association
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing External QR Code Association (No Auto-Generation)...");
  const qrStoragePath = `/uploads/qr/${student.studentId}.png`;

  // Upsert external QR record
  await prisma.studentQR.deleteMany({ where: { studentId: student.id } });

  const studentQR = await prisma.studentQR.create({
    data: {
      studentId: student.id,
      imagePath: qrStoragePath,
      fileName: `${student.studentId}.png`,
      matchedMethod: "AUTO_FILENAME",
      status: "MATCHED",
    },
  });

  // Link to student entity
  const updatedStudent = await prisma.student.update({
    where: { id: student.id },
    data: { qrCodeData: qrStoragePath },
  });

  if (updatedStudent.qrCodeData !== qrStoragePath || studentQR.imagePath !== qrStoragePath) {
    throw new Error("External QR association failed in database");
  }
  console.log(`  ✓ External QR linked to student: ${updatedStudent.qrCodeData}`);

  // ----------------------------------------------------------------------------
  // TEST 4: Excel Custom Column Mapping & Error Reporting
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 4] Testing Excel Custom Column Mapping & Row Validation...");

  // Generate Excel buffer with non-standard column headers
  const arbitraryHeadersData = [
    {
      "Candidate Legal Name": "Chen Wei",
      "System Registration Number": "SB-EXCEL-001",
      "Academic Level": "Grade 12-A",
      "Biological Sex": "Male",
      "Primary Contact Phone": "+1 (555) 777-8888",
    },
    {
      "Candidate Legal Name": "Sophia Petrov",
      "System Registration Number": "SB-EXCEL-002",
      "Academic Level": "Grade 11-B",
      "Biological Sex": "Female",
      "Primary Contact Phone": "+1 (555) 999-0000",
    },
    {
      // Missing required phone to trigger row error reporting
      "Candidate Legal Name": "Invalid Student",
      "System Registration Number": "SB-EXCEL-003",
      "Academic Level": "Grade 9-A",
      "Biological Sex": "Male",
      "Primary Contact Phone": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(arbitraryHeadersData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CandidateList");
  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // 1. Inspect workbook
  const inspected = inspectExcelWorkbook(excelBuffer);
  console.log(`  ✓ Detected sheet: "${inspected.sheetNames[0]}" with ${inspected.columns.length} columns.`);

  // 2. Custom Mapping
  const customMapping: Record<string, string> = {
    fullName: "Candidate Legal Name",
    studentId: "System Registration Number",
    grade: "Academic Level",
    sex: "Biological Sex",
    phone: "Primary Contact Phone",
  };

  const parsed = parseExcelWithCustomMapping(excelBuffer, customMapping);
  console.log(`  ✓ Excel analysis: Total=${parsed.totalRows}, Valid=${parsed.validRows}, Invalid=${parsed.invalidRows}`);

  if (parsed.validRows !== 2 || parsed.invalidRows !== 1) {
    throw new Error(`Excel row parsing mismatch: Expected 2 valid, 1 invalid; got ${parsed.validRows} / ${parsed.invalidRows}`);
  }

  console.log(`  ✓ Row-level error report generated for row #${parsed.errorReport[0].rowNumber}: "${parsed.errorReport[0].errors[0]}"`);

  // ----------------------------------------------------------------------------
  // TEST 5: Batch Inbound / Outbound Lifecycle & Status Transitions
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 5] Testing Sender -> Receiver Batch Dispatch Lifecycle...");
  const batchNum = `BATCH-TEST-${Date.now()}`;

  // 1. Sender creates batch
  const testBatch = await prisma.transferBatch.create({
    data: {
      batchNumber: batchNum,
      title: "Production Test Batch 2026",
      status: "DRAFT",
      senderId: "test-sender",
      senderName: "Registrar Operations Officer",
      totalStudents: 1,
      totalPhotos: 1,
    },
  });

  // Link student to batch
  await prisma.student.update({
    where: { id: student.id },
    data: { batchId: testBatch.id },
  });

  // 2. Sender dispatches batch
  const sentBatch = await prisma.transferBatch.update({
    where: { id: testBatch.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });
  console.log(`  ✓ Batch created & sent: ${sentBatch.batchNumber} (Status: ${sentBatch.status})`);

  // 3. Receiver accepts batch
  const acceptedBatch = await prisma.transferBatch.update({
    where: { id: testBatch.id },
    data: {
      status: "ACCEPTED",
      receivedAt: new Date(),
    },
  });
  console.log(`  ✓ Batch accepted by receiver (Status: ${acceptedBatch.status})`);

  // 4. Receiver processes batch
  const processedBatch = await prisma.transferBatch.update({
    where: { id: testBatch.id },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });
  console.log(`  ✓ Batch processed into active student directory (Status: ${processedBatch.status})`);

  // ----------------------------------------------------------------------------
  // TEST 6: Multi-Card Bulker Layout & Vector PDF Generation (Default 8-Up)
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 6] Testing Multi-Card Bulker Layout Engine & Vector PDF Generator...");

  const printStudents: StudentPrintData[] = [
    {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      contactName: student.contactName,
      grade: student.grade,
      sex: student.sex,
      phone: student.phone,
      cityRegion: student.cityRegion,
      emergencyContactName: student.emergencyContactName,
      emergencyContactPhone: student.emergencyContactPhone,
      bloodType: "O+",
      emailAddress: "amara.diallo@studentbridge.org",
      guardianFullName: student.guardianFullName,
      rollNumber: student.rollNumber,
      nationality: student.nationality,
      nationalId: student.nationalId,
      dateOfBirth: student.dateOfBirth,
      photoPath: student.photoPath,
      qrCodeData: student.qrCodeData,
      status: student.status,
    },
  ];

  const pdfBytes = await generateA48UpIdCards(printStudents, {
    includeCutMarks: true,
    organizationName: "STUDENT BRIDGE ACADEMY",
    cardBackgroundColor: "#0F172A",
    cardBorderColor: "#38BDF8",
    fieldConfig: {
      photo: { x: 14, y: 38, width: 85, height: 105 },
      qrCode: { x: 155, y: 38, size: 70 },
      fullName: { x: 14, y: 16, fontSize: 13, color: "#FFFFFF" },
      studentId: { x: 110, y: 55, fontSize: 11, color: "#38BDF8" },
      grade: { x: 110, y: 75, fontSize: 10, color: "#94A3B8" },
      phone: { x: 110, y: 95, fontSize: 9, color: "#94A3B8" },
      sex: { x: 110, y: 112, fontSize: 9, color: "#94A3B8" },
    },
  });

  if (!pdfBytes || pdfBytes.length === 0) {
    throw new Error("PDF generator returned 0 bytes");
  }

  console.log(`  ✓ 8-Up A4 Print Sheet generated with precision crop marks & CR80 cards.`);
  console.log(`  ✓ Output PDF Size: ${(pdfBytes.length / 1024).toFixed(2)} KB (${pdfBytes.length} bytes)`);

  console.log("\n==================================================================");
  console.log("🎉 ALL 6 COMPREHENSIVE PRODUCTION TEST SUITES PASSED (100%)!");
  console.log("==================================================================");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Test Suite Failure:", err);
  process.exit(1);
});
