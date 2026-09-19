# Student Bridge — High-Capacity ID Card Production & Data Transfer System

An enterprise-grade, high-capacity student data transfer, photo management, Canva ID card designer, bulk imposition, and production printing platform built for institutions handling **20,000+ student records**.

Designed with a strict **90/10 Monochromatic White & Black** print shop design system (90% pure white surfaces and canvases, 10% sharp black typography, precision borders, and high-contrast control points).

---

## Key Architecture & Core Workflows

### 1. Dual-Role Architecture (Sender & Receiver Separation)
- **Sender System (`/sender`)**:
  - Direct operator registration (`/register`) with direct, low-latency webcam photo capture.
  - No intermediate photo editing dialogs — capture immediately snaps and attaches the portrait.
  - Multi-student enrollment batch creation and secure encrypted transfer pipeline (`/sender/batches`).
  - Searchable transaction receipts and CSV audit trail (`/sender/receipts`).
  - Real-time enrolled student and photo capture metrics dashboard (`/dashboard`).
- **Receiver System (`/students`, `/bulker`, `/print-engine`, `/designer`)**:
  - High-capacity Student Credential Directory (`/students`) with server-side pagination (25/50/100 per page) and real-time search.
  - Excel/CSV bulk data ingestion (`/students/import`) with automated column matching and duplicate identification.
  - QR-code batch ZIP upload and mapping (`/students/qr-import`).
  - Real-time photo downloads with automatic client-side file renaming to `${student.name}.jpg`.
  - Missing media records display clean blank cells with zero clutter.
  - One-click purge action allowing clean data feeds for fresh enrollment cohorts.

### 2. Canva-Style Interactive ID Card Studio (`/designer`)
- **Direct Dual-Sided Studio**: Front design is active by default; switch seamlessly between Front and Back.
- **Direct Right-Click Context Menu**: Right-click any canvas element or blank area to duplicate, delete, bring to front, send to back, mirror horizontally, center horizontally/vertically, or lock/unlock.
- **Built-in Studio Webcam**: Capture live portraits directly on the card canvas without leaving the designer.
- **Mirroring & Orientation**: Instant 180° horizontal flip/mirroring tool, portrait/landscape orientation toggles, rotation steppers, and CR80 / custom dimension support.
- **Template Portability**: Drag & drop or export JSON and image templates directly to the Bulker engine.

### 3. Bulker & Physical Imposition Engine (`/bulker`)
- **Dynamic Paper Size & Geometry**: Live physical scaling for A4 (210 × 297 mm), A3 Large Format, US Letter, US Legal, and custom sheet sizes.
- **Live Orientation Switching**: True-to-scale dynamic aspect-ratio resizing.
- **Canva Template Dropzone**: Drop any Canva export (`.png`, `.jpg`, `.svg`, `.json`) directly onto the page to wrap all cards on the virtual sheet.
- **Multi-Card Imposition Presets**: 8-Up (2×4), 4-Up (2×2), 10-Up (2×5), 1-Up (1×1), and custom col/row grids.

### 4. High-Precision A4 8-Up Print Engine (`/print-engine`)
- **Physical CR80 Dimensions**: 85.60 mm × 53.98 mm cards with ISO/IEC 7810 ID-1 standard rounding and 1.5 mm bleed margin.
- **Interactive Drag-and-Drop Slot Placement**: Drag any student card from the Queue Selection directly into any of the 8 physical slots on the A4 sheet.
- **Slot Swapping & Movement**: Freely reorder, move, swap, and clear individual slots with visual hover dropzones and one-click `[+ Slot]` buttons.
- **Production Controls**: Print Ready dialog, Guillotine cutting crop marks, and zero-distortion print preview.

---

## Tech Stack
- **Framework**: Next.js 14+ (App Router, Server Actions)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Monochromatic 90% White / 10% Black)
- **Database & ORM**: Prisma ORM with SQLite (dev) / PostgreSQL (production)
- **Icons**: Lucide React
- **Webcam**: `navigator.mediaDevices.getUserMedia` direct hardware stream
- **File Parsing**: SheetJS (XLSX), JSZip

---

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/miskrdires12/student-bridge-.git
cd student-bridge-

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Launch development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Cloudflare R2 Cloud Object Storage Architecture
This edition of Student Bridge is powered by **Cloudflare R2 Object Storage** with zero egress fees:
- **Bucket**: `siliconlabs`
- **S3-Compatible Endpoint**: `https://a5b6150294de0fedb8e0cd789114b939.r2.cloudflarestorage.com`
- **Public High-Speed CDN**: `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev`
- **Asset Hierarchy**: Cleanly organized into `[Grade]/[StudentID]_[FullName].jpg` and `[Grade]/previews/[StudentID]_[FullName].jpg`
- **Real-time Synchronization & Orphan Cleaner**: Built-in Admin dashboard tool to audit R2 files against PostgreSQL records and purge orphaned assets.

---

## Enterprise Roles
- **SENDER**: Operator enrollment, direct webcam portrait capture, transfer batch creation.
- **RECEIVER**: Student directory management, photo download, Canva card design, bulk printing.
- **ADMIN**: Complete system access, audit logs, and Cloudflare R2 storage telemetry.

