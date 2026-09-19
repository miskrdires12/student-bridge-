const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- POSTGRESQL STUDENTS ---');
  const students = await prisma.student.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total students in DB: ${students.length}`);
  students.forEach(s => {
    console.log(`ID: ${s.studentId} | Name: ${s.fullName} | Grade: ${s.grade} | photoPath: ${s.photoPath}`);
  });

  console.log('\n--- RAW STORAGE OBJECTS FROM POSTGRESQL ---');
  try {
    const objects = await prisma.$queryRawUnsafe(`
      SELECT id, name, bucket_id, created_at FROM storage.objects ORDER BY created_at DESC LIMIT 50;
    `);
    console.log(`Total storage objects returned: ${objects.length}`);
    objects.forEach(o => {
      console.log(`Bucket: ${o.bucket_id} | Name: ${o.name}`);
    });
  } catch (err) {
    console.error('Storage query error:', err.message);
  }

  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
