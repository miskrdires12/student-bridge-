-- StudentBridge system of record.
--
-- studentId is the identity every read path already dedupes on, so it is the primary key here rather
-- than the surrogate id Postgres carries. Timestamps are TEXT holding UTC ISO-8601 *with* the trailing
-- Z: Postgres answers these columns without a zone marker, which makes a station three hours ahead of
-- UTC see a record that is three minutes old as three hours stale and refuse to confirm delivery.
-- originStation is the device that sent the row. Supabase has no such column and its write whitelist
-- drops the key, so a receiver could only ever recognise its own send through a local list; here it
-- is stored, which is what makes a delivery receipt attributable.

CREATE TABLE IF NOT EXISTS students (
  studentId TEXT PRIMARY KEY,
  id TEXT,
  fullName TEXT,
  phone TEXT,
  sex TEXT,
  grade TEXT,
  dateOfBirth TEXT,
  emailAddress TEXT,
  address TEXT,
  school TEXT,
  department TEXT,
  academicYear TEXT,
  guardianFullName TEXT,
  emergencyContactName TEXT,
  emergencyContactPhone TEXT,
  contactName TEXT,
  cityRegion TEXT,
  bloodType TEXT,
  rollNumber TEXT,
  nationality TEXT,
  nationalId TEXT,
  photoPath TEXT,
  thumbnailPath TEXT,
  previewPath TEXT,
  originalPhotoPath TEXT,
  qrCodeData TEXT,
  senderId TEXT,
  senderName TEXT,
  originStation TEXT,
  photoIntegrityStatus TEXT,
  storageKey TEXT,
  storageSyncAt TEXT,
  status TEXT,
  receiverHidden INTEGER NOT NULL DEFAULT 0,
  hiddenAt TEXT,
  batchId TEXT,
  organizationId TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  receiverNote TEXT,
  hasMistake INTEGER NOT NULL DEFAULT 0,
  parentPhone TEXT,
  emergency_contact_phone TEXT,
  guardianPhone TEXT,
  writtenAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- The feed walks this: WHERE updatedAt > :cursor ORDER BY updatedAt LIMIT :n
CREATE INDEX IF NOT EXISTS students_updatedAt_idx ON students(updatedAt);
CREATE INDEX IF NOT EXISTS students_createdAt_idx ON students(createdAt);
CREATE INDEX IF NOT EXISTS students_school_idx ON students(school);
CREATE INDEX IF NOT EXISTS students_grade_idx ON students(grade);
CREATE INDEX IF NOT EXISTS students_sender_idx ON students(senderId);
CREATE INDEX IF NOT EXISTS students_fullName_idx ON students(fullName);
