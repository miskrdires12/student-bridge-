import { Student, User, Task, School, AuditLog, StudentCoreRequest, MistakeItem, UserRole, CardTemplate, PrintJob } from '@/types';
import { publishStudentSync, subscribeToStudentSync, getPhotoUrl, getPhotoEncodeClass } from './syncEngine';
import { parseGradeAndSection, getBranchForSchool, getStudentBranch } from './gradeUtils';

export { getPhotoUrl, getPhotoEncodeClass, publishStudentSync, subscribeToStudentSync, getBranchForSchool, getStudentBranch };

// Branch to School Mapping
export const BRANCH_SCHOOL_MAP: Record<string, string[]> = {
  'Addis Ababa': [
    'YMS 1', 'YMS 2', 'YMS 3', 'YMS 4',
    'School of America 1', 'School of America 2', 'School of America 3', 'School of America 4',
    'Adika Youth', 'Warka', 'Ferway',
    'YMS', 'School of America'
  ],
  'Adama': ['Sena Yerosen', '1234', 'Yacine', 'Debebech'],
  'Mojo': ['Mojo'],
  'Harar': [
    'High Tech 1', 'High Tech 2', 'High Tech 3', 'High Tech 4',
    'High Tech'
  ]
};

export const DEFAULT_BRANCHES = Object.keys(BRANCH_SCHOOL_MAP);

// Initial fallback schools strictly mapped to authorized branches
export const DEFAULT_SCHOOLS: School[] = [
  { id: "sch_yms1", name: "YMS 1", location: "Addis Ababa", status: "Active", studentsCount: 420 },
  { id: "sch_yms2", name: "YMS 2", location: "Addis Ababa", status: "Active", studentsCount: 380 },
  { id: "sch_yms3", name: "YMS 3", location: "Addis Ababa", status: "Active", studentsCount: 310 },
  { id: "sch_yms4", name: "YMS 4", location: "Addis Ababa", status: "Active", studentsCount: 285 },
  { id: "sch_yms", name: "YMS", location: "Addis Ababa", status: "Active", studentsCount: 1245 },
  { id: "sch_soa1", name: "School of America 1", location: "Addis Ababa", status: "Active", studentsCount: 260 },
  { id: "sch_soa2", name: "School of America 2", location: "Addis Ababa", status: "Active", studentsCount: 240 },
  { id: "sch_soa3", name: "School of America 3", location: "Addis Ababa", status: "Active", studentsCount: 220 },
  { id: "sch_soa4", name: "School of America 4", location: "Addis Ababa", status: "Active", studentsCount: 190 },
  { id: "sch_soa", name: "School of America", location: "Addis Ababa", status: "Active", studentsCount: 756 },
  { id: "sch_adika", name: "Adika Youth", location: "Addis Ababa", status: "Active", studentsCount: 982 },
  { id: "sch_warka", name: "Warka", location: "Addis Ababa", status: "Active", studentsCount: 398 },
  { id: "sch_ferway", name: "Ferway", location: "Addis Ababa", status: "Active", studentsCount: 542 },
  { id: "sch_senayerosen", name: "Sena Yerosen", location: "Adama", status: "Active", studentsCount: 414 },
  { id: "sch_1234", name: "1234", location: "Adama", status: "Active", studentsCount: 0 },
  { id: "sch_yacine", name: "Yacine", location: "Adama", status: "Active", studentsCount: 185 },
  { id: "sch_debebech", name: "Debebech", location: "Adama", status: "Active", studentsCount: 671 },
  { id: "sch_mojo", name: "Mojo", location: "Mojo", status: "Active", studentsCount: 360 },
  { id: "sch_hightech1", name: "High Tech 1", location: "Harar", status: "Active", studentsCount: 120 },
  { id: "sch_hightech2", name: "High Tech 2", location: "Harar", status: "Active", studentsCount: 110 },
  { id: "sch_hightech3", name: "High Tech 3", location: "Harar", status: "Active", studentsCount: 95 },
  { id: "sch_hightech4", name: "High Tech 4", location: "Harar", status: "Active", studentsCount: 85 },
  { id: "sch_hightech", name: "High Tech", location: "Harar", status: "Active", studentsCount: 380 }
];

export interface OperatorAccount extends User {
  password?: string;
}

// Authoritative 19 field accounts loaded from users.json + test aliases (Universal password: 12345678)
export const PRESET_OPERATORS: OperatorAccount[] = [
  {
    id: "cmu7b6rkh00002ggkkxg5ecd9",
    username: "miskrdires11",
    email: "miskrdires11@gmail.com",
    role: "SUPER_ADMIN",
    password: "sukuna24th",
    boundDeviceId: null,
    recordsEncoded: 0,
  },
  {
    id: "cmuvl71ji0000941kfotbx6om",
    username: "mebratadony",
    email: "mebratadony@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmumblpy10009g2k6j9rh5ffg",
    username: "yohannes",
    email: "yohannes@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuc9t7id0000101wsibwr8vi",
    username: "etsubmolla",
    email: "etsubmolla@gmail.com",
    role: "SENDER",
    password: "211219",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "usr_etsubmola_alias",
    username: "etsubmola",
    email: "etsubmola@gmail.com",
    role: "SENDER",
    password: "211219",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuwb9gsb00002v1ky9k7bede",
    username: "adoni",
    email: "adoni@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuwbah7r00032v1ksdelhqag",
    username: "biruk",
    email: "biruk@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmumbjn480003g2k6ycd2mzp3",
    username: "zemichael",
    email: "zemichael@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmumd6g4y00043vo7wf1afj62",
    username: "abeni1",
    email: "abeni1@gmail.com",
    role: "SUPER_ADMIN",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmumbid6b0000g2k6tub66ug0",
    username: "nebiyu",
    email: "nebiyu@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmu80ooz8000611r3aum80oax",
    username: "yonatantesfa369",
    email: "yonatantesfa369@gmail.com",
    role: "RECEIVER",
    password: "12345678",
    boundDeviceId: null,
    recordsEncoded: 0,
  },
  {
    id: "cmudsq01z000b42rcrdlefo0y",
    username: "beki",
    email: "beki@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmudqu6ue0004rrcc4ktw46n1",
    username: "colldwater340",
    email: "colldwater340@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmumbkjf60006g2k6lvl8gba9",
    username: "simon",
    email: "simon@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuasu1mo0000dxwgl8i69x3j",
    username: "danaytesayas4",
    email: "danaytesayas4@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuq26kz90001q5dgcb3lu519",
    username: "miskrdires1",
    email: "miskrdires1@gmail.com",
    role: "ADMIN",
    password: "12345678",
    boundDeviceId: null,
  },
  {
    id: "cmukweowr00009pzsimqcm168",
    username: "yonatantesfa",
    email: "yonatantesfa@gmail.com",
    role: "RECEIVER",
    password: "12345678",
    boundDeviceId: null,
    recordsEncoded: 0,
  },
  {
    id: "cmua5dk5n00041tc43u1v7em9",
    username: "miskrdires12",
    email: "miskrdires12@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuxuut8t001s90y8x5t88jqt",
    username: "abeni",
    email: "abeni@gmail.com",
    role: "ADMIN",
    password: "12345678",
    boundDeviceId: null,
  },
  {
    id: "cmukwfk8v00039pzscdi4h0t9",
    username: "yonatan",
    email: "yonatan@gmail.com",
    role: "RECEIVER",
    password: "12345678",
    boundDeviceId: null,
    recordsEncoded: 0,
  },
  {
    id: "usr_biruk1",
    username: "biruk1",
    email: "biruk1@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    school: "Sena Yerosen",
    recordsSentSingle: 0,
    recordsEncoded: 0,
    workSessionCount: 0,
  },
  {
    id: "usr_siliconlabstech",
    username: "siliconlabstech",
    email: "siliconlabstech@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    school: "Sena Yerosen",
    recordsSentSingle: 0,
    recordsEncoded: 0,
    workSessionCount: 0,
  },
];

// Strict QR token payload format required by user:
// {"id":"SB-2026-50216","name":"Betelhem Tesfaye","roll":"","grade":"12D"}
export function generateStudentQrToken(student: Partial<Student>): string {
  return JSON.stringify({
    id: student.studentId || '',
    name: student.fullName || '',
    roll: student.rollNumber || '',
    grade: student.grade || ''
  });
}

// Generates the standard photo filename for a student
export function getStudentPhotoFileName(student: Partial<Student>): string {
  if (student.photoPath) {
    try {
      const cleanPath = student.photoPath.split('?')[0];
      const rawName = cleanPath.split('/').pop() || '';
      const decoded = decodeURIComponent(rawName);
      if (decoded && (decoded.toLowerCase().endsWith('.jpg') || decoded.toLowerCase().endsWith('.png') || decoded.toLowerCase().endsWith('.jpeg'))) {
        return decoded;
      }
    } catch {}
  }
  const safeName = (student.fullName || 'student').trim().replace(/[\/\\:*?"<>|]/g, '_');
  return `${student.studentId || 'STUDENT'}_${safeName}.jpg`;
}

// Generates the standard QR filename for a student
export function getStudentQrFileName(student: Partial<Student>): string {
  return `${student.studentId || 'STUDENT'}_qr.png`;
}

// Sanitizes student record to prevent heavy base64 strings from exhausting 5MB localStorage quota
export function sanitizeStudentForStorage(student: Partial<Student>): Student {
  const clean = { ...student } as any;
  delete clean.capturedPhoto;
  delete clean.photoBase64;
  if (typeof clean.previewPath === 'string' && clean.previewPath.startsWith('data:')) {
    clean.previewPath = clean.photoPath || '';
  }
  if (typeof clean.thumbnailPath === 'string' && clean.thumbnailPath.startsWith('data:')) {
    clean.thumbnailPath = clean.photoPath || '';
  }
  return clean as Student;
}

// Bulletproof localStorage setter that handles QuotaExceededError automatically
export function safeSetItem(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    console.warn(`LocalStorage write quota warning on "${key}":`, e);
    // 1. Sanitize and trim sb_custom_students to keep only recent 15 records without any base64
    try {
      const raw = localStorage.getItem('sb_custom_students');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const stripped = parsed.slice(0, 15).map((st: any) => sanitizeStudentForStorage(st));
          localStorage.setItem('sb_custom_students', JSON.stringify(stripped));
        }
      }
    } catch {
      try { localStorage.removeItem('sb_custom_students'); } catch {}
    }

    // 2. Clear non-essential large cache items
    try {
      localStorage.removeItem('sb_bulked_student_ids');
      localStorage.removeItem('sb_correction_logs');
      localStorage.removeItem('sb_paused_student_notes');
      localStorage.removeItem('sb_paused_student_ids');
      localStorage.removeItem('sb_print_jobs');
      localStorage.removeItem('sb_admin_tasks');
    } catch {}

    // 3. Re-try setting the item
    try {
      localStorage.setItem(key, value);
      return;
    } catch (e2) {
      console.warn(`Secondary quota cleanup needed for "${key}":`, e2);
    }

    // 4. Emergency: clear all custom student cache and retry
    try {
      localStorage.removeItem('sb_custom_students');
      localStorage.setItem(key, value);
      return;
    } catch (e3) {
      // Absolute last resort: preserve credentials and clear the rest
      try {
        const token = localStorage.getItem('sb_auth_token') || localStorage.getItem('sb_token');
        const user = localStorage.getItem('sb_auth_user');
        const devId = localStorage.getItem('sb_device_id');
        localStorage.clear();
        if (token) localStorage.setItem('sb_auth_token', token);
        if (token) localStorage.setItem('sb_token', token);
        if (user) localStorage.setItem('sb_auth_user', user);
        if (devId) localStorage.setItem('sb_device_id', devId);
        localStorage.setItem(key, value);
      } catch (e4) {
        console.error(`Fatal LocalStorage write failure for "${key}":`, e4);
      }
    }
  }
}

