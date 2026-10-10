import { Student, User, Task, School, AuditLog, StudentCoreRequest, MistakeItem, UserRole, CardTemplate, PrintJob } from '@/types';

// Initial fallback schools
const DEFAULT_SCHOOLS: School[] = [
  { id: "sch_yms", name: "YMS", location: "Addis Ababa", status: "Active", studentsCount: 1245 },
  { id: "sch_adika", name: "Adika Youth", location: "Addis Ababa", status: "Active", studentsCount: 982 },
  { id: "sch_soa", name: "School of America", location: "Addis Ababa", status: "Active", studentsCount: 756 },
  { id: "sch_ferway", name: "Ferway", location: "Addis Ababa", status: "Active", studentsCount: 542 },
  { id: "sch_warka", name: "Warka", location: "Addis Ababa", status: "Active", studentsCount: 398 },
  { id: "sch_yacine", name: "Yacine", location: "Adama", status: "Active", studentsCount: 420 },
  { id: "sch_debebech", name: "Debebech", location: "Adama", status: "Active", studentsCount: 510 },
  { id: "sch_hightech", name: "High Tech", location: "Harar", status: "Active", studentsCount: 380 }
];

const DEFAULT_TASKS: Task[] = [
  { id: "T-001", title: "Review missing photos for Grade 9", assignedTo: "Loza Bereket", school: "YMS", priority: "High", deadline: "2026-10-15", status: "In Progress" },
  { id: "T-002", title: "Correct Ethiopian phone numbers", assignedTo: "Alemu Tadesse", school: "Adika Youth", priority: "Medium", deadline: "2026-10-15", status: "Pending" },
  { id: "T-003", title: "Verify school student IDs", assignedTo: "Hana Tadesse", school: "School of America", priority: "High", deadline: "2026-10-16", status: "Overdue" },
  { id: "T-004", title: "Data quality audit for Ferway", assignedTo: "Getnet Kassa", school: "Ferway", priority: "Low", deadline: "2026-10-18", status: "Completed" },
  { id: "T-005", title: "Photo verification batch 4", assignedTo: "Dawit Alemu", school: "Warka", priority: "Medium", deadline: "2026-10-16", status: "In Progress" }
];

export interface OperatorAccount extends User {
  password?: string;
}

export const PRESET_OPERATORS: OperatorAccount[] = [
  {
    id: "cmua5dk5n00041tc43u1v7em9",
    username: "miskrdires12",
    email: "miskrdires12@gmail.com",
    role: "SENDER",
    password: "sender123",
    boundDeviceId: null,
    recordsSentSingle: 499,
  },
  {
    id: "usr-sender-1",
    username: "Loza Bereket",
    email: "loza.bereket@siliconlabs.et",
    role: "SENDER",
    password: "sender123",
    boundDeviceId: null,
    recordsSentSingle: 28,
  },
  {
    id: "cmukweowr00009pzsimqcm168",
    username: "yonatantesfa",
    email: "yonatantesfa@gmail.com",
    role: "RECEIVER",
    password: "receiver123",
    boundDeviceId: null,
    recordsEncoded: 335,
  },
  {
    id: "usr-receiver-1",
    username: "Alemu Tadesse",
    email: "alemu.tadesse@siliconlabs.et",
    role: "RECEIVER",
    password: "receiver123",
    boundDeviceId: null,
    recordsEncoded: 3578,
  },
  {
    id: "cmuq26kz90001q5dgcb3lu519",
    username: "miskrdires1",
    email: "miskrdires1@gmail.com",
    role: "ADMIN",
    password: "admin123",
    boundDeviceId: null,
  },
  {
    id: "usr-admin-1",
    username: "Getnet Kassa",
    email: "admin.addis@siliconlabs.et",
    role: "ADMIN",
    password: "admin123",
    boundDeviceId: null,
  },
  {
    id: "cmu7b6rkh00002ggkkxg5ecd9",
    username: "miskrdires11",
    email: "miskrdires11@gmail.com",
    role: "SUPER_ADMIN",
    password: "admin123",
    boundDeviceId: null,
  },
  {
    id: "usr-super-2",
    username: "root_superadmin",
    email: "superadmin@siliconlabs.et",
    role: "SUPER_ADMIN",
    password: "super123",
    boundDeviceId: null,
  }
];

let memoryStudents: Student[] = [];
let memoryUsers: User[] = [...PRESET_OPERATORS];
let memorySchools: School[] = DEFAULT_SCHOOLS;
let memoryTasks: Task[] = DEFAULT_TASKS;
let memoryAuditLogs: AuditLog[] = [
  { timestamp: "2026-10-13 14:32:10", user: "miskrdires11@gmail.com", station: "Super Admin", action: "Settings Saved", entity: "System Configuration", details: "Updated R2 cloud photo paths and phone validation rules" },
  { timestamp: "2026-10-13 14:15:02", user: "Alemu Tadesse", station: "Receiver", action: "Bulk Download", entity: "500 Photos", details: "Exported ZIP archive for YMS Grade 9" },
  { timestamp: "2026-10-13 13:48:22", user: "Loza Bereket", station: "Sender", action: "Student Registration", entity: "SB-2026-12788", details: "Registered student Loza Bereket with portrait photo" }
];

