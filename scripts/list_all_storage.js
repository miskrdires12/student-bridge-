const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllStorage() {
  const objects = await prisma.$queryRawUnsafe(`
    SELECT name, bucket_id, created_at, metadata FROM storage.objects WHERE bucket_id = 'student data' ORDER BY name ASC;
  `);
  console.log(`Total objects in 'student data': ${objects.length}`);
  objects.forEach(o => {
    console.log(`- ${o.name}`);
  });
  await prisma.$disconnect();
}

listAllStorage().catch(console.error);