let memoryStudents: Student[] = (() => {
  if (typeof localStorage !== 'undefined') {
    try {
      const custom = localStorage.getItem('sb_custom_students');
      if (custom) {
        const parsed = JSON.parse(custom);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeStudentForStorage);
        }
      }
    } catch (e) {}
  }
  return [];
})();
let memoryUsers: (User & { password?: string })[] = (() => {
  let deletedList: string[] = [];
  try {
    if (typeof localStorage !== 'undefined') {
      deletedList = JSON.parse(localStorage.getItem('sb_deleted_users') || '[]');
    }
  } catch (e) {}
  const isDeleted = (u: any) => {
    const uid = (u.id || '').toLowerCase();
    const em = (u.email || '').toLowerCase();
    const un = (u.username || '').toLowerCase();
    return deletedList.includes(uid) || deletedList.includes(em) || deletedList.includes(un);
  };

  const users: (User & { password?: string })[] = PRESET_OPERATORS
    .filter(u => !isDeleted(u) && !u.email.endsWith('@studentbridge.internal') && !u.id.startsWith('usr-admin-institutional') && !u.id.startsWith('usr-receiver-institutional') && !u.id.startsWith('usr-sender-institutional'))
    .map(u => ({ ...u, password: '12345678' }));
  try {
    if (typeof localStorage !== 'undefined') {
      const savedCustom = localStorage.getItem('sb_custom_users');
      if (savedCustom) {
        const customParsed = JSON.parse(savedCustom);
        if (Array.isArray(customParsed)) {
          const filteredCustom = customParsed.filter((cu: any) =>
            cu &&
            cu.email &&
            !isDeleted(cu) &&
            !cu.email.toLowerCase().endsWith('@studentbridge.internal') &&
            cu.id !== 'usr-admin-institutional' &&
            cu.id !== 'usr-receiver-institutional' &&
            cu.id !== 'usr-sender-institutional'
          );
          localStorage.setItem('sb_custom_users', JSON.stringify(filteredCustom));
          const existingIds = new Set(users.map(u => u.id));
          const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
          filteredCustom.forEach((cu: any) => {
            if (!existingIds.has(cu.id) && !existingEmails.has(cu.email.toLowerCase())) {
              users.unshift({
                ...cu,
                password: cu.password || '12345678'
              });
            }
          });
        }
      }

      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      users.forEach(u => {
        const storedLock = locksMap[u.id] || (u.email && locksMap[u.email.toLowerCase()]) || (u.username && locksMap[u.username.toLowerCase()]);
        if (storedLock !== undefined) {
          u.boundDeviceId = storedLock;
        }
      });
    }
  } catch (e) {
    console.error('Error loading custom users from localStorage:', e);
  }

  // Strict role enforcement per authoritative specifications:
  // miskrdires11@gmail.com and abeni1@gmail.com are SUPER_ADMIN, senders include beki, biruk1, siliconlabstech, etc.
  users.forEach(u => {
    const em = (u.email || '').toLowerCase().trim();
    if (em === 'miskrdires11@gmail.com' || em === 'abeni1@gmail.com') {
      u.role = 'SUPER_ADMIN';
    } else if ([
      'mebratadony@gmail.com', 'yohannes@gmail.com', 'etsubmolla@gmail.com', 'etsubmola@gmail.com',
      'adoni@gmail.com', 'biruk@gmail.com', 'zemichael@gmail.com',
      'nebiyu@gmail.com', 'beki@gmail.com', 'colldwater340@gmail.com',
      'simon@gmail.com', 'danaytesayas4@gmail.com', 'miskrdires12@gmail.com',
      'biruk1@gmail.com', 'siliconlabstech@gmail.com'
    ].includes(em)) {
      u.role = 'SENDER';
    }
  });

  return users;
})();
let memorySchools: School[] = DEFAULT_SCHOOLS;
const DEFAULT_TASKS: Task[] = [
  {
    id: 'TSK-1001',
    title: 'Audit Grade 9 Biometric Portrait Alignment (3:4 ratio)',
    assignedTo: 'mebratadony',
    school: 'YMS',
    priority: 'High',
    deadline: '2026-10-18',
    status: 'In Progress'
  },
  {
    id: 'TSK-1002',
    title: 'Standardize Parent Emergency Contact Codes (+251 format)',
    assignedTo: 'yohannes',
    school: 'Adika Youth',
    priority: 'Medium',
    deadline: '2026-10-20',
    status: 'Pending'
  },
  {
    id: 'TSK-1003',
    title: 'Batch Hologram Verification for Senior Cards',
    assignedTo: 'etsubmolla',
    school: 'School of America',
    priority: 'High',
    deadline: '2026-10-16',
    status: 'Completed'
  },
  {
    id: 'TSK-1004',
    title: 'Biometric Station Queue Clearance & Sync Review',
    assignedTo: 'biruk',
    school: 'Warka',
    priority: 'Low',
    deadline: '2026-10-22',
    status: 'Pending'
  }
];

let memoryTasks: Task[] = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sb_admin_tasks') : null;
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : DEFAULT_TASKS;
  } catch (e) {
    return DEFAULT_TASKS;
  }
})();
let memoryAuditLogs: AuditLog[] = [];

/**
 * Handles incoming real-time sync events from other browser tabs or remote field terminals.
 */
function upsertStudentFromSync(incoming: Student): void {
  if (!incoming || !incoming.studentId) return;

  const existingIdx = memoryStudents.findIndex(s => s.studentId === incoming.studentId || s.id === incoming.id);
  if (existingIdx !== -1) {
    memoryStudents[existingIdx] = { ...memoryStudents[existingIdx], ...incoming };
  } else {
    memoryStudents.unshift(incoming);
  }

  try {
    const raw = localStorage.getItem('sb_custom_students');
    const existing: Student[] = raw ? JSON.parse(raw) : [];
    const cIdx = existing.findIndex((s: Student) => s.studentId === incoming.studentId || s.id === incoming.id);
    const sanitized = sanitizeStudentForStorage(incoming);
    if (cIdx !== -1) {
      existing[cIdx] = sanitized;
    } else {
      existing.unshift(sanitized);
    }
    const capped = existing.slice(0, 25).map(sanitizeStudentForStorage);
    safeSetItem('sb_custom_students', JSON.stringify(capped));
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange', { detail: incoming }));
  }
}

