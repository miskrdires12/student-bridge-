const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPhotos() {
  const students = await prisma.student.findMany();
  console.log(`Checking ${students.length} students...`);
  for (const s of students) {
    if (!s.photoPath) {
      console.log(`❌ ${s.studentId} (${s.fullName}): NO photoPath`);
      continue;
    }
    if (s.photoPath.startsWith('blob:')) {
      console.log(`❌ ${s.studentId} (${s.fullName}): INVALID blob URL: ${s.photoPath}`);
      continue;
    }
    try {
      const res = await fetch(s.photoPath, { method: 'HEAD' });
      if (res.ok) {
        console.log(`✅ ${s.studentId} (${s.fullName}): OK (${res.status})`);
      } else {
        console.log(`❌ ${s.studentId} (${s.fullName}): HTTP ${res.status} for ${s.photoPath}`);
      }
    } catch (e) {
      console.log(`❌ ${s.studentId} (${s.fullName}): Fetch failed: ${e.message}`);
    }
  }
  await prisma.$disconnect();
}

testPhotos();