export async function initStore(): Promise<void> {
  if (memoryStudents.length === 0) {
    try {
      const res = await fetch('/data/students.json');
      if (res.ok) {
        memoryStudents = await res.json();
      }
    } catch (e) {
      console.warn('Could not load /data/students.json', e);
    }
  }

  try {
    const res = await fetch('/data/users.json');
    if (res.ok) {
      const loadedUsers: User[] = await res.json();
      // Merge while preserving preset aliases
      const existingEmails = new Set(memoryUsers.map(u => u.email.toLowerCase()));
      loadedUsers.forEach(u => {
        if (!existingEmails.has(u.email.toLowerCase())) {
          memoryUsers.push(u);
        }
      });
    }
  } catch (e) {
    console.warn('Could not load /data/users.json', e);
  }

  // Merge custom students from localStorage
  try {
    const custom = localStorage.getItem('sb_custom_students');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        memoryStudents = [...parsed, ...memoryStudents];
      }
    }
  } catch (e) {}

  // Sync bound devices from localStorage if previously updated
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
}

export function getStudents(): Student[] {
  return memoryStudents;
}

export function addStudent(newStudent: Student): void {
  // Ensure default fields
  if (!newStudent.status) newStudent.status = 'Accepted';
  if (!newStudent.location) newStudent.location = 'Addis Ababa';
  if (!newStudent.recordHistory || newStudent.recordHistory.length === 0) {
    newStudent.recordHistory = [
      {
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'Initial Submission',
        user: getCurrentUser()?.username || 'Loza Bereket',
        role: 'Sender',
        notes: 'Initial student identity registration and portrait capture'
      }
    ];
  }

  memoryStudents.unshift(newStudent);

  try {
    const existing = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
    existing.unshift(newStudent);
    localStorage.setItem('sb_custom_students', JSON.stringify(existing));
  } catch (e) {}

  addAuditLog({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: getCurrentUser()?.username || 'Loza Bereket',
    station: 'Sender',
    action: 'Student Registration',
    entity: newStudent.studentId,
    details: `Registered ${newStudent.fullName} for ${newStudent.school || 'YMS'}`
  });

  // Dispatch custom event for immediate UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange', { detail: newStudent }));
  }
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

    memoryStudents[index] = {
      ...existing,
      ...updates,
      recordHistory: history,
      updatedAt: new Date().toISOString()
    };

    // Update in localStorage as well
    try {
      const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
      const cIdx = custom.findIndex(s => s.id === id || s.studentId === id);
      if (cIdx !== -1) {
        custom[cIdx] = memoryStudents[index];
        localStorage.setItem('sb_custom_students', JSON.stringify(custom));
      }
    } catch (e) {}

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
  }
}

export function deleteStudent(id: string): void {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    const deleted = memoryStudents.splice(index, 1)[0];
    try {
      const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
      const filtered = custom.filter(s => s.id !== id && s.studentId !== id);
      localStorage.setItem('sb_custom_students', JSON.stringify(filtered));
    } catch (e) {}

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Admin',
      station: 'Admin',
      action: 'Student Deleted',
      entity: deleted.studentId,
      details: `Removed record for ${deleted.fullName}`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
  }
}

export function getUsers(): User[] {
  return memoryUsers;
}

export function resetUserHardwareLock(userId: string): void {
  const u = memoryUsers.find(x => x.id === userId || x.username === userId || x.email === userId);
  if (u) {
    u.boundDeviceId = null;
    try {
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      locksMap[u.id] = null;
      localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    } catch (e) {}
  }
}

export function setUserHardwareLock(userId: string, deviceId: string): void {
  const u = memoryUsers.find(x => x.id === userId || x.username === userId || x.email === userId);
  if (u) {
    u.boundDeviceId = deviceId;
    try {
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      locksMap[u.id] = deviceId;
      localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    } catch (e) {}
  }
}

export function getTasks(): Task[] {
  return memoryTasks;
}

export function addTask(task: Task): void {
  memoryTasks.unshift(task);
}

export function updateTaskStatus(id: string, status: Task['status']): void {
  const t = memoryTasks.find(x => x.id === id);
  if (t) t.status = status;
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

let memoryPrintJobs: PrintJob[] = [
  { id: 'JOB-9021', timestamp: '2026-10-13 14:10:00', operator: 'Yonatan Tesfa', templateName: 'CR80 Official Minimalist', studentCount: 25, status: 'COMPLETED' },
  { id: 'JOB-9020', timestamp: '2026-10-13 11:30:15', operator: 'Yonatan Tesfa', templateName: 'Executive Academic Credential', studentCount: 140, status: 'COMPLETED' },
];

export function getCardTemplates(): CardTemplate[] {
  return DEFAULT_CARD_TEMPLATES;
}

export function getPrintJobs(): PrintJob[] {
  return memoryPrintJobs;
}

export function addPrintJob(job: PrintJob): void {
  memoryPrintJobs.unshift(job);
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
        status: 'Open'
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
        status: 'Open'
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
        status: 'Open'
      });
    }
  });

  return mistakes;
}

// Authentication Session State
export function getCurrentUser(): User | null {
  try {
    const saved = localStorage.getItem('sb_auth_user');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('sb_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sb_auth_user');
  }
}

export function getOrCreateDeviceId(): string {
  let devId = localStorage.getItem('sb_device_id');
  if (!devId) {
    devId = 'DEV-SILICON-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('sb_device_id', devId);
  }
  return devId;
}