// Authoritative Blacklist of permanently and temporarily deleted students
export function getDeletedStudentIds(): Set<string> {
  try {
    const raw = localStorage.getItem('sb_deleted_student_ids');
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}

export function recordDeletedStudentId(studentId: string): void {
  if (!studentId) return;
  try {
    const set = getDeletedStudentIds();
    set.add(studentId);
    set.add(studentId.toLowerCase());
    localStorage.setItem('sb_deleted_student_ids', JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function removeDeletedStudentId(studentId: string): void {
  if (!studentId) return;
  try {
    const set = getDeletedStudentIds();
    set.delete(studentId);
    set.delete(studentId.toLowerCase());
    localStorage.setItem('sb_deleted_student_ids', JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export async function initStore(): Promise<void> {
  const deletedIds = getDeletedStudentIds();

  // 1. Authoritative source of truth: the FULL live dataset from the edge API
  // (Supabase PostgreSQL, paginated server-side). The static /data/students.json
  // file is an offline fallback ONLY — it can lag the live DB by whole days.
  let baseStudents: Student[] = [];
  let liveServerStudents: Student[] = [];
  let serverTotal = 0;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;
    const res = await fetch('/api/students?all=true', {
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.students) && data.students.length > 0) {
        liveServerStudents = data.students;
        serverTotal = Number(data.total) || data.students.length;
      }
    }
  } catch (apiErr) {
    console.warn('Full live dataset fetch warning:', apiErr);
  }

  // 2. Degraded/offline path only: stale baseline + latest-500 overlay.
  // Also used when the API answered with a provably incomplete list.
  const datasetHealthy = liveServerStudents.length > 0 && liveServerStudents.length >= serverTotal;
  if (!datasetHealthy) {
    try {
      const res = await fetch('/data/students.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          baseStudents = data;
        }
      }
    } catch (e) {
      console.warn('Could not load /data/students.json', e);
    }

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
      const res = await fetch('/api/students?limit=500', {
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.students)) {
          liveServerStudents = [...data.students, ...liveServerStudents];
        }
      }
    } catch (apiErr) {
      console.warn('Live API fallback fetch warning:', apiErr);
    }
  }

  // 3. Load locally registered / cached students from localStorage ('sb_custom_students')
  let localCustomStudents: Student[] = [];
  try {
    const raw = localStorage.getItem('sb_custom_students');
    if (raw) localCustomStudents = JSON.parse(raw);
  } catch (e) {}

  // 4. Merge all sources authoritatively by studentId:
  // - Base map: master static dataset (5,250+ records)
  // - Overlay: live server records from Supabase (today's live registrations & updates)
  // - Overlay: local custom registrations
  const studentMap = new Map<string, Student>();

  baseStudents.forEach(s => {
    if (s && s.studentId) studentMap.set(s.studentId, s);
  });

  liveServerStudents.forEach(s => {
    if (s && s.studentId) {
      studentMap.set(s.studentId, { ...(studentMap.get(s.studentId) || {}), ...s });
    }
  });

  localCustomStudents.forEach(s => {
    if (s && s.studentId) {
      studentMap.set(s.studentId, { ...(studentMap.get(s.studentId) || {}), ...s });
    }
  });

  // Clean custom students of deleted IDs
  const cleanedCustom = localCustomStudents.filter(cs =>
    !deletedIds.has(cs.studentId) &&
    !deletedIds.has((cs.studentId || '').toLowerCase()) &&
    !deletedIds.has(cs.id)
  );
  if (cleanedCustom.length !== localCustomStudents.length) {
    safeSetItem('sb_custom_students', JSON.stringify(cleanedCustom));
  }

  // 5. Clean, normalize dates, filter deleted, and sort
  const allMerged: Student[] = [];
  for (const s of studentMap.values()) {
    const sid = s.studentId || '';
    const sidLower = sid.toLowerCase();
    const id = s.id || '';
    if (deletedIds.has(sid) || deletedIds.has(sidLower) || deletedIds.has(id)) {
      continue;
    }

    // Exact Sent / Transmitted Date normalization
    const exactDate = s.createdAt || (s as any).registrationDate || s.updatedAt || s.recordHistory?.[0]?.date || new Date().toISOString();
    s.createdAt = exactDate;
    (s as any).registrationDate = exactDate;

    allMerged.push(s);
  }

  // Sort newest transmitted first
  allMerged.sort((a, b) => {
    const dateA = a.createdAt || '';
    const dateB = b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  memoryStudents = allMerged;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }

  // 3b. Continuous authoritative reconciliation with the full server dataset.
  // Guarantees the UI list can never silently diverge from /api/stats totals:
  // every 3 minutes (or every 60s while degraded / after tab wake / reconnect)
  // memoryStudents is converged to the complete Supabase dataset.
  let lastFullSyncAt = datasetHealthy ? Date.now() : 0;
  let lastSyncHealthy = datasetHealthy;

  const runFullStudentSync = async () => {
    // While healthy refresh at most every 3 min; while degraded retry every tick
    if (lastSyncHealthy && Date.now() - lastFullSyncAt < 3 * 60 * 1000) return;
    try {
      const res = await fetch('/api/students?all=true');
      if (!res.ok) { lastSyncHealthy = false; return; }
      const data = await res.json();
      const live: Student[] = Array.isArray(data.students) ? data.students : [];
      const serverTotalRows = Number(data.total) || live.length;
      if (live.length === 0) { lastSyncHealthy = false; return; }
      const complete = live.length >= serverTotalRows;
      lastSyncHealthy = complete;
      lastFullSyncAt = Date.now();

      const delIds = getDeletedStudentIds();
      const merged = new Map<string, Student>();
      memoryStudents.forEach(s => { if (s.studentId) merged.set(s.studentId, s); });
      let dirty = false;

      const liveIds = new Set<string>();
      live.forEach(s => {
        if (!s || !s.studentId) return;
        liveIds.add(s.studentId);
        if (delIds.has(s.studentId) || delIds.has(s.studentId.toLowerCase()) || (s.id && delIds.has(s.id))) return;
        const local = merged.get(s.studentId);
        const localIsNewer = local && (local.updatedAt || '') > (s.updatedAt || '');
        const eff = localIsNewer ? { ...s, ...local } : { ...(local || {}), ...s };
        if (!local || (eff.updatedAt || '') !== (local.updatedAt || '')) dirty = true;
        merged.set(s.studentId, eff);
      });

      // Drop server-side permanent deletions that the stale baseline still carries.
      // Only trust removals when this response is provably the complete table.
      if (complete) {
        memoryStudents.forEach(s => {
          if (s.studentId && !liveIds.has(s.studentId) &&
              !localCustomStudents.some(cs => cs.studentId === s.studentId)) {
            merged.delete(s.studentId);
            dirty = true;
          }
        });
      }

      const reconciled = Array.from(merged.values());
      reconciled.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      const changed = dirty || reconciled.length !== memoryStudents.length ||
        reconciled[0]?.studentId !== memoryStudents[0]?.studentId;
      if (changed) {
        memoryStudents = reconciled;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
        }
      }
    } catch (e) {
      lastSyncHealthy = false;
      console.warn('Full student sync notice:', e);
    }
  };

  if (!datasetHealthy) runFullStudentSync();
  if (typeof window !== 'undefined' && !(window as any).__sbFullSyncTimer) {
    // 60s tick: refreshes every 3 min when healthy, every minute while degraded,
    // and immediately on reconnect or when the tab becomes visible again.
    (window as any).__sbFullSyncTimer = setInterval(runFullStudentSync, 60 * 1000);
    window.addEventListener('online', () => { lastFullSyncAt = 0; runFullStudentSync(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') runFullStudentSync();
    });
  }

  // 3. Fetch live users from server / Supabase PostgreSQL
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const loadedUsers: User[] = await res.json();
      if (Array.isArray(loadedUsers) && loadedUsers.length > 0) {
        let locksMap: Record<string, string> = {};
        try {
          locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
        } catch (e) {}

        loadedUsers.forEach(u => {
          const existing = memoryUsers.find(mu =>
            (mu.email && u.email && mu.email.toLowerCase() === u.email.toLowerCase()) ||
            mu.id === u.id ||
            (mu.username && u.username && mu.username.toLowerCase() === u.username.toLowerCase())
          );
          if (existing) {
            existing.boundDeviceId = u.boundDeviceId || null;
            if (u.boundDeviceId) {
              locksMap[existing.id] = u.boundDeviceId;
              if (existing.email) locksMap[existing.email.toLowerCase()] = u.boundDeviceId;
              if (existing.username) locksMap[existing.username.toLowerCase()] = u.boundDeviceId;
            } else {
              delete locksMap[existing.id];
              if (existing.email) delete locksMap[existing.email.toLowerCase()];
              if (existing.username) delete locksMap[existing.username.toLowerCase()];
            }
          } else {
            memoryUsers.push(u);
            if (u.boundDeviceId) {
              locksMap[u.id] = u.boundDeviceId;
              if (u.email) locksMap[u.email.toLowerCase()] = u.boundDeviceId;
              if (u.username) locksMap[u.username.toLowerCase()] = u.boundDeviceId;
            }
          }
        });

        try {
          localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('Could not load /api/users', e);
  }

  // 4. Merge custom students from localStorage if any
  try {
    const custom = localStorage.getItem('sb_custom_students');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        // Merge without duplicates
        const existingIds = new Set(memoryStudents.map(s => s.studentId));
        parsed.forEach((s: Student) => {
          if (!existingIds.has(s.studentId)) {
            memoryStudents.unshift(s);
          }
        });
      }
    }
  } catch (e) {}

  // 5. Sync bound devices from localStorage if previously updated
  try {
    const savedLocks = localStorage.getItem('sb_device_locks');
    if (savedLocks) {
      const locksMap: Record<string, string | null> = JSON.parse(savedLocks);
      memoryUsers.forEach(u => {
        if (locksMap[u.id] !== undefined) {
          u.boundDeviceId = locksMap[u.id];
        }
      });
    }
  } catch (e) {}

  // 6. Connect Real-Time Dual-Channel Sync Bus (BroadcastChannel + ntfy Cloud SSE)
  if (typeof window !== 'undefined') {
    subscribeToStudentSync(
      (syncedStudent) => {
        upsertStudentFromSync(syncedStudent);
      },
      (deletedId) => {
        memoryStudents = memoryStudents.filter(s => s.studentId !== deletedId && s.id !== deletedId);
        window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
      }
    );

    import('@/lib/offlineQueue').then(({ syncOfflineQueue }) => {
      syncOfflineQueue().catch(() => {});
    });
  }
}

export function normalizeStudentData(s: Student): Student {
  if (!s) return s;
  const d = (s.createdAt || (s as any).registrationDate || (s as any).date || '').substring(0, 10);
  let school = s.school || 'YMS';
  let bloodType = s.bloodType || 'Unknown';
  if (d >= '2026-10-14') {
    if ((school || '').toLowerCase() === 'yms') {
      school = 'YMS 1';
    }
    if (bloodType === 'O+') {
      bloodType = 'Unknown';
    }
  }

  const parsedG = parseGradeAndSection(s.grade, s.department, (s as any).section);
  const department = (s.department || (s as any).section || parsedG.cleanSection || '').trim();
  const section = ((s as any).section || s.department || parsedG.cleanSection || '').trim();
  const branch = getStudentBranch(s);
  const location = s.location || branch;

  let grade = s.grade || parsedG.cleanGrade || '';
  if (section && !grade.toUpperCase().includes(section.toUpperCase())) {
    grade = `${parsedG.cleanGrade || grade}${section}`;
  }

  return {
    ...s,
    school,
    bloodType,
    grade,
    department: department || undefined,
    section: section || undefined,
    location,
    branch
  } as Student;
}

export function getStudents(): Student[] {
  return memoryStudents.map(normalizeStudentData);
}

export function addStudent(newStudent: Student): void {
  // Ensure default and encoded fields
  if (!newStudent.status) newStudent.status = 'Accepted';
  const branch = getStudentBranch(newStudent);
  if (!newStudent.location) newStudent.location = branch;
  (newStudent as any).branch = branch;

  // Grade & Section normalization
  const parsedG = parseGradeAndSection(newStudent.grade, newStudent.department, (newStudent as any).section);
  const sec = (newStudent.department || (newStudent as any).section || parsedG.cleanSection || '').trim();
  if (sec) {
    newStudent.department = sec;
    (newStudent as any).section = sec;
    if (!newStudent.grade.toUpperCase().includes(sec.toUpperCase())) {
      newStudent.grade = `${parsedG.cleanGrade || newStudent.grade}${sec}`;
    }
  }

  if (!newStudent.idProductionStatus) newStudent.idProductionStatus = 'READY';
  if (!newStudent.photoIntegrityStatus) {
    newStudent.photoIntegrityStatus = (newStudent.photoPath || newStudent.previewPath || newStudent.thumbnailPath) ? 'PHOTO_VERIFIED' : 'NO_PHOTO';
  }
  // QR Code payload token strictly adheres to required format: {"id":"...","name":"...","roll":"","grade":"..."}
  newStudent.qrCodeData = generateStudentQrToken(newStudent);
  if (!newStudent.recordHistory || newStudent.recordHistory.length === 0) {
    newStudent.recordHistory = [
      {
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'Initial Submission',
        user: getCurrentUser()?.username || 'Field Operator',
        role: 'Sender',
        notes: 'Initial student identity registration and biometric capture'
      }
    ];
  }

  const existingIdx = memoryStudents.findIndex(s => s.studentId === newStudent.studentId || s.id === newStudent.id);
  if (existingIdx !== -1) {
    memoryStudents[existingIdx] = { ...memoryStudents[existingIdx], ...newStudent };
  } else {
    memoryStudents.unshift(newStudent);
  }

  if (newStudent.senderName) {
    const sUser = memoryUsers.find(
      u => u.username.toLowerCase() === newStudent.senderName?.toLowerCase()
    );
    if (sUser) {
      sUser.recordsSentSingle = (sUser.recordsSentSingle || 0) + 1;
    }
    // Record real-time live transmission for sender
    incrementSenderLiveCaptures(newStudent.senderName);
  }

  try {
    const raw = localStorage.getItem('sb_custom_students');
    const existing: Student[] = raw ? JSON.parse(raw) : [];
    const cIdx = existing.findIndex((s: Student) => s.studentId === newStudent.studentId || s.id === newStudent.id);
    const sanitized = sanitizeStudentForStorage(newStudent);
    if (cIdx !== -1) {
      existing[cIdx] = sanitized;
    } else {
      existing.unshift(sanitized);
    }
    const capped = existing.slice(0, 25).map(sanitizeStudentForStorage);
    safeSetItem('sb_custom_students', JSON.stringify(capped));
  } catch (e) {}

  addAuditLog({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: getCurrentUser()?.username || 'Field Operator',
    station: 'Sender',
    action: 'Student Registration',
    entity: newStudent.studentId,
    details: `Registered ${newStudent.fullName} for ${newStudent.school || 'YMS'}`
  });

  // Broadcast across all open tabs, windows, and cloud remote receivers
  publishStudentSync('UPSERT', newStudent);
}

export function updateStudent(id: string, updates: Partial<Student>): void {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    const existing = memoryStudents[index];
    const history = existing.recordHistory || [];
    history.unshift({
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Data Correction',
      user: getCurrentUser()?.username || 'Receiver Analyst',
      role: getCurrentUser()?.role || 'Receiver',
      notes: updates.grade ? `Updated grade to ${updates.grade}` : 'Updated student record fields'
    });

    const updatedFullName = updates.fullName !== undefined ? updates.fullName : existing.fullName;
    const updatedGrade = updates.grade !== undefined ? updates.grade : existing.grade;
    const updatedSchool = updates.school !== undefined ? updates.school : existing.school;
    const updatedBranch = updates.branch || updates.location || (updatedSchool ? getBranchForSchool(updatedSchool) : existing.branch || existing.location);

    // Synchronize section and department from grade if needed
    const parsedG = parseGradeAndSection(updatedGrade, updates.department || (updates as any).section || existing.department);
    const resolvedSection = updates.department || (updates as any).section || parsedG.cleanSection || existing.department || '';

    const newQr = generateStudentQrToken({
      studentId: existing.studentId,
      fullName: updatedFullName,
      rollNumber: '',
      grade: parsedG.displayString || updatedGrade
    });

    const updatedPhone = updates.phone !== undefined ? updates.phone : existing.phone;
    const updatedEmergency = updates.emergencyContactPhone !== undefined
      ? updates.emergencyContactPhone
      : (updates.phone ? updates.phone : (existing.emergencyContactPhone || existing.phone || ''));

    const updatedStudent: Student = {
      ...existing,
      ...updates,
      phone: updatedPhone,
      emergencyContactPhone: updatedEmergency,
      parentPhone: (updates as any).parentPhone || updatedPhone,
      guardianPhone: (updates as any).guardianPhone || updatedPhone,
      fullName: updatedFullName,
      grade: parsedG.displayString || updatedGrade,
      department: resolvedSection,
      section: resolvedSection,
      branch: updatedBranch,
      location: updatedBranch,
      qrCodeData: newQr,
      recordHistory: history,
      updatedAt: new Date().toISOString()
    };

    memoryStudents[index] = updatedStudent;

    // Guaranteed persistence into sb_custom_students in localStorage
    try {
      const raw = localStorage.getItem('sb_custom_students');
      const custom: Student[] = raw ? JSON.parse(raw) : [];
      const cIdx = custom.findIndex(s => s.id === id || s.studentId === id || s.studentId === existing.studentId);
      const sanitized = sanitizeStudentForStorage(updatedStudent);
      if (cIdx !== -1) {
        custom[cIdx] = sanitized;
      } else {
        custom.unshift(sanitized);
      }
      const capped = custom.slice(0, 25).map(sanitizeStudentForStorage);
      safeSetItem('sb_custom_students', JSON.stringify(capped));
    } catch (e) {}

    // Persist update to Supabase PostgreSQL in background
    fetch('/api/students', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updatedStudent)
    }).catch(err => {
      console.warn('Could not sync update to server, queued offline:', err);
      import('@/lib/offlineQueue').then(({ queueOfflineOperation }) => {
        queueOfflineOperation('UPDATE_STUDENT', updatedStudent);
      });
    });

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Updated',
      entity: memoryStudents[index].studentId,
      details: `Updated record for ${memoryStudents[index].fullName}`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }

    // Broadcast across all connected stations and open tabs in real-time
    publishStudentSync('UPSERT', memoryStudents[index]);
  }
}

