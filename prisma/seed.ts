// ============================================================================
// STUDENT BRIDGE — DATABASE SEED SCRIPT
// Seeds initial RBAC users (Admin, Sender, Receiver) and initial students
// ============================================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Student Bridge database seeding...");

  // 1. Seed Roles & Users
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const adminHash = await bcrypt.hash("AdminPassword123!", 12);

  const users = [
    {
      username: "admin",
      email: "admin@studentbridge.internal",
      passwordHash: adminHash,
      role: "ADMIN" as const,
    },
    {
      username: "sender",
      email: "sender@studentbridge.internal",
      passwordHash,
      role: "SENDER" as const,
    },
    {
      username: "receiver",
      email: "receiver@studentbridge.internal",
      passwordHash,
      role: "RECEIVER" as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash: user.passwordHash, role: user.role },
      create: user,
    });
    console.log(`✓ User established: ${user.username} (${user.role})`);
  }

  // 2. Seed Initial Student Records (10 students for testing multi-page 8-up PDF generation)
  const students = [
    {
      studentId: "SB-2026-0001",
      fullName: "Alexandria Vance",
      contactName: "Dr. Gregory Vance",
      grade: "Grade 12-A",
      sex: "Female",
      phone: "+1 (555) 234-5678",
      cityRegion: "Metro Sector 4",
      emergencyContactName: "Gregory Vance",
      emergencyContactPhone: "+1 (555) 987-6543",
      bloodType: "O+",
      emailAddress: "alex.vance@student.internal",
      guardianFullName: "Dr. Gregory Vance",
      rollNumber: "R-101",
      nationality: "United States",
      nationalId: "US-84920481",
      dateOfBirth: new Date("2008-04-12"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0001",
        name: "Alexandria Vance",
        roll: "R-101",
        grade: "Grade 12-A",
      }),
    },
    {
      studentId: "SB-2026-0002",
      fullName: "Marcus Chen",
      contactName: "Mei-Ling Chen",
      grade: "Grade 12-A",
      sex: "Male",
      phone: "+1 (555) 345-6789",
      cityRegion: "Bay Horizon District",
      emergencyContactName: "Mei-Ling Chen",
      emergencyContactPhone: "+1 (555) 876-5432",
      bloodType: "A+",
      emailAddress: "marcus.chen@student.internal",
      guardianFullName: "Mei-Ling Chen",
      rollNumber: "R-102",
      nationality: "Canada",
      nationalId: "CA-93820194",
      dateOfBirth: new Date("2008-07-25"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0002",
        name: "Marcus Chen",
        roll: "R-102",
        grade: "Grade 12-A",
      }),
    },
    {
      studentId: "SB-2026-0003",
      fullName: "Seraphina Morales",
      contactName: "Carlos Morales",
      grade: "Grade 11-B",
      sex: "Female",
      phone: "+1 (555) 456-7890",
      cityRegion: "Apex Central",
      emergencyContactName: "Carlos Morales",
      emergencyContactPhone: "+1 (555) 765-4321",
      bloodType: "B+",
      emailAddress: "s.morales@student.internal",
      guardianFullName: "Carlos Morales",
      rollNumber: "R-201",
      nationality: "Mexico",
      nationalId: "MX-29482014",
      dateOfBirth: new Date("2009-02-18"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0003",
        name: "Seraphina Morales",
        roll: "R-201",
        grade: "Grade 11-B",
      }),
    },
    {
      studentId: "SB-2026-0004",
      fullName: "Darius Kael",
      contactName: "Elena Kael",
      grade: "Grade 11-B",
      sex: "Male",
      phone: "+1 (555) 567-8901",
      cityRegion: "Nexus Ridge",
      emergencyContactName: "Elena Kael",
      emergencyContactPhone: "+1 (555) 654-3210",
      bloodType: "AB+",
      emailAddress: "d.kael@student.internal",
      guardianFullName: "Elena Kael",
      rollNumber: "R-202",
      nationality: "Germany",
      nationalId: "DE-49201934",
      dateOfBirth: new Date("2009-09-03"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0004",
        name: "Darius Kael",
        roll: "R-202",
        grade: "Grade 11-B",
      }),
    },
    {
      studentId: "SB-2026-0005",
      fullName: "Zara Tanaka",
      contactName: "Kenji Tanaka",
      grade: "Grade 10-C",
      sex: "Female",
      phone: "+1 (555) 678-9012",
      cityRegion: "Tech Valley East",
      emergencyContactName: "Kenji Tanaka",
      emergencyContactPhone: "+1 (555) 543-2109",
      bloodType: "O-",
      emailAddress: "z.tanaka@student.internal",
      guardianFullName: "Kenji Tanaka",
      rollNumber: "R-301",
      nationality: "Japan",
      nationalId: "JP-92840192",
      dateOfBirth: new Date("2010-01-14"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0005",
        name: "Zara Tanaka",
        roll: "R-301",
        grade: "Grade 10-C",
      }),
    },
    {
      studentId: "SB-2026-0006",
      fullName: "Niko Sterling",
      contactName: "Clara Sterling",
      grade: "Grade 10-C",
      sex: "Male",
      phone: "+1 (555) 789-0123",
      cityRegion: "Skyline Heights",
      emergencyContactName: "Clara Sterling",
      emergencyContactPhone: "+1 (555) 432-1098",
      bloodType: "A-",
      emailAddress: "n.sterling@student.internal",
      guardianFullName: "Clara Sterling",
      rollNumber: "R-302",
      nationality: "United Kingdom",
      nationalId: "UK-39201948",
      dateOfBirth: new Date("2010-06-30"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0006",
        name: "Niko Sterling",
        roll: "R-302",
        grade: "Grade 10-C",
      }),
    },
    {
      studentId: "SB-2026-0007",
      fullName: "Amira Al-Mansoor",
      contactName: "Tariq Al-Mansoor",
      grade: "Grade 12-B",
      sex: "Female",
      phone: "+1 (555) 890-1234",
      cityRegion: "Oasis Gate",
      emergencyContactName: "Tariq Al-Mansoor",
      emergencyContactPhone: "+1 (555) 321-0987",
      bloodType: "B-",
      emailAddress: "a.mansoor@student.internal",
      guardianFullName: "Tariq Al-Mansoor",
      rollNumber: "R-103",
      nationality: "United Arab Emirates",
      nationalId: "AE-59201948",
      dateOfBirth: new Date("2008-11-09"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0007",
        name: "Amira Al-Mansoor",
        roll: "R-103",
        grade: "Grade 12-B",
      }),
    },
    {
      studentId: "SB-2026-0008",
      fullName: "Ethan Thorne",
      contactName: "Samuel Thorne",
      grade: "Grade 12-B",
      sex: "Male",
      phone: "+1 (555) 901-2345",
      cityRegion: "Highland Forest",
      emergencyContactName: "Samuel Thorne",
      emergencyContactPhone: "+1 (555) 210-9876",
      bloodType: "AB-",
      emailAddress: "e.thorne@student.internal",
      guardianFullName: "Samuel Thorne",
      rollNumber: "R-104",
      nationality: "Australia",
      nationalId: "AU-84920194",
      dateOfBirth: new Date("2008-08-17"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0008",
        name: "Ethan Thorne",
        roll: "R-104",
        grade: "Grade 12-B",
      }),
    },
    {
      studentId: "SB-2026-0009",
      fullName: "Chloe Dubois",
      contactName: "Jean-Luc Dubois",
      grade: "Grade 11-A",
      sex: "Female",
      phone: "+1 (555) 012-3456",
      cityRegion: "Riviera Terrace",
      emergencyContactName: "Jean-Luc Dubois",
      emergencyContactPhone: "+1 (555) 109-8765",
      bloodType: "O+",
      emailAddress: "c.dubois@student.internal",
      guardianFullName: "Jean-Luc Dubois",
      rollNumber: "R-203",
      nationality: "France",
      nationalId: "FR-29482019",
      dateOfBirth: new Date("2009-05-22"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0009",
        name: "Chloe Dubois",
        roll: "R-203",
        grade: "Grade 11-A",
      }),
    },
    {
      studentId: "SB-2026-0010",
      fullName: "Liam O'Connor",
      contactName: "Fiona O'Connor",
      grade: "Grade 11-A",
      sex: "Male",
      phone: "+1 (555) 123-4567",
      cityRegion: "Emerald Port",
      emergencyContactName: "Fiona O'Connor",
      emergencyContactPhone: "+1 (555) 098-7654",
      bloodType: "A+",
      emailAddress: "l.oconnor@student.internal",
      guardianFullName: "Fiona O'Connor",
      rollNumber: "R-204",
      nationality: "Ireland",
      nationalId: "IE-49201948",
      dateOfBirth: new Date("2009-10-11"),
      status: "ACTIVE" as const,
      qrCodeData: JSON.stringify({
        id: "SB-2026-0010",
        name: "Liam O'Connor",
        roll: "R-204",
        grade: "Grade 11-A",
      }),
    },
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: { studentId: student.studentId },
      update: student,
      create: student,
    });
  }
  console.log(`✓ Seeded ${students.length} diverse student records.`);

  // 3. Seed Default Vector Card Template
  const defaultSvg = `<svg viewBox="0 0 324 204" xmlns="http://www.w3.org/2000/svg">
  <rect width="324" height="204" rx="8" fill="#0D0F12" stroke="#22272F" stroke-width="2"/>
  <rect x="0" y="0" width="324" height="32" rx="8" fill="#16191E"/>
  <line x1="0" y1="32" x2="324" y2="32" stroke="#37E310" stroke-width="2"/>
  <text x="14" y="21" fill="#37E310" font-family="sans-serif" font-size="12" font-weight="bold">STUDENT BRIDGE</text>
  <text x="210" y="20" fill="#9CA3AF" font-family="sans-serif" font-size="8">OFFICIAL CREDENTIAL</text>
  <rect x="14" y="44" width="64" height="82" rx="4" fill="#16191E" stroke="#37E310" stroke-width="1.5"/>
</svg>`;

  const fieldConfig = JSON.stringify({
    photo: { x: 14, y: 44, width: 64, height: 82 },
    fullName: { x: 88, y: 56, fontSize: 13, color: "#FFFFFF", fontWeight: "bold" },
    studentId: { x: 88, y: 74, fontSize: 10, color: "#37E310", fontFamily: "monospace" },
    grade: { x: 88, y: 92, fontSize: 9, color: "#9CA3AF" },
    rollNumber: { x: 160, y: 92, fontSize: 9, color: "#FFFFFF" },
    phone: { x: 88, y: 110, fontSize: 8.5, color: "#9CA3AF" },
    qr: { x: 236, y: 120, size: 68 },
  });

  await prisma.cardTemplate.upsert({
    where: { name: "Default Enterprise Dark" },
    update: { svgContent: defaultSvg, fieldConfig, isDefault: true },
    create: {
      name: "Default Enterprise Dark",
      description: "Standard CR80 enterprise dark template with emerald neon accent",
      svgContent: defaultSvg,
      fieldConfig,
      isDefault: true,
    },
  });
  console.log("✓ Default SVG Card Template established.");

  console.log("✨ Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
