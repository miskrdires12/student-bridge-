const { Client } = require('pg');
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
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function setupStorage() {
  const connStr = (process.env.DATABASE_URL || '').split('?')[0];
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL!');

  // Check existing buckets
  const res = await client.query('SELECT * FROM storage.buckets;');
  console.log('Existing buckets:', res.rows);

  // Insert 'student data' bucket if not exists
  await client.query(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('student data', 'student data', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true;
  `);
  console.log("Bucket 'student data' created or ensured public!");

  // Ensure storage.objects has policy allowing anon to insert, update, select, delete in 'student data'
  await client.query(`
    DO $$
    BEGIN
      -- Select policy
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access student data'
      ) THEN
        CREATE POLICY "Public Access student data" ON storage.objects
        FOR SELECT USING (bucket_id = 'student data');
      END IF;

      -- Insert policy
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Insert student data'
      ) THEN
        CREATE POLICY "Public Insert student data" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'student data');
      END IF;

      -- Update policy
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Update student data'
      ) THEN
        CREATE POLICY "Public Update student data" ON storage.objects
        FOR UPDATE USING (bucket_id = 'student data');
      END IF;

      -- Delete policy
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Delete student data'
      ) THEN
        CREATE POLICY "Public Delete student data" ON storage.objects
        FOR DELETE USING (bucket_id = 'student data');
      END IF;
    END $$;
  `);
  console.log("Policies ensured for bucket 'student data'!");

  await client.end();
}

setupStorage().catch(err => {
  console.error('Setup storage error:', err);
  process.exit(1);
});