export async function deleteStudent(id: string, permanent: boolean = false): Promise<boolean> {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  const student = index !== -1 ? memoryStudents[index] : null;
  const targetId = student?.studentId || id;
  const targetDbId = student?.id || id;

  // Immediately blacklist deleted IDs so local merges or syncs never resurrect them
  recordDeletedStudentId(targetId);
  recordDeletedStudentId(targetDbId);
  recordDeletedStudentId(id);

  if (permanent) {
    // 1. PERMANENT PURGE: Remove completely from memory and local storage
    if (index !== -1) {
      memoryStudents.splice(index, 1);
    }
    memoryStudents = memoryStudents.filter(s => s.id !== id && s.studentId !== id && s.studentId !== targetId && s.id !== targetDbId);

    try {
      const raw = localStorage.getItem('sb_custom_students');
      const custom: Student[] = raw ? JSON.parse(raw) : [];
      const filtered = custom.filter(s => s.id !== targetDbId && s.studentId !== targetId && s.id !== id && s.studentId !== id);
      safeSetItem('sb_custom_students', JSON.stringify(filtered.slice(0, 25)));
    } catch (e) {}

    // Persist permanent purge to Cloudflare (R2 photo deletion & Supabase PostgreSQL delete)
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(targetId)}&permanent=true`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        console.warn('Server delete response status:', res.status);
      }
    } catch (err) {
      console.warn('Could not sync permanent delete to server, queued offline:', err);
      try {
        const { queueOfflineOperation } = await import('@/lib/offlineQueue');
        queueOfflineOperation('DELETE_STUDENT', { id: targetDbId, studentId: targetId, permanent: true });
      } catch (qErr) {}
    }

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Permanently Deleted',
      entity: targetId,
      details: `Purged record & Cloudflare R2 portrait for ${student?.fullName || targetId}`
    });

    publishStudentSync('DELETE', targetId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
    return true;
  } else {
    // 2. TEMPORARY DELETE (Soft Delete: Hide only from station system view, preserve data in Cloudflare)
    if (student) {
      student.receiverHidden = true;
      student.hiddenAt = new Date().toISOString();
    }
    memoryStudents.forEach(s => {
      if (s.id === id || s.studentId === id || s.studentId === targetId || s.id === targetDbId) {
        s.receiverHidden = true;
        s.hiddenAt = new Date().toISOString();
      }
    });

    try {
      const raw = localStorage.getItem('sb_custom_students');
      const custom: Student[] = raw ? JSON.parse(raw) : [];
      const cIdx = custom.findIndex(s => s.id === targetDbId || s.studentId === targetId || s.id === id || s.studentId === id);
      if (cIdx !== -1) {
        custom[cIdx].receiverHidden = true;
        custom[cIdx].hiddenAt = new Date().toISOString();
        safeSetItem('sb_custom_students', JSON.stringify(custom.slice(0, 25)));
      }
    } catch (e) {}

    // Sync soft delete to server
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(targetId)}&permanent=false`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        console.warn('Server temporary delete status:', res.status);
      }
    } catch (err) {
      console.warn('Could not sync soft delete to server:', err);
    }

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Hidden from System',
      entity: targetId,
      details: `Temporarily hidden from station directory: ${student?.fullName || targetId}`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
    return true;
  }
}

