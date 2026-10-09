import { Student, User, Task, School, AuditLog, StudentCoreRequest, MistakeItem, UserRole } from '@/types';

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

let memoryStudents: Student[] = [];
let memoryUsers: User[] = [];
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

  if (memoryUsers.length === 0) {
    try {
      const res = await fetch('/data/users.json');
      if (res.ok) {
        memoryUsers = await res.json();
      }
    } catch (e) {
      console.warn('Could not load /data/users.json', e);
    }
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
}

export function getStudents(): Student[] {
  return memoryStudents;
}

export function addStudent(newStudent: Student): void {
  memoryStudents.unshift(newStudent);
  try {
    const existing = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
    existing.unshift(newStudent);
    localStorage.setItem('sb_custom_students', JSON.stringify(existing));
  } catch (e) {}

  addAuditLog({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: getCurrentUser()?.username || 'Field Operator',
    station: 'Sender',
    action: 'Student Registration',
    entity: newStudent.studentId,
    details: `Registered ${newStudent.fullName} for ${newStudent.school}`
  });
}

export function updateStudent(id: string, updates: Partial<Student>): void {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    memoryStudents[index] = { ...memoryStudents[index], ...updates, updatedAt: new Date().toISOString() };
    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Updated',
      entity: memoryStudents[index].studentId,
      details: `Updated fields for ${memoryStudents[index].fullName}`
    });
  }
}

export function deleteStudent(id: string): void {
  const index = memoryStudents.findIndex(s => s.id === id);
  if (index !== -1) {
    const deleted = memoryStudents.splice(index, 1)[0];
    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Admin',
      station: 'Admin',
      action: 'Student Deleted',
      entity: deleted.studentId,
      details: `Removed record for ${deleted.fullName}`
    });
  }
}

export function getUsers(): User[] {
  return memoryUsers;
}

export function resetUserHardwareLock(userId: string): void {
  const u = memoryUsers.find(x => x.id === userId || x.username === userId);
  if (u) {
    u.boundDeviceId = null;
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

export function getMistakes(): MistakeItem[] {
  const mistakes: MistakeItem[] = [];
  const seenIds = new Set<string>();

  memoryStudents.forEach((s) => {
    if (!s.photoPath) {
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
  return {
    id: 'usr-default',
    username: 'miskrdires11',
    email: 'miskrdires11@gmail.com',
    role: 'SUPER_ADMIN'
  };
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('sb_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sb_auth_user');
  }
}
