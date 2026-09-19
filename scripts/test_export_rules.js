const {
  getReceiverExcelHeaders,
  formatStudentForReceiverExcel,
} = require('../src/lib/export-utils');

console.log("=== Testing Export Logic ===");

const headersNoBlood = getReceiverExcelHeaders(false);
console.log("Headers (no blood):", headersNoBlood);
if (headersNoBlood.length === 7 && !headersNoBlood.includes("BloodType") && headersNoBlood.includes("EmergencyPhone")) {
  console.log("PASS: Headers without blood type has 7 columns and NO BloodType.");
} else {
  console.error("FAIL: Headers without blood type incorrect.");
  process.exit(1);
}

const headersWithBlood = getReceiverExcelHeaders(true);
console.log("Headers (with blood):", headersWithBlood);
if (headersWithBlood.length === 8 && headersWithBlood[6] === "BloodType") {
  console.log("PASS: Headers with blood type has 8 columns and BloodType at index 6.");
} else {
  console.error("FAIL: Headers with blood type incorrect.");
  process.exit(1);
}

const studentWithoutBlood = {
  studentId: "SB-001",
  fullName: "Abebe Bikila",
  sex: "Male",
  grade: "Grade 9",
  phone: "0911223344",
  emergencyContactPhone: "0922334455",
  photoPath: "/uploads/photos/Abebe Bikila.jpg",
  bloodType: null,
};

const studentWithBlood = {
  studentId: "SB-002",
  fullName: "Derartu Tulu",
  sex: "Female",
  grade: "Grade 10",
  phone: "0922334455",
  emergencyContactPhone: "0933445566",
  photoPath: "/uploads/photos/Derartu Tulu.jpg",
  bloodType: "A+",
};

const row1 = formatStudentForReceiverExcel(studentWithoutBlood, false);
console.log("Row 1 (no blood col):", row1);
if (row1.length === 7 && row1[4] === "251911223344" && row1[5] === "251922334455") {
  console.log("PASS: Row 1 matches standard 7 columns with emergency phone.");
} else {
  console.error("FAIL: Row 1 length or phone incorrect.");
  process.exit(1);
}

const row2WithBlood = formatStudentForReceiverExcel(studentWithBlood, true);
console.log("Row 2 (with blood col):", row2WithBlood);
if (row2WithBlood.length === 8 && row2WithBlood[6] === "A+") {
  console.log("PASS: Row 2 has 8 columns with exact blood type 'A+'.");
} else {
  console.error("FAIL: Row 2 blood type output incorrect.");
  process.exit(1);
}

const row1InBloodBatch = formatStudentForReceiverExcel(studentWithoutBlood, true);
console.log("Row 1 in batch with blood col:", row1InBloodBatch);
if (row1InBloodBatch.length === 8 && row1InBloodBatch[6] === "") {
  console.log("PASS: Row 1 in blood batch has empty string '' (blank, never 'Unknown').");
} else {
  console.error("FAIL: Row 1 blood type is not empty string.");
  process.exit(1);
}

console.log("\nALL EXPORT UNIT TESTS PASSED PERFECTLY!");