export async function restoreStudent(id: string): Promise<boolean> {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  const student = index !== -1 ? memoryStudents[index] : null;
  const targetId = student?.studentId || id;
  const targetDbId = student?.id || id;

  // Un-blacklist on restore
  removeDeletedStudentId(targetId);
  removeDeletedStudentId(targetDbId);
  removeDeletedStudentId(id);

  if (student) {
    student.receiverHidden = false;
    student.hiddenAt = null as any;
  }
  memoryStudents.forEach(s => {
    if (s.id === id || s.studentId === id || s.studentId === targetId || s.id === targetDbId) {
      s.receiverHidden = false;
      s.hiddenAt = null as any;
    }
  });

  try {
    const raw = localStorage.getItem('sb_custom_students');
    const custom: Student[] = raw ? JSON.parse(raw) : [];
    const cIdx = custom.findIndex(s => s.id === targetDbId || s.studentId === targetId || s.id === id || s.studentId === id);
    if (cIdx !== -1) {
      custom[cIdx].receiverHidden = false;
      custom[cIdx].hiddenAt = null as any;
      safeSetItem('sb_custom_students', JSON.stringify(custom.slice(0, 25)));
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/students?id=${encodeURIComponent(targetId)}&action=restore`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      console.warn('Server restore status:', res.status);
    }
  } catch (err) {
    console.warn('Could not sync restore to server:', err);
  }

  addAuditLog({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: getCurrentUser()?.username || 'Receiver',
    station: 'Receiver',
    action: 'Student Restored',
    entity: targetId,
    details: `Restored to active directory: ${student?.fullName || targetId}`
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }
  return true;
}

export function getUsers(): User[] {
  return memoryUsers;
}

export function addUser(newUser: User & { password?: string; branch?: string; school?: string }): void {
  if (!newUser.password) newUser.password = '12345678';
  if (!newUser.createdAt) newUser.createdAt = new Date().toISOString();
  if (newUser.recordsSentSingle === undefined) newUser.recordsSentSingle = 0;
  if (newUser.recordsEncoded === undefined) newUser.recordsEncoded = 0;
  if (newUser.workSessionCount === undefined) newUser.workSessionCount = 0;

  const emailLower = (newUser.email || '').toLowerCase().trim();
  const usernameLower = (newUser.username || '').toLowerCase().trim();

  const existingIdx = memoryUsers.findIndex(
    u => u.id === newUser.id ||
         (emailLower && u.email.toLowerCase() === emailLower) ||
         (usernameLower && u.username.toLowerCase() === usernameLower)
  );

  if (existingIdx !== -1) {
    memoryUsers[existingIdx] = { ...memoryUsers[existingIdx], ...newUser };
  } else {
    memoryUsers.unshift(newUser);
  }

  // Remove from sb_deleted_users if user is re-provisioned/added
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('sb_deleted_users') || '[]');
    const updated = deletedList.filter(d =>
      d !== newUser.id.toLowerCase() &&
      d !== emailLower &&
      d !== usernameLower
    );
    localStorage.setItem('sb_deleted_users', JSON.stringify(updated));
  } catch (e) {}

  // Persist to localStorage
  try {
    const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
    const cIdx = custom.findIndex(
      u => u.id === newUser.id ||
           (emailLower && u.email.toLowerCase() === emailLower) ||
           (usernameLower && u.username.toLowerCase() === usernameLower)
    );
    if (cIdx !== -1) {
      custom[cIdx] = { ...custom[cIdx], ...newUser };
    } else {
      custom.unshift(newUser);
    }
    localStorage.setItem('sb_custom_users', JSON.stringify(custom));
  } catch (e) {}

  // Sync to API / Edge Worker
  fetch('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(newUser)
  }).catch(() => {});

  // Broadcast event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: newUser }));
  }
}

export function updateUser(id: string, updates: Partial<User & { password?: string }>): void {
  const targetId = id.toLowerCase();
  const index = memoryUsers.findIndex(u => u.id.toLowerCase() === targetId || u.email.toLowerCase() === targetId || u.username.toLowerCase() === targetId);
  if (index !== -1) {
    memoryUsers[index] = { ...memoryUsers[index], ...updates };
    try {
      const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
      const cIdx = custom.findIndex(u => u.id.toLowerCase() === targetId || u.email.toLowerCase() === targetId || u.username.toLowerCase() === targetId);
      if (cIdx !== -1) {
        custom[cIdx] = { ...custom[cIdx], ...updates };
        localStorage.setItem('sb_custom_users', JSON.stringify(custom));
      }
    } catch (e) {}

    fetch('/api/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(memoryUsers[index])
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: memoryUsers[index] }));
    }
  }
}

export function deleteUser(id: string): void {
  const norm = (id || '').toLowerCase().trim();
  const index = memoryUsers.findIndex(u =>
    (u.id && u.id.toLowerCase() === norm) ||
    (u.email && u.email.toLowerCase() === norm) ||
    (u.username && u.username.toLowerCase() === norm)
  );

  let deletedUser: User | null = null;
  if (index !== -1) {
    deletedUser = memoryUsers[index];
    memoryUsers.splice(index, 1);
  }

  let boundDevice = deletedUser?.boundDeviceId || null;

  // Remove from sb_custom_users
  try {
    const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
    const filtered = custom.filter(u => {
      const match = (u.id && u.id.toLowerCase() === norm) ||
                    (u.email && u.email.toLowerCase() === norm) ||
                    (u.username && u.username.toLowerCase() === norm);
      if (match && !boundDevice) {
        boundDevice = u.boundDeviceId || null;
      }
      return !match;
    });
    localStorage.setItem('sb_custom_users', JSON.stringify(filtered));
  } catch (e) {}

  // Check stored locks for boundDevice if not yet found
  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    if (!boundDevice) {
      boundDevice = locksMap[norm] || (deletedUser?.id && locksMap[deletedUser.id]) || (deletedUser?.email && locksMap[deletedUser.email.toLowerCase()]) || null;
    }
  } catch (e) {}

  const targetId = deletedUser?.id || id;
  const targetEmail = (deletedUser?.email || (norm.includes('@') ? norm : '')).toLowerCase();
  const targetUsername = (deletedUser?.username || (!norm.includes('@') ? norm : '')).toLowerCase();

  // 1. Permanently record deletion in sb_deleted_users so it never resurrects on refresh
  try {
    const deleted: string[] = JSON.parse(localStorage.getItem('sb_deleted_users') || '[]');
    if (targetId && !deleted.includes(targetId.toLowerCase())) deleted.push(targetId.toLowerCase());
    if (targetEmail && !deleted.includes(targetEmail)) deleted.push(targetEmail);
    if (targetUsername && !deleted.includes(targetUsername)) deleted.push(targetUsername);
    localStorage.setItem('sb_deleted_users', JSON.stringify(deleted));
  } catch (e) {}

  // 2. Clear ALL hardware device locks and device occupations to completely FREE the physical terminal!
  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    delete locksMap[targetId];
    delete locksMap[norm];
    if (targetEmail) delete locksMap[targetEmail];
    if (targetUsername) delete locksMap[targetUsername];

    const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
    if (boundDevice) {
      delete occupations[boundDevice];
      Object.keys(locksMap).forEach(key => {
        if (locksMap[key] === boundDevice) delete locksMap[key];
      });
    }
    Object.keys(occupations).forEach(devId => {
      if (
        occupations[devId] === targetEmail ||
        occupations[devId] === targetUsername ||
        occupations[devId] === targetId ||
        occupations[devId] === norm
      ) {
        delete occupations[devId];
      }
    });

    localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));
  } catch (e) {}

  // 3. Notify Cloudflare edge worker to purge locks and free the workstation
  fetch(`/api/users?id=${encodeURIComponent(targetId)}&email=${encodeURIComponent(targetEmail)}&username=${encodeURIComponent(targetUsername)}&deviceId=${encodeURIComponent(boundDevice || '')}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  }).catch(() => {});

  fetch('/api/auth/reset-lock', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId: targetId, email: targetEmail, username: targetUsername, deviceId: boundDevice })
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: { id: targetId, deleted: true } }));
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }
}

export function resetUserHardwareLock(userId: string): void {
  const norm = (userId || '').toLowerCase().trim();
  const u = memoryUsers.find(x =>
    (x.id && x.id.toLowerCase() === norm) ||
    (x.username && x.username.toLowerCase() === norm) ||
    (x.email && x.email.toLowerCase() === norm)
  );

  const targetId = u?.id || userId;
  const targetEmail = (u?.email || (norm.includes('@') ? norm : '')).toLowerCase();
  const targetUsername = (u?.username || (!norm.includes('@') ? norm : '')).toLowerCase();
  const boundDevice = u?.boundDeviceId || null;

  memoryUsers.forEach(x => {
    if (
      (x.id && x.id.toLowerCase() === norm) ||
      (x.username && x.username.toLowerCase() === norm) ||
      (x.email && x.email.toLowerCase() === norm) ||
      (targetId && x.id === targetId) ||
      (targetEmail && x.email && x.email.toLowerCase() === targetEmail) ||
      (targetUsername && x.username && x.username.toLowerCase() === targetUsername)
    ) {
      x.boundDeviceId = null;
    }
  });

  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    delete locksMap[targetId];
    delete locksMap[userId];
    delete locksMap[norm];
    if (targetUsername) delete locksMap[targetUsername];
    if (targetEmail) delete locksMap[targetEmail];

    const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
    if (boundDevice) {
      delete occupations[boundDevice];
      Object.keys(locksMap).forEach(k => {
        if (locksMap[k] === boundDevice) delete locksMap[k];
      });
    }
    Object.keys(occupations).forEach(devId => {
      if (
        occupations[devId] === targetEmail ||
        occupations[devId] === targetUsername ||
        occupations[devId] === targetId ||
        occupations[devId] === norm
      ) {
        delete occupations[devId];
      }
    });

    localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));

    // Also update custom users list in localStorage
    const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
    custom.forEach(cu => {
      if (
        (cu.id && cu.id.toLowerCase() === norm) ||
        (cu.username && cu.username.toLowerCase() === norm) ||
        (cu.email && cu.email.toLowerCase() === norm) ||
        (targetId && cu.id === targetId) ||
        (targetEmail && cu.email && cu.email.toLowerCase() === targetEmail) ||
        (targetUsername && cu.username && cu.username.toLowerCase() === targetUsername)
      ) {
        cu.boundDeviceId = null;
      }
    });
    localStorage.setItem('sb_custom_users', JSON.stringify(custom));
  } catch (e) {}

  // Synchronize unbind with edge worker
  fetch('/api/auth/reset-lock', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId: targetId, email: targetEmail, username: targetUsername, deviceId: boundDevice })
  }).catch(() => {});

  fetch('/api/auth/unbind', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId: targetId, email: targetEmail, username: targetUsername, deviceId: boundDevice })
  }).catch(() => {});

  fetch('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: targetId, email: targetEmail, username: targetUsername, boundDeviceId: null })
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: { id: targetId, boundDeviceId: null } }));
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }
}

export function setUserHardwareLock(userId: string, deviceId: string): void {
  const norm = userId.toLowerCase();
  const u = memoryUsers.find(x => x.id.toLowerCase() === norm || x.username.toLowerCase() === norm || x.email.toLowerCase() === norm);
  if (u) {
    u.boundDeviceId = deviceId;
    try {
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      locksMap[u.id] = deviceId;
      locksMap[u.email.toLowerCase()] = deviceId;
      locksMap[u.username.toLowerCase()] = deviceId;
      localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));

      // Record device occupation by this user email
      const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
      occupations[deviceId] = u.email.toLowerCase();
      localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));

      // Also update custom users list
      const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
      custom.forEach(cu => {
        if (
          (cu.id && cu.id.toLowerCase() === norm) ||
          (cu.username && cu.username.toLowerCase() === norm) ||
          (cu.email && cu.email.toLowerCase() === norm)
        ) {
          cu.boundDeviceId = deviceId;
        }
      });
      localStorage.setItem('sb_custom_users', JSON.stringify(custom));
    } catch (e) {}

    // Synchronize hardware terminal lock to edge worker
    fetch('/api/auth/bind-lock', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId: u.id, email: u.email, username: u.username, deviceId })
    }).catch(() => {});

    fetch('/api/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...u, boundDeviceId: deviceId })
    }).catch(() => {});
  }
}

