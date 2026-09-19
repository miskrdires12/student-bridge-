import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { ZipArchive } = require("archiver");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const standaloneDir = path.join(projectRoot, ".next", "standalone");
const stagingDir = path.join(projectRoot, "lean_staging");
const zipPath = path.join(projectRoot, "lean-deploy.zip");

console.log("======================================================");
console.log("🚀 Building Lean cPanel Passenger Deployment Bundle");
console.log("======================================================");
console.log(`📁 Project Root: ${projectRoot}`);
console.log(`📁 Standalone Source: ${standaloneDir}`);
console.log(`📁 Staging Destination: ${stagingDir}`);
console.log(`📦 Output Archive: ${zipPath}`);

if (!fs.existsSync(standaloneDir)) {
  console.error("❌ Error: .next/standalone does not exist! Please run 'npm run build' first.");
  process.exit(1);
}

// 1. Clean and prepare staging directory
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Helper to copy recursively
function copyDirSync(src, dest, filterFn = null) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (filterFn && !filterFn(entry.name, path.join(src, entry.name))) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy standalone build into staging
console.log("📦 Copying standalone runtime into staging root...");
copyDirSync(standaloneDir, stagingDir, (name) => {
  // Exclude source maps and temp files
  if (name.endsWith(".map") || name.includes(".tmp")) return false;
  return true;
});

// Verify server.js exists at root of staging
const serverJsPath = path.join(stagingDir, "server.js");
if (!fs.existsSync(serverJsPath)) {
  console.error("❌ Error: server.js not found at root of standalone build!");
  process.exit(1);
}
console.log("✅ Verified: server.js is located at the root of staging.");

// 3. Copy root public/ into stagingDir/public/
const rootPublicDir = path.join(projectRoot, "public");
const stagingPublicDir = path.join(stagingDir, "public");
if (fs.existsSync(rootPublicDir)) {
  console.log("🖼️ Copying complete public directory...");
  copyDirSync(rootPublicDir, stagingPublicDir);
  console.log("✅ Public assets copied successfully.");
}

// 4. Copy root .next/static/ into stagingDir/.next/static/ (excluding .map files)
const rootStaticDir = path.join(projectRoot, ".next", "static");
const stagingStaticDir = path.join(stagingDir, ".next", "static");
if (fs.existsSync(rootStaticDir)) {
  console.log("⚡ Copying .next/static chunks and stylesheets (excluding source maps)...");
  copyDirSync(rootStaticDir, stagingStaticDir, (name) => !name.endsWith(".map"));
  console.log("✅ .next/static copied successfully.");
}

// 5. Copy root prisma/ into stagingDir/prisma/
const rootPrismaDir = path.join(projectRoot, "prisma");
const stagingPrismaDir = path.join(stagingDir, "prisma");
if (fs.existsSync(rootPrismaDir)) {
  console.log("🗄️ Copying prisma schema and SQLite database...");
  copyDirSync(rootPrismaDir, stagingPrismaDir);
  console.log("✅ Prisma schema and database copied successfully.");
}

// Ensure staging prisma/dev.db has 0666 permissions
const stagingDevDb = path.join(stagingPrismaDir, "dev.db");
if (fs.existsSync(stagingDevDb)) {
  try {
    fs.chmodSync(stagingDevDb, 0o666);
    console.log("🔒 Ensured prisma/dev.db has read/write permissions (0o666).");
  } catch (e) {}
}

// Also copy root dev.db fallback
const devDbSrc = path.join(rootPrismaDir, "dev.db");
if (fs.existsSync(devDbSrc)) {
  fs.copyFileSync(devDbSrc, path.join(stagingDir, "dev.db"));
  try {
    fs.chmodSync(path.join(stagingDir, "dev.db"), 0o666);
  } catch (e) {}
}

// 6. Prune and ensure ONLY debian-openssl-1.1.x query engine is bundled
const stagingClientDir = path.join(stagingDir, "node_modules", ".prisma", "client");
const rootClientDir = path.join(projectRoot, "node_modules", ".prisma", "client");
fs.mkdirSync(stagingClientDir, { recursive: true });

