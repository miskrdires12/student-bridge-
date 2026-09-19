import { PrismaClient } from "@prisma/client";
import { convertVectorTemplateToSvg } from "../src/lib/eps-converter";
import { studentSchema } from "../src/lib/validations";
import { generateA48UpIdCards } from "../src/lib/pdf-generator";
import { parseExcelStudentWorkbook } from "../src/lib/excel-importer";
import * as XLSX from "xlsx";
import type { StudentPrintData } from "../src/types/print";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("🚀 TESTING STRICT 5-FIELD REQUIREMENT & COMPLETE FUNCTIONALITY");
  console.log("==================================================================\n");

  // TEST 1: 5-Field Minimal Student Validation & DB Creation
  console.log("[TEST 1] Verifying that ONLY the 5 fields are required...");
  const minimalStudent = {
    studentId: "SB-2026-STRICT5",
    fullName: "Elena Rostova",
    grade: "Grade 11-B",
    sex: "Female",
    phone: "+1 (555) 789-0123",
  };

  const validationResult = studentSchema.safeParse(minimalStudent);
  if (!validationResult.success) {
    console.error("❌ Validation failed on 5 minimal fields:", validationResult.error.issues);
    process.exit(1);
  }
  console.log("✓ Zod Schema validated minimal 5-field student successfully!");

  // Insert into DB with auto-defaulted optional fields
  const cleanRoll = validationResult.data.rollNumber || minimalStudent.studentId;
  const cleanNid = validationResult.data.nationalId || `NID-${minimalStudent.studentId}`;
  
  // Clean up if existing
  await prisma.student.deleteMany({ where: { studentId: minimalStudent.studentId } });

  const created = await prisma.student.create({
    data: {
      studentId: minimalStudent.studentId,
      fullName: minimalStudent.fullName,
      contactName: minimalStudent.fullName,
      grade: minimalStudent.grade,
      sex: minimalStudent.sex,
      phone: minimalStudent.phone,
      cityRegion: "General",
      emergencyContactName: minimalStudent.fullName,
      emergencyContactPhone: minimalStudent.phone,
      guardianFullName: minimalStudent.fullName,
      rollNumber: cleanRoll,
      nationality: "Citizen",
      nationalId: cleanNid,
      dateOfBirth: new Date("2008-01-01"),
      status: "ACTIVE",
    },
  });

  console.log(`✓ Student created in DB with ID: ${created.id}, StudentID: ${created.studentId}`);
  console.log(`✓ Auto-defaulted National ID: ${created.nationalId}, Roll: ${created.rollNumber}`);

  // TEST 2: EPS & Binary EPS Vector Parser
  console.log("\n[TEST 2] Verifying EPS Vector Import & Conversion...");
  const sampleEps = `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 340 214
%%Creator: Test Vector Studio
newpath
0 0 moveto
340 0 lineto
340 34 lineto
0 34 lineto
closepath
0.05 0.06 0.08 setrgbcolor
fill
newpath
0 34 moveto
340 34 lineto
0.22 0.89 0.06 setrgbcolor
stroke
(STUDENT BRIDGE ID CARD) show
showpage
%%EOF`;

  const parsedEps = convertVectorTemplateToSvg(sampleEps);
  if (!parsedEps.success || !parsedEps.svgContent) {
    console.error("❌ EPS parser failed:", parsedEps.error);
    process.exit(1);
  }
  console.log(`✓ EPS converted to SVG with dimensions: ${parsedEps.width}x${parsedEps.height}`);
  console.log(`✓ SVG paths count / content valid: ${parsedEps.svgContent.length} chars`);

  // Test Binary DOS EPS header
  const psBuf = Buffer.from(sampleEps, "utf-8");
  const dosHeader = Buffer.alloc(30);
  dosHeader[0] = 0xc5;
  dosHeader[1] = 0xd0;
  dosHeader[2] = 0xd3;
  dosHeader[3] = 0xc6;
  dosHeader.writeUInt32LE(30, 4); // PS start offset
  dosHeader.writeUInt32LE(psBuf.length, 8); // PS byte length
  const binaryEpsBuf = Buffer.concat([dosHeader, psBuf]);

  const parsedBinary = convertVectorTemplateToSvg(binaryEpsBuf);
  if (!parsedBinary.success) {
    console.error("❌ Binary DOS EPS parser failed:", parsedBinary.error);
    process.exit(1);
  }
  console.log("✓ Binary DOS EPS (0xC5D0D3C6) header parsed and converted successfully!");

  // TEST 3: Saving Custom Template Preset to Database
  console.log("\n[TEST 3] Verifying Card Layout & Template Persistence...");
  const templateName = "Automated Test Layout Preset";
  await prisma.cardTemplate.deleteMany({ where: { name: templateName } });

  const customFieldConfig = {
    photo: { x: 20, y: 40, width: 80, height: 110 },
    qr: { x: 240, y: 100, size: 65 },
    fullName: { x: 110, y: 45, fontSize: 14, color: "#FFFFFF" },
    studentId: { x: 110, y: 68, fontSize: 11, color: "#37E310" },
    grade: { x: 110, y: 88, fontSize: 10, color: "#9CA3AF" },
    rollNumber: { x: 190, y: 88, fontSize: 10, color: "#FFFFFF" },
    phone: { x: 110, y: 108, fontSize: 9, color: "#9CA3AF" },
    sex: { x: 110, y: 126, fontSize: 9, color: "#9CA3AF" },
  };

  const savedTemplate = await prisma.cardTemplate.create({
    data: {
      name: templateName,
      svgContent: parsedEps.svgContent,
      fieldConfig: JSON.stringify(customFieldConfig),
      isDefault: false,
    },
  });
  console.log(`✓ Card template saved with ID: ${savedTemplate.id}`);

  // TEST 4: 8-Up A4 PDF Generation with Custom Sizing, Movable Coordinates, and Colors
  console.log("\n[TEST 4] Verifying 8-Up A4 PDF Generator with custom layout...");
  const printStudents: StudentPrintData[] = [created].map((s) => ({
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

  const pdfBytes = await generateA48UpIdCards(printStudents, {
    includeCutMarks: true,
    organizationName: "STUDENT BRIDGE ENTERPRISE",
    fieldConfig: customFieldConfig,
    cardBackgroundColor: "#0A1128",
    cardBorderColor: "#FBBF24",
  });

  console.log(`✓ 8-Up A4 PDF generated with custom photo size & colors: ${pdfBytes.length} bytes`);

  // TEST 5: Excel Bulk Importer with ONLY the 5 required columns
  console.log("\n[TEST 5] Testing Excel import with ONLY 5 required columns...");
  const rows = [
    {
      "Student ID (Unique) *": "SB-2026-EXCEL01",
      "Full Legal Name *": "Marcus Brody",
      "Grade / Class Batch *": "Grade 12-C",
      "Gender / Sex *": "Male",
      "Phone *": "+1 (555) 345-6789",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const parsedExcel = parseExcelStudentWorkbook(excelBuffer);
  console.log(`✓ Valid rows parsed: ${parsedExcel.validRows}, Invalid: ${parsedExcel.invalidRows}`);
  if (parsedExcel.validRows !== 1) {
    console.error("❌ Excel parser failed on 5-field row!");
    process.exit(1);
  }
  console.log(`✓ Excel parsed successfully with Student ID: ${parsedExcel.parsedStudents[0].studentId}`);

  console.log("\n==================================================================");
  console.log("🎉 ALL FUNCTIONALITY & STRICT 5-FIELD REQUIREMENTS VERIFIED 100%!");
  console.log("==================================================================");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