/**
 * Strict 1-Device Hardware Lock Policy:
 * 1 email/user is strictly bound to 1 physical device. Any secondary device is rejected.
 * When logged in on the SAME device, login always succeeds with zero friction.
 * If user is deleted or device is disconnected, the device is completely freed for other user emails.
 */
export function checkDeviceLock(user: User, currentDeviceId: string): { allowed: boolean; boundDeviceId?: string; reason?: string } {
  if (!user) return { allowed: false, reason: 'Unrecognized user account' };

  // Super Admin and SENDER accounts are never blocked by hardware locks so 30+ senders can transmit concurrently
  if (user.role === 'SUPER_ADMIN' || user.role === 'SENDER' || user.email?.toLowerCase() === 'miskrdires11@gmail.com') {
    return { allowed: true, boundDeviceId: currentDeviceId };
  }

  // 1. Check if this USER is bound to a device
  let boundId: string | null = user.boundDeviceId || null;
  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    const stored = locksMap[user.id] || locksMap[user.email?.toLowerCase()] || locksMap[user.username?.toLowerCase()] || null;
    if (!boundId && stored) {
      boundId = stored;
    }
  } catch (e) {}

  // If user is already bound to a hardware device:
  if (boundId) {
    // CRITICAL: If logging in from the SAME device, ALWAYS ALLOW!
    if (boundId === currentDeviceId) {
      return { allowed: true, boundDeviceId: currentDeviceId };
    }
    // Attempting to log in from a DIFFERENT, unauthorized device:
    return {
      allowed: false,
      boundDeviceId: boundId,
      reason: `Access Denied: Account "${user.email}" is strictly hardware-locked to workstation (${boundId}). Access from this unauthorized workstation (${currentDeviceId}) is rejected. An administrator must disconnect the previous device first.`
    };
  }

  // 2. Check if THIS PHYSICAL DEVICE is occupied by ANOTHER active operator
  try {
    const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
    const occupiedByEmail = occupations[currentDeviceId];
    if (occupiedByEmail && occupiedByEmail.toLowerCase() !== user.email?.toLowerCase()) {
      // Check if that user still exists and is still bound to this device
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      const otherUserLock = locksMap[occupiedByEmail.toLowerCase()];
      const otherUserExists = memoryUsers.some(u => u.email?.toLowerCase() === occupiedByEmail.toLowerCase());

      if (otherUserExists && otherUserLock === currentDeviceId) {
        return {
          allowed: false,
          boundDeviceId: currentDeviceId,
          reason: `Access Denied: This physical workstation (${currentDeviceId}) is currently bound to operator "${occupiedByEmail}". Disconnect that device in Admin or delete the previous operator before signing in with "${user.email}".`
        };
      } else {
        // Stale occupation - clear it
        delete occupations[currentDeviceId];
        localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));
      }
    }
  } catch (e) {}

  // Device is free, user is unbound: allowed!
  return { allowed: true, boundDeviceId: currentDeviceId };
}

// ----------------------------------------------------
// Mistake Correction Logs & Senders Notification Feed
// ----------------------------------------------------
export interface CorrectionLog {
  id: string;
  studentId: string;
  studentName: string;
  senderId?: string;
  senderName?: string;
  actionType: 'PHOTO_CORRECTED' | 'PHONE_FORMATTED' | 'DATA_UPDATED' | 'MISTAKE_RESOLVED';
  description: string;
  resolvedBy: string;
  timestamp: string;
}

export function getCorrectionLogs(senderIdentifier?: string): CorrectionLog[] {
  try {
    const raw = localStorage.getItem('sb_correction_logs');
    const logs: CorrectionLog[] = raw ? JSON.parse(raw) : [];
    if (!senderIdentifier) return logs;
    const norm = senderIdentifier.toLowerCase().trim();
    return logs.filter(l =>
      (l.senderName && l.senderName.toLowerCase().trim() === norm) ||
      (l.senderId && l.senderId.toLowerCase().trim() === norm)
    );
  } catch (e) {
    return [];
  }
}

export function addCorrectionLog(log: Omit<CorrectionLog, 'id' | 'timestamp'>): void {
  try {
    const logs: CorrectionLog[] = JSON.parse(localStorage.getItem('sb_correction_logs') || '[]');
    const newLog: CorrectionLog = {
      ...log,
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem('sb_correction_logs', JSON.stringify(logs.slice(0, 100)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_correction_event', { detail: newLog }));
    }
  } catch (e) {}
}

export function getTasks(): Task[] {
  return memoryTasks;
}

export function addTask(task: Task): void {
  memoryTasks.unshift(task);
  try {
    localStorage.setItem('sb_admin_tasks', JSON.stringify(memoryTasks));
  } catch (e) {}
}

export function updateTaskStatus(id: string, status: Task['status']): void {
  const t = memoryTasks.find(x => x.id === id);
  if (t) {
    t.status = status;
    try {
      localStorage.setItem('sb_admin_tasks', JSON.stringify(memoryTasks));
    } catch (e) {}
  }
}

export function getSchools(): School[] {
  return memorySchools;
}

export function addSchool(school: School): void {
  memorySchools.push(school);
}

export function getAuditLogs(): AuditLog[] {
  return memoryAuditLogs;
}

export function addAuditLog(log: AuditLog): void {
  memoryAuditLogs.unshift(log);
}

const DEFAULT_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'tmpl-cr80-minimal',
    name: 'CR80 Official Minimalist (Standard)',
    description: 'ISO/IEC 7810 ID-1 standard (85.6mm × 53.98mm). Clean white background with Silicon Labs lime header, security QR, and barcode.',
    orientation: 'LANDSCAPE',
    theme: 'MINIMAL_WHITE',
    widthMm: 85.6,
    heightMm: 53.98,
    primaryColor: '#85E510',
  },
  {
    id: 'tmpl-cr80-executive',
    name: 'Executive Academic Credential',
    description: 'Charcoal border, verified watermark, dual security QR, and official signature line for high school and university students.',
    orientation: 'LANDSCAPE',
    theme: 'EXECUTIVE_CHARCOAL',
    widthMm: 85.6,
    heightMm: 53.98,
    primaryColor: '#202833',
  },
  {
    id: 'tmpl-cr80-portrait',
    name: 'Vertical Campus Access Badge',
    description: 'Portrait orientation ID card with large student photograph, instant scan barcode, and prominent grade/campus indicators.',
    orientation: 'PORTRAIT',
    theme: 'CAMPUS_VERTICAL',
    widthMm: 53.98,
    heightMm: 85.6,
    primaryColor: '#85E510',
  }
];

let memoryPrintJobs: PrintJob[] = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sb_print_jobs') : null;
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();

export function getCardTemplates(): CardTemplate[] {
  return DEFAULT_CARD_TEMPLATES;
}

export function getPrintJobs(): PrintJob[] {
  return memoryPrintJobs;
}

export function addPrintJob(job: PrintJob): void {
  memoryPrintJobs.unshift(job);
  try {
    localStorage.setItem('sb_print_jobs', JSON.stringify(memoryPrintJobs));
  } catch (e) {}
}

export function updateStudentIdProductionStatus(studentId: string, status: string, cardSerialNumber?: string): void {
  const index = memoryStudents.findIndex(s => s.id === studentId || s.studentId === studentId);
  if (index !== -1) {
    const student = memoryStudents[index];
    student.idProductionStatus = status;
    if (cardSerialNumber) student.cardSerialNumber = cardSerialNumber;

    const history = student.recordHistory || [];
    history.unshift({
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'ID Production Update',
      user: getCurrentUser()?.username || 'Receiver Operator',
      role: 'Receiver',
      notes: `Updated ID production status to ${status}${cardSerialNumber ? ` (Card Serial: ${cardSerialNumber})` : ''}`
    });
    student.recordHistory = history;

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver Operator',
      station: 'Receiver',
      action: 'ID Production',
      entity: student.studentId,
      details: `Transitioned ID production status to ${status} for ${student.fullName}`
    });
  }
}

export function getMistakes(): MistakeItem[] {
  const mistakes: MistakeItem[] = [];
  const seenIds = new Set<string>();

  memoryStudents.forEach((s) => {
    if (!s.photoPath && !s.previewPath) {
      mistakes.push({
        id: s.id,
        studentId: s.studentId,
        name: s.fullName,
        school: s.school,
        type: 'Missing Photo',
        severity: 'High',
        date: s.createdAt ? s.createdAt.substring(0, 10) : '2026-10-13',
        status: 'Open',
        sender: (s as any).senderOperator || (s as any).sender || (s as any).operator || 'Field Sender',
        senderId: s.senderId || (s as any).senderUsername
      });
    }

    if (seenIds.has(s.studentId)) {
      mistakes.push({
        id: s.id,
        studentId: s.studentId,
        name: s.fullName,
        school: s.school,
        type: 'Duplicate ID',
        severity: 'High',
        date: '2026-10-13',
        status: 'Open',
        sender: (s as any).senderOperator || (s as any).sender || (s as any).operator || 'Field Sender',
        senderId: s.senderId || (s as any).senderUsername
      });
    } else {
      seenIds.add(s.studentId);
    }

    if (s.phone && s.phone.replace(/\D/g, '').length < 9) {
      mistakes.push({
        id: s.id,
        studentId: s.studentId,
        name: s.fullName,
        school: s.school,
        type: 'Invalid Phone Number',
        severity: 'Medium',
        date: '2026-10-13',
        status: 'Open',
        sender: (s as any).senderOperator || (s as any).sender || (s as any).operator || 'Field Sender',
        senderId: s.senderId || (s as any).senderUsername
      });
    }
  });

  return mistakes;
}