// Sync debian 1.1 engine from root if needed
const debianEngineFileName = "libquery_engine-debian-openssl-1.1.x.so.node";
const srcEngine = path.join(rootClientDir, debianEngineFileName);
const destEngine = path.join(stagingClientDir, debianEngineFileName);

if (fs.existsSync(srcEngine) && !fs.existsSync(destEngine)) {
  fs.copyFileSync(srcEngine, destEngine);
}

if (!fs.existsSync(destEngine)) {
  console.error(`❌ CRITICAL: ${debianEngineFileName} not found!`);
  process.exit(1);
}

// Prune all unneeded engines (Windows dll, tmp files, other linux targets) to keep size under 45 MB
console.log("✂️ Pruning unneeded binary engines and temp files from staging...");
const stagingEngineFiles = fs.readdirSync(stagingClientDir);
for (const f of stagingEngineFiles) {
  if (
    f.includes("query_engine-windows") ||
    f.includes(".tmp") ||
    f.includes("rhel-openssl") ||
    f.includes("debian-openssl-3")
  ) {
    try {
      fs.unlinkSync(path.join(stagingClientDir, f));
      console.log(`   Removed unnecessary file: ${f}`);
    } catch (e) {}
  }
}

// 7. Include production .htaccess at root
const rootHtaccess = path.join(projectRoot, ".htaccess");
const stagingHtaccess = path.join(stagingDir, ".htaccess");
if (fs.existsSync(rootHtaccess)) {
  fs.copyFileSync(rootHtaccess, stagingHtaccess);
  console.log("✅ Production .htaccess bundled at root.");
} else {
  console.warn("⚠️ Warning: root .htaccess not found!");
}

// 8. Write production .env file
const envContent = `# ==========================================
# SILICON LABS — PRODUCTION cPanel Node.js 20
# ==========================================
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade"
NEXT_PUBLIC_APP_URL="https://student.siliconlabstech.com"
NODE_ENV="production"
PORT=3000
`;
fs.writeFileSync(path.join(stagingDir, ".env"), envContent);
fs.writeFileSync(path.join(stagingDir, ".env.production"), envContent);

// 9. Compress into lean-deploy.zip using archiver with zlib 9
console.log("🗜️ Compressing lean staging directory into lean-deploy.zip...");

const output = fs.createWriteStream(zipPath);
const archive = new ZipArchive({
  zlib: { level: 9 }, // Maximum compression
});

output.on("close", () => {
  // Clean up staging folder
  console.log("🧹 Cleaning up staging folder (lean_staging/)...");
  try {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    console.log("✅ lean_staging/ cleaned up successfully.");
  } catch (cleanErr) {
    console.warn("⚠️ Note cleaning staging:", cleanErr.message);
  }

  const stat = fs.statSync(zipPath);
  const totalBytes = stat.size;
  const mb = (totalBytes / (1024 * 1024)).toFixed(2);
  const isUnder45 = totalBytes < 45 * 1024 * 1024;

  console.log(`\n======================================================`);
  console.log(`🎉 LEAN DEPLOYMENT BUNDLE READY FOR CPANEL PASSENGER`);
  console.log(`======================================================`);
  console.log(`📍 Exact Absolute Path: ${path.resolve(zipPath)}`);
  console.log(`📦 Exact File Size: ${totalBytes.toLocaleString()} bytes (${mb} MB)`);
  console.log(`🎯 Size Target (< 45 MB): ${isUnder45 ? "PASSED ✅" : "EXCEEDED ⚠️"}`);
  console.log(`======================================================\n`);
});

archive.on("error", (err) => {
  console.error("❌ Archive error:", err);
  process.exit(1);
});

archive.pipe(output);

function addDirectoryToArchive(dir, baseDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      addDirectoryToArchive(fullPath, baseDir);
    } else {
      archive.file(fullPath, { name: relativePath });
    }
  }
}

addDirectoryToArchive(stagingDir, stagingDir);
archive.finalize();
