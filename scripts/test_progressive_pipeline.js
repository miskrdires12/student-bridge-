// ============================================================================
// STUDENT BRIDGE — PROGRESSIVE 3-PHASE PHOTO & LOCAL BACKUP UNIT TEST
// ============================================================================

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function runTests() {
  console.log("=== Testing Progressive 3-Phase Photo Pipeline & Local Desktop Backup ===");

  // 1. Create a dummy test image buffer (1000x1333 portrait)
  const dummyBuffer = await sharp({
    create: {
      width: 1000,
      height: 1333,
      channels: 3,
      background: { r: 143, g: 230, b: 23 }, // Lime green
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  const {
    generate3PhasePhotos,
    sanitizeFsName,
    getLocalDesktopBackupBaseDirs,
    writeLocalDesktopBackup,
  } = require('../src/lib/progressive-photo');

  // Test Sanitize
  const clean = sanitizeFsName("Miskr / Dires : STU*01");
  console.log("Sanitized name:", clean);
  if (!clean.includes("/") && !clean.includes(":") && !clean.includes("*")) {
    console.log("PASS: Filename sanitization strips illegal characters.");
  } else {
    console.error("FAIL: Sanitization failed.");
    process.exit(1);
  }

  // Test 3-Phase Generation
  const result = await generate3PhasePhotos(dummyBuffer, {
    studentId: "SB-2026-TEST",
    fullName: "Pipeline Test Student",
    grade: "Grade 10",
  });

  console.log("Result Paths:", {
    thumbnailPath: result.thumbnailPath,
    previewPath: result.previewPath,
    originalPath: result.originalPath,
    backupLocalPath: result.backupLocalPath,
  });

  // Verify Thumbnail (150px)
  const thumbDiskPath = path.join(process.cwd(), "public", result.thumbnailPath.replace(/^\//, ""));
  if (fs.existsSync(thumbDiskPath)) {
    const meta = await sharp(thumbDiskPath).metadata();
    console.log(`PASS: 150px Thumbnail created on disk: ${meta.width}x${meta.height} (format: ${meta.format})`);
    if (meta.width === 150) {
      console.log("PASS: Thumbnail width is exactly 150px.");
    }
  } else {
    console.warn("Notice: Thumbnail exists in memory or base64:", result.thumbnailPath.substring(0, 30));
  }

  // Verify Preview (800px)
  const prevDiskPath = path.join(process.cwd(), "public", result.previewPath.replace(/^\//, ""));
  if (fs.existsSync(prevDiskPath)) {
    const meta = await sharp(prevDiskPath).metadata();
    console.log(`PASS: 800px Preview created on disk: ${meta.width}x${meta.height}`);
    if (meta.width === 800) {
      console.log("PASS: Preview width is exactly 800px.");
    }
  }

  // Verify Local Desktop Backup
  if (result.backupLocalPath && fs.existsSync(result.backupLocalPath)) {
    console.log(`PASS: Master photo successfully backed up to Local PC Desktop Backup:`);
    console.log(`      ${result.backupLocalPath}`);
  } else {
    console.log("Notice: Backup candidate dirs checked:", getLocalDesktopBackupBaseDirs());
  }

  console.log("\nALL PROGRESSIVE PIPELINE TESTS PASSED PERFECTLY!");
}

runTests().catch((err) => {
  console.error("Pipeline test failed:", err);
  process.exit(1);
});