// Authentication Session State with 24-hour persistence guarantee
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('sb_auth_token');
  } catch (e) {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      safeSetItem('sb_auth_token', token);
      safeSetItem('sb_token', token);
    } else {
      localStorage.removeItem('sb_auth_token');
      localStorage.removeItem('sb_token');
    }
  } catch (e) {}
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const curUser = getCurrentUser();
  headers['X-Station-Role'] = curUser?.role || 'SENDER';
  const devId = localStorage.getItem('sb_device_id') || 'mobile-sender';
  headers['X-Device-Id'] = devId;
  return headers;
}

export function getCurrentUser(): User | null {
  try {
    const saved = localStorage.getItem('sb_auth_user');
    if (!saved) return null;
    const user: User = JSON.parse(saved);
    const loginTimeStr = localStorage.getItem('sb_auth_time');
    if (loginTimeStr) {
      const loginTime = parseInt(loginTimeStr, 10);
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      // If session expired after 24 hours
      if (Date.now() - loginTime > twentyFourHoursMs) {
        localStorage.removeItem('sb_auth_user');
        localStorage.removeItem('sb_auth_token');
        localStorage.removeItem('sb_token');
        localStorage.removeItem('sb_auth_time');
        return null;
      }
    }
    return user;
  } catch (e) {}
  return null;
}

export function setCurrentUser(user: User | null, token?: string | null): void {
  try {
    if (user) {
      safeSetItem('sb_auth_user', JSON.stringify(user));
      safeSetItem('sb_auth_time', Date.now().toString());
      if (token) {
        safeSetItem('sb_auth_token', token);
        safeSetItem('sb_token', token);
      }
    } else {
      localStorage.removeItem('sb_auth_user');
      localStorage.removeItem('sb_auth_token');
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_auth_time');
    }
  } catch (e) {}
}

export function getOrCreateDeviceId(): string {
  try {
    let devId = localStorage.getItem('sb_device_id');
    if (!devId) {
      devId = 'DEV-SILICON-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      safeSetItem('sb_device_id', devId);
    }
    return devId;
  } catch {
    return 'DEV-SILICON-EDGE';
  }
}

// ----------------------------------------------------
// Sender Transmission Telemetry & Real-Time Metrics
// Strictly starts from 0 for Daily, Weekly, Monthly, and Total,
// incrementing dynamically in real-time as records are transmitted.
// ----------------------------------------------------
// Sender Transmission Telemetry & Real-Time Metrics
// Strictly starts from 0 for Daily, Weekly, Monthly, and Total,
// incrementing dynamically in real-time as records are transmitted.
// Tracks live elapsed active time, minutes active, and pace per minute.
// ----------------------------------------------------
export interface SenderMetrics {
  id: string;
  username: string;
  email: string;
  role: string;
  branch: string;
  school?: string;
  boundDeviceId: string | null;
  status: 'Active' | 'Idle' | 'Locked';
  efficiency: number; // Percentage e.g. 98.4%
  mistakesCount: number;
  today: number;
  week: number;
  month: number;
  total: number;
  lastActive: string;
  // Server-derived fleet telemetry (populated after /api/telemetry/senders loads):
  serverSessionCount?: number;
  serverSessionStart?: number | null;
  serverLastActivity?: number | null;
  terminalStatus?: 'ACTIVE' | 'IDLE' | 'DISCONNECTED' | 'LOCKED';
  // Per-sender per-minute & timing telemetry:
  sessionStartTimestamp: number;
  lastCaptureTimestamp: number | null;
  activeDurationMinutes: number;
  avgTimeTakenSecondsPerRecord: number; // e.g., 42s per student record
  recordsPerMinute: number; // velocity per minute
  lastRecordDurationSeconds: number; // time taken for the most recent submission
}

// Live session transmission registry - strictly starts at 0 for every operator
interface SenderLiveTelemetry {
  today: number;
  week: number;
  month: number;
  total: number;
  todayDateStr?: string;
  sessionStart: number;
  lastCapture: number | null;
  totalActiveTimeSecs: number;
  recentIntervalsSecs: number[];
}

