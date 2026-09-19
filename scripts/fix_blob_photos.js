const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBlobPhotos() {
  console.log('Fixing blob: photoPath in PostgreSQL...');

  const s1 = await prisma.student.updateMany({
    where: { studentId: 'SB-2026-33758' },
    data: {
      photoPath: 'https://hiwhmpuhhakguckckuqv.supabase.co/storage/v1/object/public/student%20data/General/SB-2026-33758_student.jpg',
      previewPath: 'https://hiwhmpuhhakguckckuqv.supabase.co/storage/v1/object/public/student%20data/General/previews/SB-2026-33758_student.jpg',
      originalPhotoPath: 'https://hiwhmpuhhakguckckuqv.supabase.co/storage/v1/object/public/student%20data/General/SB-2026-33758_student.jpg'
    }
  });
  console.log(`Updated SB-2026-33758: ${s1.count} record(s)`);

  const s2 = await prisma.student.updateMany({
    where: { studentId: 'SB-2026-44380' },
    data: {
      photoPath: 'https://hiwhmpuhhakguckckuqv.supabase.co/storage/v1/object/public/student%20data/General/SB-2026-44380_student.jpg',
      previewPath: 'https://hiwhmpuhhakguckckuqv.supabase.co/storage/v1/object/public/student%20data/General/previews/SB-2026-44380_student.jpg',
      originalPhotoPath: 'https://hiwhmpuhhakguckckuqv.supabase.co/storage/v1/object/public/student%20data/General/SB-2026-44380_student.jpg'
    }
  });
  console.log(`Updated SB-2026-44380: ${s2.count} record(s)`);

  await prisma.$disconnect();
}

fixBlobPhotos().catch(console.error);
