export type UserRole = 'SENDER' | 'RECEIVER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  boundDeviceId?: string | null;
  boundDeviceInfo?: string | null;
  lastActiveAt?: string | null;
  recordsSentSingle?: number;
  recordsEncoded?: number;
  workSessionCount?: number;
  createdAt?: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  phone?: string;
  sex?: 'Female' | 'Male' | string;
  grade?: string;
  school?: string;
  address?: string;
  cityRegion?: string;
  bloodType?: string;
  rollNumber?: string;
  photoPath?: string;
  previewPath?: string;
  originalPhotoPath?: string;
  senderName?: string;
  status?: string;
  bulkedStatus?: 'BULKED' | 'UNBULKED' | string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  schoolBusUsage?: string;
  dateOfBirth?: string;
  guardianFullName?: string;
  nationality?: string;
  createdAt?: string;
  updatedAt?: string;
  hasMistake?: boolean;
  country?: string;
  location?: string;
  recordHistory?: { date: string; action: string; user: string; role: string; notes: string; }[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  school: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Overdue' | 'Completed';
}

export interface School {
  id: string;
  name: string;
  location: string;
  status: 'Active' | 'Inactive';
  studentsCount: number;
}

export interface AuditLog {
  timestamp: string;
  user: string;
  station: string;
  action: string;
  entity: string;
  details: string;
}

export interface StudentCoreRequest {
  id: string;
  school: string;
  device: string;
  studentId: string;
  type: string;
  timestamp: string;
  authStatus: string;
  syncStatus: string;
  latency: string;
}

export interface MistakeItem {
  id: string;
  studentId: string;
  name: string;
  school?: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  date: string;
  status: string;
}