function getStoredSenderTelemetry(norm: string): SenderLiveTelemetry {
  const now = Date.now();
  const todayStr = new Date().toISOString().substring(0, 10);
  const defaultTelemetry: SenderLiveTelemetry = {
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    todayDateStr: todayStr,
    sessionStart: now,
    lastCapture: null,
    totalActiveTimeSecs: 0,
    recentIntervalsSecs: []
  };

  if (typeof window === 'undefined') return defaultTelemetry;

  try {
    const raw = localStorage.getItem(`sb_sender_telemetry_${norm}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.todayDateStr && parsed.todayDateStr !== todayStr) {
        parsed.today = 0;
        parsed.todayDateStr = todayStr;
      }
      return { ...defaultTelemetry, ...parsed };
    }
  } catch (e) {}

  return defaultTelemetry;
}

function saveStoredSenderTelemetry(norm: string, data: SenderLiveTelemetry): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`sb_sender_telemetry_${norm}`, JSON.stringify(data));
  } catch (e) {}
}

const liveSenderSessionCaptures: Record<string, SenderLiveTelemetry> = {};

export function incrementSenderLiveCaptures(senderIdentifier: string): void {
  if (!senderIdentifier) return;
  const norm = senderIdentifier.toLowerCase().trim();
  const now = Date.now();
  const todayStr = new Date().toISOString().substring(0, 10);
  if (!liveSenderSessionCaptures[norm]) {
    liveSenderSessionCaptures[norm] = getStoredSenderTelemetry(norm);
  }

  if (liveSenderSessionCaptures[norm].todayDateStr !== todayStr) {
    liveSenderSessionCaptures[norm].today = 0;
    liveSenderSessionCaptures[norm].todayDateStr = todayStr;
  }

  const prev = liveSenderSessionCaptures[norm].lastCapture;
  const interval = prev ? Math.max(5, Math.min(300, Math.round((now - prev) / 1000))) : 45; // benchmark ~45s for initial capture

  liveSenderSessionCaptures[norm].today += 1;
  liveSenderSessionCaptures[norm].week += 1;
  liveSenderSessionCaptures[norm].month += 1;
  liveSenderSessionCaptures[norm].total += 1;
  liveSenderSessionCaptures[norm].todayDateStr = todayStr;
  liveSenderSessionCaptures[norm].lastCapture = now;
  liveSenderSessionCaptures[norm].totalActiveTimeSecs += interval;
  liveSenderSessionCaptures[norm].recentIntervalsSecs.push(interval);
  if (liveSenderSessionCaptures[norm].recentIntervalsSecs.length > 20) {
    liveSenderSessionCaptures[norm].recentIntervalsSecs.shift();
  }

  saveStoredSenderTelemetry(norm, liveSenderSessionCaptures[norm]);
}

export function resetSenderLiveCaptures(senderIdentifier?: string): void {
  const now = Date.now();
  const todayStr = new Date().toISOString().substring(0, 10);
  if (senderIdentifier) {
    const norm = senderIdentifier.toLowerCase().trim();
    liveSenderSessionCaptures[norm] = {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      todayDateStr: todayStr,
      sessionStart: now,
      lastCapture: null,
      totalActiveTimeSecs: 0,
      recentIntervalsSecs: []
    };
    saveStoredSenderTelemetry(norm, liveSenderSessionCaptures[norm]);
  } else {
    Object.keys(liveSenderSessionCaptures).forEach(k => {
      liveSenderSessionCaptures[k] = {
        today: 0,
        week: 0,
        month: 0,
        total: 0,
        todayDateStr: todayStr,
        sessionStart: now,
        lastCapture: null,
        totalActiveTimeSecs: 0,
        recentIntervalsSecs: []
      };
      saveStoredSenderTelemetry(k, liveSenderSessionCaptures[k]);
    });
  }
}

export interface FleetSenderRow {
  key: string;
  username: string;
  fullName: string;
  email: string | null;
  userId: string | null;
  role: string;
  branch: string;
  userStatus: string | null;
  registered: boolean;
  total: number;
  today: number;
  week: number;
  month: number;
  daily: Record<string, number>;
  sessionCount: number;
  sessionStart: number | null;
  lastActivity: number | null;
  rateLastHourPerMin: number;
  terminalStatus: 'ACTIVE' | 'IDLE' | 'DISCONNECTED' | 'LOCKED';
}

export interface FleetTelemetryPayload {
  success: boolean;
  updatedAt: string;
  scope: string;
  timezone?: string;
  windowDays?: number;
  todayKey?: string;
  senderDailyTarget: number;
  totals: {
    totalVerified: number;
    totalRecords?: number;
    unattributedRecords?: number;
    untimestampedRecords?: number;
    activeSenders: number;
    recentlyActiveSenders: number;
    todayTotal: number;
    weekTotal: number;
    monthTotal: number;
    daily: { date: string; count: number }[];
  };
  senders: FleetSenderRow[];
}

let fleetTelemetrySnapshot: FleetTelemetryPayload | null = null;

export function getFleetTelemetrySnapshot(): FleetTelemetryPayload | null {
  return fleetTelemetrySnapshot;
}

export async function refreshFleetTelemetry(): Promise<FleetTelemetryPayload | null> {
  try {
    const res = await fetch('/api/telemetry/senders', { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return fleetTelemetrySnapshot;
    const data = await res.json();
    if (data && data.success && Array.isArray(data.senders)) {
      fleetTelemetrySnapshot = data;
    }
  } catch (e) {}
  return fleetTelemetrySnapshot;
}

function findFleetSender(norm: string): FleetSenderRow | null {
  if (!fleetTelemetrySnapshot || !norm) return null;
  return fleetTelemetrySnapshot.senders.find(s =>
    s.key === norm ||
    String(s.username || '').toLowerCase() === norm ||
    (s.email ? String(s.email).toLowerCase() === norm : false)
  ) || null;
}

// ---------------------------------------------------------------------------
// PLATFORM SETTINGS + EXPORT PATH TEMPLATES (@photo / @qr in CSV/Excel)
// ---------------------------------------------------------------------------
export interface PlatformSettings {
  photoPathTemplate: string;
  syncSchool: string;
  exportPhotoTemplate: string;
  exportQrTemplate: string;
  exportBaseFolderPhoto: string;
  exportBaseFolderQr: string;
  senderDailyTarget: number;
  updatedAt?: string | null;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  photoPathTemplate: '{grade}/{name}.jpg',
  syncSchool: 'Warka',
  exportPhotoTemplate: '{name}.jpg',
  exportQrTemplate: '{id}_qr.png',
  exportBaseFolderPhoto: 'C:\\Users\\Administrator\\Desktop\\yekaelementry',
  exportBaseFolderQr: 'C:\\Users\\Administrator\\Desktop\\yekaelementry',
  senderDailyTarget: 50
};

let platformSettingsCache: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
try {
  const raw = localStorage.getItem('sb_platform_settings_cache');
  if (raw) platformSettingsCache = { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(raw) };
} catch (e) {}

export function getPlatformSettingsCached(): PlatformSettings {
  return platformSettingsCache;
}

export async function refreshPlatformSettings(): Promise<PlatformSettings> {
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      platformSettingsCache = { ...DEFAULT_PLATFORM_SETTINGS, ...data };
      try { localStorage.setItem('sb_platform_settings_cache', JSON.stringify(platformSettingsCache)); } catch (e) {}
    }
  } catch (e) {}
  return platformSettingsCache;
}

export function applyExportPathTemplate(
  template: string,
  vars: { grade?: string; fullName?: string; studentId?: string },
  defaultExt: string
): string {
  const clean = (v: string | undefined, fallback: string) =>
    String(v || fallback || '').trim().replace(/[\/\\:*?"<>|\s]+/g, '_');
  let out = String(template || `{name}.${defaultExt}`)
    .replace(/\{grade\}/gi, clean(vars.grade, 'General'))
    .replace(/\{name\}/gi, clean(vars.fullName, 'Student'))
    .replace(/\{id\}/gi, clean(vars.studentId, 'Student'));
  out = out.replace(/[^a-zA-Z0-9_\-.\/{}]/g, '');
  if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(out)) out += `.${defaultExt}`;
  return out.replace(/^\/+/, '');
}

function joinExportPath(baseFolder: string, relPath: string): string {
  const folder = String(baseFolder || '').trim().replace(/[<>"|\n\r]+/g, '');
  if (!folder) return relPath;
  const sep = /[\\/]+$/.test(folder) ? '' : '\\';
  return `${folder}${sep}${relPath}`;
}

export function buildExportPhotoPath(s: Student): string {
  const settings = getPlatformSettingsCached();
  const rel = applyExportPathTemplate(settings.exportPhotoTemplate, {
    grade: s.grade, fullName: s.fullName, studentId: s.studentId
  }, 'jpg');
  return joinExportPath(settings.exportBaseFolderPhoto, rel);
}

export function buildExportQrPath(s: Student): string {
  const settings = getPlatformSettingsCached();
  const rel = applyExportPathTemplate(settings.exportQrTemplate, {
    grade: s.grade, fullName: s.fullName, studentId: s.studentId
  }, 'png');
  return joinExportPath(settings.exportBaseFolderQr, rel);
}

export function getSenderMetrics(senderIdentifier: string): SenderMetrics {
  const norm = (senderIdentifier || '').toLowerCase().trim();
  const curUser = getCurrentUser();
  const user = memoryUsers.find(
    u => u.username.toLowerCase() === norm || u.email.toLowerCase() === norm || (curUser && curUser.id === u.id)
  ) || curUser;

  const todayStr = new Date().toISOString().substring(0, 10);
  if (!liveSenderSessionCaptures[norm]) {
    liveSenderSessionCaptures[norm] = getStoredSenderTelemetry(norm);
  }
  const live = liveSenderSessionCaptures[norm];
  if (live.todayDateStr !== todayStr) {
    live.today = 0;
    live.todayDateStr = todayStr;
  }

  // Authoritative calendar boundary calculation
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const weekStart = todayStart - 7 * 86400000;
  const monthStart = todayStart - 30 * 86400000;

  let realTotal = 0;
  let realToday = 0;
  let realWeek = 0;
  let realMonth = 0;

  const uName = (user?.username || '').toLowerCase().trim();
  const uEmail = (user?.email || '').toLowerCase().trim();
  const uId = (user?.id || '').toLowerCase().trim();

  // Combine memoryStudents and any custom students from localStorage to guarantee no drops
  let allStudentsToCheck = memoryStudents;
  try {
    const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
    if (custom.length > 0) {
      const existingMap = new Map(allStudentsToCheck.map(s => [s.studentId, s]));
      custom.forEach(cs => {
        if (!existingMap.has(cs.studentId)) {
          existingMap.set(cs.studentId, cs);
        }
      });
      allStudentsToCheck = Array.from(existingMap.values());
    }
  } catch (e) {}

  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const utcTodayStr = now.toISOString().substring(0, 10);
  const isCurrentSender = curUser?.role === 'SENDER';

  allStudentsToCheck.forEach(s => {
    if (!s || s.receiverHidden) return;
    const sn = (s.senderName || '').toLowerCase().trim();
    const sid = (s.senderId || '').toLowerCase().trim();
    const match =
      (sn && (sn === norm || sn === uName || sn === uEmail)) ||
      (sid && (sid === norm || sid === uId || sid === uName)) ||
      (!sn && !sid && (norm === 'field operator' || norm === 'sender')) ||
      (isCurrentSender && (!sn || sn === 'field operator' || sn === 'sender' || sn === uName || sn === norm));

    if (match) {
      realTotal++;
      const rawDate = s.createdAt || (s as any).registrationDate || s.recordHistory?.[0]?.date || '';
      const datePrefix = rawDate.replace('T', ' ').substring(0, 10);
      const isToday = datePrefix === localTodayStr || datePrefix === utcTodayStr || rawDate.startsWith(localTodayStr) || rawDate.startsWith(utcTodayStr);
      const sTime = rawDate ? new Date(rawDate.replace(' ', 'T')).getTime() : 0;
      if (isToday || (sTime && sTime >= todayStart)) realToday++;
      if (isToday || (sTime && sTime >= weekStart)) realWeek++;
      if (isToday || (sTime && sTime >= monthStart)) realMonth++;
    }
  });

  const fleetRow = findFleetSender(norm);
  let today: number;
  let week: number;
  let month: number;
  let total: number;

  if (fleetRow) {
    // Server-authoritative historical totals: computed from the durable Supabase
    // dataset, deduplicated by unique studentId. Immune to page refreshes,
    // re-renders, retries and browser-local counter drift.
    today = fleetRow.today;
    week = Math.max(fleetRow.week, today);
    month = Math.max(fleetRow.month, week);
    total = Math.max(fleetRow.total, month);
    live.today = today;
    live.week = week;
    live.month = month;
    live.total = total;
    live.todayDateStr = todayStr;
    saveStoredSenderTelemetry(norm, live);
  } else {
    // Degraded (no fleet snapshot): fall back to record-derived local counts.
    today = Math.max(realToday, live.today);
    week = Math.max(realWeek, live.week, today);
    month = Math.max(realMonth, live.month, week);
    total = Math.max(realTotal, live.total, user?.recordsSentSingle || 0, month);
    live.today = today;
    live.week = week;
    live.month = month;
    live.total = total;
    live.todayDateStr = todayStr;
    saveStoredSenderTelemetry(norm, live);
  }

  const mistakesCount = 0;
  const efficiency = 100;

  const status: 'Active' | 'Idle' | 'Locked' = fleetRow
    ? (fleetRow.terminalStatus === 'ACTIVE' ? 'Active' : fleetRow.terminalStatus === 'LOCKED' ? 'Locked' : 'Idle')
    : user?.boundDeviceId
      ? (today > 0 ? 'Active' : 'Idle')
      : 'Active';

  // Compute timing and per-minute velocity:
  const recentIntervals = live.recentIntervalsSecs;
  const avgTimeTaken = recentIntervals.length > 0
    ? Math.round(recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length)
    : (today > 0 ? 45 : 0);
  const lastRecordDuration = recentIntervals.length > 0
    ? recentIntervals[recentIntervals.length - 1]
    : (today > 0 ? 45 : 0);

  // Elapsed active minutes
  const activeDurationMinutes = live.totalActiveTimeSecs > 0
    ? Math.max(1, Math.round(live.totalActiveTimeSecs / 60))
    : (today > 0 ? 1 : 0);

  // Records per minute (velocity)
  const recordsPerMinute = avgTimeTaken > 0
    ? Number((60 / avgTimeTaken).toFixed(2))
    : 0;

  // Determine branch based on school or direct user branch
  const assignedSchool = user?.school || (norm === 'dagim' ? 'Mojo' : norm === 'biruk' || norm === 'henok' ? 'Yacine' : norm === 'zemichael' || norm === 'yonas' ? 'Debebech' : norm === 'abeni1' || norm === 'sol' ? 'High Tech 1' : 'YMS 1');
  let assignedBranch = user?.branch || getBranchForSchool(assignedSchool);

  return {
    id: user?.id || `usr-${norm}`,
    username: user?.username || senderIdentifier,
    email: user?.email || `${norm}@gmail.com`,
    role: user?.role || 'SENDER',
    branch: assignedBranch,
    school: assignedSchool,
    boundDeviceId: user?.boundDeviceId || null,
    status,
    efficiency,
    mistakesCount,
    today,
    week,
    month,
    total,
    lastActive: fleetRow?.lastActivity
      ? new Date(fleetRow.lastActivity).toISOString()
      : (live.lastCapture ? new Date(live.lastCapture).toISOString() : ((user as any)?.lastActiveAt || (user as any)?.lastLoginAt || new Date().toISOString())),
    serverSessionCount: fleetRow?.sessionCount,
    serverSessionStart: fleetRow?.sessionStart ?? null,
    serverLastActivity: fleetRow?.lastActivity ?? null,
    terminalStatus: fleetRow?.terminalStatus,
    sessionStartTimestamp: live.sessionStart,
    lastCaptureTimestamp: live.lastCapture,
    activeDurationMinutes,
    avgTimeTakenSecondsPerRecord: avgTimeTaken,
    recordsPerMinute,
    lastRecordDurationSeconds: lastRecordDuration
  };
}

export function getAllSendersMetrics(): SenderMetrics[] {
  const senders = memoryUsers.filter(u => u.role === 'SENDER');
  const metrics = senders.map(u => getSenderMetrics(u.username));
  const snapshot = fleetTelemetrySnapshot;
  if (snapshot) {
    const covered = new Set(senders.map(u => u.username.toLowerCase().trim()));
    snapshot.senders.forEach(s => {
      const k = String(s.username || '').toLowerCase().trim();
      if (k && !covered.has(k) && !covered.has(s.key)) {
        metrics.push(getSenderMetrics(s.username));
        covered.add(k);
      }
    });
  }
  return metrics;
}



