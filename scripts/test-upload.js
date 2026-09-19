const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
});

async function testUpload() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  console.log('Testing upload to:', supabaseUrl);
  console.log('Using API key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NONE');

  const folderPath = 'Grade 10';
  const fileName = 'SB-2026-TEST_Abebe Kebede.jpg';
  const sanitizedFolder = folderPath.replace(/^[/\\]+|[/\\]+$/g, "");
  const cleanPath = `${sanitizedFolder}/${fileName}`;
  const encodedPath = encodeURI(cleanPath);

  const uploadEndpoint = `${supabaseUrl}/storage/v1/object/student%20data/${encodedPath}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/student%20data/${encodedPath}`;

  // 1x1 dummy JPEG
  const dummyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

  const res = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "apikey": apiKey,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: dummyJpeg,
  });

  console.log('Upload HTTP status:', res.status);
  const body = await res.text();
  console.log('Response body:', body);
  console.log('Public URL:', publicUrl);

  // Test fetching back
  const checkRes = await fetch(publicUrl);
  console.log('Public URL access status:', checkRes.status);
}

testUpload().catch(console.error);
