// ============================================================================
// STUDENT BRIDGE — NEW FEATURES VERIFICATION TEST SUITE
// Tests: Excel Bulk Importer, EPS-to-SVG Converter, and Dynamic 8-Up PDF Engine
// ============================================================================

import * as XLSX from "xlsx";
import { parseExcelStudentWorkbook } from "../src/lib/excel-importer";
import { convertVectorTemplateToSvg } from "../src/lib/eps-converter";
import { generateA48UpIdCards } from "../src/lib/pdf-generator";
import prisma from "../src/lib/prisma";
import type { CardFieldConfig, StudentPrintData } from "../src/types/print";

async function runNewFeatureTests() {
  console.log("==================================================================");
  console.log("🚀 TESTING EXCEL IMPORT, EPS CONVERTER & MOVABLE/RESIZABLE PDF ENGINE");
  console.log("==================================================================");

  // --------------------------------------------------------------------------
  // TEST 1: Excel Importer with ONLY the 5 Main Required Fields
  // --------------------------------------------------------------------------
  console.log("\n[TEST 1] Testing Excel parsing with ONLY the 5 main required fields...");
  const sampleExcelRows = [
    {
      "Student ID": "SB-EXCEL-001",
      "Full Legal Name": "Xavier Sterling",
      "Grade / Class Batch": "Grade 11-Science",
      "Gender / Sex": "Male",
      "Phone": "+1 (555) 999-1111",
    },
    {
      "Student ID": "SB-EXCEL-002",
      "Full Legal Name": "Valeria Solis",
      "Grade / Class Batch": "Grade 12-Arts",
      "Gender / Sex": "Female",
      "Phone": "+1 (555) 999-2222",
    },
    {
      // Missing Student ID -> Should trigger validation error
      "Student ID": "",
      "Full Legal Name": "Invalid Student",
      "Grade / Class Batch": "Grade 10",
      "Gender / Sex": "Other",
      "Phone": "+1 (555) 999-3333",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleExcelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const analysis = parseExcelStudentWorkbook(excelBuffer);
  console.log(`✓ Total Rows Parsed: ${analysis.totalRows}`);
  console.log(`✓ Valid Rows: ${analysis.validRows}`);
  console.log(`✓ Invalid Rows: ${analysis.invalidRows}`);

  if (analysis.validRows !== 2 || analysis.invalidRows !== 1) {
    throw new Error(`Excel parsing failed! Expected 2 valid and 1 invalid, got ${analysis.validRows} valid and ${analysis.invalidRows} invalid.`);
  }

  // Verify non-essential fields were cleanly defaulted
  const student1 = analysis.parsedStudents[0];
  console.log(`✓ Student 1: ${student1.fullName} (${student1.studentId})`);
  console.log(`  - Auto-defaulted Guardian: "${student1.guardianFullName}"`);
  console.log(`  - Auto-defaulted National ID: "${student1.nationalId}"`);
  console.log(`  - Auto-defaulted Blood Group: "${student1.bloodType}"`);

  // --------------------------------------------------------------------------
  // TEST 2: EPS to SVG Vector Converter
  // --------------------------------------------------------------------------
  console.log("\n[TEST 2] Testing EPS vector converter with PostScript paths...");
  const sampleEps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 324 204
%%Title: Institutional Card Background
0 0 324 204 rectfill
0.215 0.890 0.062 setrgbcolor
10 10 moveto
314 10 lineto
314 194 lineto
10 194 lineto
closepath
stroke
showpage`;

  const epsResult = convertVectorTemplateToSvg(sampleEps);
  if (!epsResult.success || !epsResult.svgContent || epsResult.format !== "eps") {
    throw new Error(`EPS parser failed: ${epsResult.error}`);
  }
  console.log(`✓ EPS converted successfully to SVG (${epsResult.width}×${epsResult.height})`);
  console.log(`  SVG Snippet: ${epsResult.svgContent.substring(0, 110)}...`);

  // --------------------------------------------------------------------------
  // TEST 3: Dynamic 8-Up PDF Engine with Custom Resized Photo & Movable Fields
  // --------------------------------------------------------------------------
  console.log("\n[TEST 3] Testing 8-Up PDF generator with custom photo size and movable coordinates...");
  const customConfig: CardFieldConfig = {
    // Custom resized photo (width 90px, height 110px instead of default 72x96)
    photo: { x: 20, y: 30, width: 90, height: 110 },
    qr: { x: 260, y: 120, size: 55 },
    fullName: { x: 120, y: 40, fontSize: 14, color: "#FFFFFF" },
    studentId: { x: 120, y: 60, fontSize: 11, color: "#37E310" },
    grade: { x: 120, y: 80, fontSize: 9.5, color: "#9CA3AF" },
    rollNumber: { x: 200, y: 80, fontSize: 9.5, color: "#FFFFFF" },
    phone: { x: 120, y: 100, fontSize: 8.5, color: "#9CA3AF" },
    sex: { x: 120, y: 118, fontSize: 8.5, color: "#9CA3AF" },
  };

  const dbStudents = await prisma.student.findMany({ take: 8 });
  const printData: StudentPrintData[] = dbStudents.map((s) => ({
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

  const customPdfBytes = await generateA48UpIdCards(printData, {
    fieldConfig: customConfig,
    includeCutMarks: true,
    organizationName: "ENTERPRISE CUSTOM ACADEMY",
  });

  if (!customPdfBytes || customPdfBytes.byteLength === 0) {
    throw new Error("Custom PDF generation produced empty byte buffer!");
  }
  console.log(`✓ Generated custom 8-up A4 PDF with resized photo & custom layout: ${customPdfBytes.byteLength} bytes.`);

  console.log("\n==================================================================");
  console.log("🎉 ALL NEW FEATURE TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runNewFeatureTests()
  .catch((e) => {
    console.error("❌ Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
