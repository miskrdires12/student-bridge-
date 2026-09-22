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
const stagingDir = path.join(projectRoot, "yegara_staging");
const zipPath = path.join(projectRoot, "student-bridge-yegara-production.zip");

console.log("======================================================");
console.log("🚀 Building Yegara Hosting (cPanel / CloudLinux) Production Package");
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
  console.log("🧹 Cleaning old staging directory...");
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

if (fs.existsSync(zipPath)) {
  console.log("🧹 Removing existing zip archive...");
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

// 4. Copy root .next/static/ into stagingDir/.next/static/
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
  console.log("🗄️ Copying prisma schema...");
  copyDirSync(rootPrismaDir, stagingPrismaDir);
  console.log("✅ Prisma schema copied successfully.");
}

// 6. Ensure all Linux Prisma Query Engines (debian-openssl and rhel-openssl) are present in staging
const rootPrismaClientDir = path.join(projectRoot, "node_modules", ".prisma", "client");
const stagingPrismaClientDir = path.join(stagingDir, "node_modules", ".prisma", "client");
fs.mkdirSync(stagingPrismaClientDir, { recursive: true });

if (fs.existsSync(rootPrismaClientDir)) {
  const engineFiles = fs.readdirSync(rootPrismaClientDir).filter((f) => f.includes("query_engine"));
  for (const f of engineFiles) {
    const dest = path.join(stagingPrismaClientDir, f);
    fs.copyFileSync(path.join(rootPrismaClientDir, f), dest);
    console.log(`📦 Synced query engine into staging: ${f}`);
  }
}

// 7. Write universal cPanel CloudLinux Passenger entrypoint: app.js
const appJsContent = `// ============================================================================
// SILICON LABS — YEGARA CPANEL PHUSION PASSENGER ENTRYPOINT
// ============================================================================
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

// Passenger / cPanel CloudLinux port routing
const port = process.env.PORT || 3000;
console.log('[Yegara Hosting] Student Bridge starting on port ' + port + '...');

// Start standalone Next.js server
require('./server.js');
`;
fs.writeFileSync(path.join(stagingDir, "app.js"), appJsContent);
console.log("✅ cPanel Passenger entrypoint (app.js) created.");

// 8. Write production environment file (.env and .env.production)
const sourceEnvPath = path.join(projectRoot, ".env");
let envContent = "";
if (fs.existsSync(sourceEnvPath)) {
  envContent = fs.readFileSync(sourceEnvPath, "utf-8");
  // Ensure NODE_ENV is production in deployment
  envContent = envContent.replace(/NODE_ENV="?development"?/, 'NODE_ENV="production"');
  if (!envContent.includes("PORT=")) {
    envContent += "\nPORT=3000\n";
  }
} else {
  envContent = `DATABASE_URL="postgresql://postgres.hiwhmpuhhakguckckuqv:1998nehase10@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?schema=cloudflare&sslmode=require"
AUTH_SECRET="student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_SUPABASE_URL="https://hiwhmpuhhakguckckuqv.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpd2htcHVoaGFrZ3Vja2NrdXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0OTkyMjYsImV4cCI6MjEwNTA3NTIyNn0.1v1JUKWLxEfTPDlp6h1QBpf34MVKoW5hGYHt7quE8k0"
R2_ACCOUNT_ID="a5b6150294de0fedb8e0cd789114b939"
R2_ACCESS_KEY_ID="027a4326e81560169769fa980c0e8f1f"
R2_SECRET_ACCESS_KEY="7c70dd1d4a42bcb96da463e2ae5756713b4d1fceefe00241393182d8bf926ed6"
R2_BUCKET_NAME="siliconlabs"
R2_ENDPOINT="https://a5b6150294de0fedb8e0cd789114b939.r2.cloudflarestorage.com"
R2_PUBLIC_BASE_URL="https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev"
NEXT_PUBLIC_R2_PUBLIC_BASE_URL="https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev"
SYNC_TOPIC="sb_prod_sync_cloudflare_r2_v1"
NEXT_PUBLIC_SYNC_TOPIC="sb_prod_sync_cloudflare_r2_v1"
`;
}
fs.writeFileSync(path.join(stagingDir, ".env"), envContent);
fs.writeFileSync(path.join(stagingDir, ".env.production"), envContent);
console.log("✅ Production .env and .env.production configured with Cloudflare R2 and Supabase credentials.");

// 9. Write .htaccess for cPanel
const htaccessContent = `# ============================================================================
# SILICON LABS — YEGARA CPANEL REVERSE PROXY & PASSENGER CONFIG
# ============================================================================
DirectoryIndex ""
RewriteEngine On

# Pass through authorization header for JWT / session tokens
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

# Static cache optimizations for images, fonts and scripts
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
`;
fs.writeFileSync(path.join(stagingDir, ".htaccess"), htaccessContent);
console.log("✅ .htaccess configured for cPanel HTTP routing.");

// 10. Compress stagingDir into student-bridge-yegara-production.zip
console.log("🗜️ Compressing into production zip package...");
const output = fs.createWriteStream(zipPath);
const archive = new ZipArchive({
  zlib: { level: 9 }, // Maximum compression
});

output.on("close", () => {
  // Clean up staging folder
  console.log("🧹 Cleaning up staging folder (yegara_staging/)...");
  try {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    console.log("✅ Staging folder cleaned up.");
  } catch (cleanErr) {
    console.warn("⚠️ Note cleaning staging:", cleanErr.message);
  }

  const stat = fs.statSync(zipPath);
  const totalBytes = stat.size;
  const mb = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log(`\n======================================================`);
  console.log(`🎉 YEGARA HOSTING PRODUCTION PACKAGE READY!`);
  console.log(`======================================================`);
  console.log(`📍 Archive Path: ${path.resolve(zipPath)}`);
  console.log(`📦 Size: ${totalBytes.toLocaleString()} bytes (${mb} MB)`);
  console.log(`🚀 Ready for 1-click upload in Yegara cPanel File Manager!`);
  console.log(`======================================================\n`);
});

archive.on("error", (err) => {
  console.error("❌ Archive error:", err);
  process.exit(1);
});

archive.pipe(output);

// Walk stagingDir and add all files
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
