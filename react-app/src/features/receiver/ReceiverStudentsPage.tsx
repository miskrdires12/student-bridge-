import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Eye, Edit2, Trash2, X, Plus, Calendar,
  UserCheck, Shield, ChevronLeft, ChevronRight,
  BookOpen, Users as UsersIcon, Check, Printer,
  Download, Image as ImageIcon, QrCode as QrIcon,
  FileText, CheckCircle2, AlertTriangle, Phone,
  MapPin, Clock, ExternalLink, RefreshCw, FileSpreadsheet,
  Archive, ArrowUpDown, ArrowUp, ArrowDown, Filter, Sparkles, Crop, Cloud,
  Radio, Award, Activity, TrendingUp, ArrowRight, Link2, Upload,
  Folder, FolderOpen, Layers, Maximize2, Minimize2, MoveRight, CalendarDays, MoreHorizontal
} from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  getStudents, addStudent, updateStudent, deleteStudent,
  getPhotoUrl, getPhotoCandidates, getPhotoEncodeClass, subscribeToStudentSync,
  DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP,
  generateStudentQrToken, getStudentPhotoFileName, getStudentQrFileName,
  addCorrectionLog, getAllSendersMetrics, SenderMetrics, getAuthHeaders,
  getCurrentUser,
  initStore, refreshStudentFeed, buildExportPhotoPath, buildExportQrPath, refreshPlatformSettings,
  exportPhoneValue,
  isServerApiOnline, refreshFleetTelemetry, getFleetTelemetrySnapshot
} from '@/lib/store';
import { Student } from '@/types';
import { photoSourceError } from '@/lib/syncEngine';
import { PhoneCropModal } from '@/components/PhoneCropModal';
import { R2_PUBLIC_BASE_URL } from '@/lib/syncEngine';
import {
  getDistinctGradeOptions,
  getDistinctSectionOptions,
  matchesGradeFilter,
  matchesSectionFilter,
  getCleanGrade,
  getCleanSection,
  getGradeDisplay,
  getStudentBranch,
  getBranchForSchool,
  parseGradeAndSection,
  CANONICAL_GRADE_ORDER
} from '@/lib/gradeUtils';

export const ReceiverStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [senderFilter, setSenderFilter] = useState('ALL');
  // Several transmitted days can be viewed at once: the operator picks today, then adds other days
  // without losing the first one. An empty list means "all days".
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [datePickerValue, setDatePickerValue] = useState('');

  // Full-screen directory mode (table or folders expanded to the viewport)
  const [isDirectoryFullscreen, setIsDirectoryFullscreen] = useState(false);

  // Right-click menu for school folders and student cards in the folder view
  const [folderMenu, setFolderMenu] = useState<
    { x: number; y: number; kind: 'folder'; folderName: string } |
    { x: number; y: number; kind: 'student'; folderName: string; studentId: string } |
    null
  >(null);

  // Move students to another school / rename folder
  const [moveTarget, setMoveTarget] = useState<{ ids: string[]; fromSchool: string } | null>(null);
  const [moveDestination, setMoveDestination] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ schoolName: string; branch: string } | null>(null);
  const [renameSchoolValue, setRenameSchoolValue] = useState('');
  const [renameBranchValue, setRenameBranchValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Bulked Pause Note Modal
  const [calendarNoteModalOpen, setCalendarNoteModalOpen] = useState(false);
  const [calendarPauseNote, setCalendarPauseNote] = useState('');
  const [pausedIds, setPausedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('sb_paused_student_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [pausedNotes, setPausedNotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('sb_paused_student_notes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Selected Students for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting State for Student ID, Grade & Sec, Date Transmitted (Default: Date Transmitted from new to old)
  type SortField = 'studentId' | 'grade' | 'createdAt';
  const [sortField, setSortField] = useState<SortField | null>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    } else {
      setSortField(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  // Pagination (Default: 500 students per page as required)
  const [page, setPage] = useState(1);
  // 500 rows measured 3-6 s of blocked main thread per render on a station, and the directory re-renders
  // on every feed delta, so the page looked frozen for tens of seconds after opening it. 50 rows renders
  // in ~320 ms; the operator can still raise this for a bulk pass.
  const [pageSize, setPageSize] = useState(50);

  // View Switcher: Master Table vs School Directory Folders
  const [viewMode, setViewMode] = useState<'table' | 'folders'>('table');
  const [selectedSchoolFolder, setSelectedSchoolFolder] = useState<string | null>(null);
  const [folderGradeTab, setFolderGradeTab] = useState<string>('ALL');
  const [folderSectionTab, setFolderSectionTab] = useState<string>('ALL');
  const [folderSearchQuery, setFolderSearchQuery] = useState<string>('');
  const [folderBranchFilter, setFolderBranchFilter] = useState<string>('ALL');
  // Big schools hold over a thousand records; rendering every photo card at once locked the
  // station, so the grid paints in pages and the rest arrive on demand.
  const [folderCardLimit, setFolderCardLimit] = useState(60);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const [liveServerStats, setLiveServerStats] = useState<{
    totalStudents: number;
    totalPhotos: number;
    todayRecords: number;
    weeklyRecords: number;
    monthlyRecords: number;
    queryLatencyMs: number;
    acceptanceRate: string;
    r2Bucket: string;
    lastPing: number;
    available: boolean;
    statsComplete: boolean;
    statsMissing: string[];
  }>({
    totalStudents: 0,
    totalPhotos: 0,
    todayRecords: 0,
    weeklyRecords: 0,
    monthlyRecords: 0,
    queryLatencyMs: 0,
    acceptanceRate: '',
    r2Bucket: '',
    lastPing: 0,
    available: false,
    statsComplete: true,
    statsMissing: []
  });
  const [feedRetrying, setFeedRetrying] = useState(false);

  // Active senders means "a station is transmitting right now", not "every account that ever sent a
  // record". The fleet rollup already answers that with a 15-minute window, so the header reads the
  // same number as the Live Dashboard instead of the lifetime distinct-sender count.
  const [fleetActiveSenders, setFleetActiveSenders] = useState<number | null>(() => {
    const snap = getFleetTelemetrySnapshot();
    return snap ? snap.totals.activeSenders : null;
  });

  // Active Student Detail Drawer (Clean 3-tab layout without fake placeholder fields)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailQrDataUrl, setDetailQrDataUrl] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'Photo' | 'Academic' | 'Activity'>('Photo');

  // Online Photo Editor State (Opens when student photo is clicked)
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [editingPhotoStudent, setEditingPhotoStudent] = useState<Student | null>(null);

  // Student Data Edit Modal State (All fields EXCEPT photo & QR)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDataStudent, setEditingDataStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editSex, setEditSex] = useState<'Male' | 'Female'>('Male');
  const [editGrade, setEditGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editBranch, setEditBranch] = useState('Addis Ababa');
  const [editSchool, setEditSchool] = useState('YMS');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editBloodType, setEditBloodType] = useState('Unknown');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editBusUsage, setEditBusUsage] = useState<'Yes' | 'No'>('Yes');

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Directory add: the desk can register a record a station never captured. It reuses the edit form,
  // so no second copy of those fields can drift; these hold the new row's ID and its honest delivery
  // state, because a record only this browser holds is not in the directory.
  const [isNewStudentMode, setIsNewStudentMode] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addStatus, setAddStatus] = useState<{ kind: 'idle' | 'sending' | 'sent' | 'queued' | 'error'; text: string }>({ kind: 'idle', text: '' });

  // Mistake Analyzer Pop-up Modal State (Screen Overlay in Directory)
  const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false);
  const [mistakeFilterType, setMistakeFilterType] = useState<'ALL' | 'Missing Photo' | 'Duplicate ID' | 'Invalid Phone Number'>('ALL');
  const [mistakeSearch, setMistakeSearch] = useState('');
  const [resolvedMistakeKeys, setResolvedMistakeKeys] = useState<Set<string>>(new Set());

  // Lightbox for Full Size Photo
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Bulked / Downloaded Student tracking (persisted in localStorage)
  const [bulkedIds, setBulkedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('sb_bulked_student_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markStudentsAsBulked = (ids: string[]) => {
    setBulkedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try {
        localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('Could not store bulked ids:', e);
      }
      return next;
    });
  };

  // Cloud Sync Handler
  const handleCloudSync = async () => {
    try {
      setIsLoading(true);
      await loadData();
      alert('Cloud Sync Complete: Student database synchronized with master server.');
    } catch (e) {
      alert('Cloud sync up to date.');
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive Download Progress Modal
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    title: string;
    current: number;
    total: number;
    statusText: string;
  }>({
    isOpen: false,
    title: '',
    current: 0,
    total: 0,
    statusText: ''
  });

  // Default Avatar Placeholder
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23F1F5F9'/%3E%3Ccircle cx='50' cy='38' r='20' fill='%23CBD5E1'/%3E%3Cpath d='M20 85 C20 65, 35 60, 50 60 C65 60, 80 65, 80 85 Z' fill='%23CBD5E1'/%3E%3C/svg%3E";

  // Ethiopian Phone Number Auto-Formatter: 09 -> +2519, 07 -> +2517 (blank stays blank)
  const formatPhoneNumber = (val: string): string => {
    let clean = val.trim();
    if (!clean) return '';
    if (clean.startsWith('09')) return '+2519' + clean.slice(2);
    if (clean.startsWith('07')) return '+2517' + clean.slice(2);
    if (clean.startsWith('9') && !clean.startsWith('+')) return '+2519' + clean.slice(1);
    if (clean.startsWith('7') && !clean.startsWith('+')) return '+2517' + clean.slice(1);
    return clean;
  };

  // 1. Authoritative Data Loading
  const loadData = async () => {
    try {
      setIsLoading(true);
      await initStore();
    } catch (e) {
      console.warn('Syncing with local storage:', e);
    } finally {
      setStudents(getStudents());
      setSendersList(getAllSendersMetrics());
      setIsLoading(false);
    }
  };

  const [sendersList, setSendersList] = useState<SenderMetrics[]>(() => getAllSendersMetrics());

  useEffect(() => {
    const initial = getStudents();
    if (initial.length > 0) {
      setStudents(initial);
    }
    setSendersList(getAllSendersMetrics());
    loadData();

    const handleDataChange = () => {
      const current = getStudents();
      if (current.length > 0) {
        setStudents([...current]);
      }
      setSendersList(getAllSendersMetrics());
    };
    const handleSoftDelete = (e: any) => {
      const sid = e?.detail;
      if (sid) {
        setStudents(prev => prev.map(s => (s.studentId === sid || s.id === sid) ? { ...s, receiverHidden: true, hiddenAt: new Date().toISOString() } : s));
      }
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);
    window.addEventListener('studentbridge_userchange', handleDataChange);
    window.addEventListener('studentbridge_softdelete', handleSoftDelete);

    const unsubscribe = subscribeToStudentSync(
      (incoming) => {
        setStudents((prev) => {
          const idx = prev.findIndex(s => s.studentId === incoming.studentId || s.id === incoming.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...incoming };
            return updated;
          }
          return [incoming, ...prev];
        });
      },
      (deletedId) => {
        setStudents((prev) => prev.filter(s => s.studentId !== deletedId && s.id !== deletedId));
        deleteStudent(deletedId, true).catch(() => {});
      }
    );

    // Ten seconds is how long an operator waits to see a colleague's send, not how often the whole
    // registry is re-read. This asks the store's cursor what moved; a full paginated walk restarted
    // here every ten seconds used to overtake the pass before it, leaving the page loading and the
    // table showing zero students.
    const autoPollInterval = setInterval(() => {
      refreshStudentFeed().then(() => {
        const current = getStudents();
        if (current.length > 0) setStudents(current);
        setSendersList(getAllSendersMetrics());
      }).catch(() => {});
    }, 10000);

    return () => {
      clearInterval(autoPollInterval);
      window.removeEventListener('studentbridge_datachange', handleDataChange);
      window.removeEventListener('studentbridge_userchange', handleDataChange);
      window.removeEventListener('studentbridge_softdelete', handleSoftDelete);
      unsubscribe();
    };
  }, []);

  // Update Detail QR Code when detail student changes
  useEffect(() => {
    if (detailStudent) {
      // Strict JSON QR token format: {"id":"...","name":"...","roll":"","grade":"..."}
      QRCode.toDataURL(generateStudentQrToken(detailStudent), {
        width: 320,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
        .then(url => setDetailQrDataUrl(url))
        .catch(() => setDetailQrDataUrl(null));
    } else {
      setDetailQrDataUrl(null);
    }
  }, [detailStudent]);

  // Normalize Section (compatibility wrapper using canonical gradeUtils)
  const getSection = (s: Student): string => {
    return getCleanSection(s) || s.department || 'A';
  };

  // Distinct Filter Values
  const distinctGrades = useMemo(() => {
    return getDistinctGradeOptions(students);
  }, [students]);

  const distinctSections = useMemo(() => {
    return getDistinctSectionOptions(students, gradeFilter);
  }, [students, gradeFilter]);

  interface GradeHierarchyItem {
    baseGrade: string;        // e.g. '1', '2', '10', 'LKG'
    displayLabel: string;     // e.g. 'Grade 1', 'Grade 2', 'Grade 10', 'LKG'
    totalCount: number;       // total students in this grade
    sections: {
      section: string;        // e.g. 'A', 'B', 'C', 'D'
      label: string;          // e.g. '1A', '1B', 'Section A'
      count: number;
    }[];
    noSectionCount: number;   // students with no section letter
  }

  const gradeHierarchy = useMemo<GradeHierarchyItem[]>(() => {
    const gradeMap = new Map<string, { total: number; secMap: Map<string, number>; noSec: number }>();

    students.forEach(s => {
      if (!s || s.receiverHidden) return;
      const parsed = parseGradeAndSection(s.grade, s.department || (s as any).section);
      const bg = parsed.cleanGrade || 'General';
      const sec = parsed.cleanSection;

      if (!gradeMap.has(bg)) {
        gradeMap.set(bg, { total: 0, secMap: new Map(), noSec: 0 });
      }
      const item = gradeMap.get(bg)!;
      item.total++;
      if (sec) {
        item.secMap.set(sec, (item.secMap.get(sec) || 0) + 1);
      } else {
        item.noSec++;
      }
    });

    const items: GradeHierarchyItem[] = [];
    gradeMap.forEach((val, bg) => {
      const sections = Array.from(val.secMap.entries())
        .map(([section, count]) => ({
          section,
          label: /^\d+$/.test(bg) ? `${bg}${section}` : `Section ${section}`,
          count
        }))
        .sort((a, b) => a.section.localeCompare(b.section));

      const displayLabel = /^\d+$/.test(bg) ? `Grade ${bg}` : bg;
      items.push({
        baseGrade: bg,
        displayLabel,
        totalCount: val.total,
        sections,
        noSectionCount: val.noSec
      });
    });

    return items.sort((a, b) => {
      const idxA = CANONICAL_GRADE_ORDER.indexOf(a.baseGrade);
      const idxB = CANONICAL_GRADE_ORDER.indexOf(b.baseGrade);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.baseGrade.localeCompare(b.baseGrade, undefined, { numeric: true });
    });
  }, [students]);

  const activeGradeItem = useMemo(() => {
    if (gradeFilter === 'ALL') return null;
    return gradeHierarchy.find(g => g.baseGrade.toLowerCase() === gradeFilter.toLowerCase()) || null;
  }, [gradeHierarchy, gradeFilter]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return students.filter(s => {
      if (!s) return false;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.school && s.school.toLowerCase().includes(q)) ||
        (s.senderName && s.senderName.toLowerCase().includes(q));

      const matchGrade = matchesGradeFilter(s, gradeFilter);
      const matchSection = matchesSectionFilter(s, sectionFilter);
      const sBranch = getStudentBranch(s);
      const matchBranch = branchFilter === 'ALL' || sBranch === branchFilter;
      const matchSchool = schoolFilter === 'ALL' || (s.school || '').trim().toLowerCase() === schoolFilter.toLowerCase();
      const matchSender = senderFilter === 'ALL' || (s.senderName || s.senderId) === senderFilter;
      const studentDate = (s.createdAt || (s as any).registrationDate || s.recordHistory?.[0]?.date || '').substring(0, 10);
      const matchDate = selectedDates.length === 0 || selectedDates.includes(studentDate);

      const st = (s.status || 'Active').toUpperCase();
      const isAccepted = st === 'ACCEPTED' || st === 'ACTIVE' || st === 'VERIFIED';
      const matchStatus =
        (statusFilter === 'ALL' && !s.receiverHidden) ||
        (statusFilter === 'Active' && isAccepted && !s.receiverHidden) ||
        (statusFilter === 'Hidden' && s.receiverHidden === true);

      return matchSearch && matchGrade && matchSection && matchBranch && matchSchool && matchSender && matchDate && matchStatus;
    });
  }, [students, search, gradeFilter, sectionFilter, branchFilter, schoolFilter, statusFilter, senderFilter, selectedDates]);

  const distinctSenders = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.receiverHidden) return;
      if (s.senderName) set.add(s.senderName);
      else if (s.senderId) set.add(s.senderId);
    });
    return Array.from(set).sort();
  }, [students]);

  // Records the receiver desk hid are still part of the registry total but are excluded
  // from the default table view; the count is displayed so the two numbers reconcile.
  const hiddenCount = useMemo(() => students.filter(s => s && s.receiverHidden).length, [students]);

  // Calendar dates with student count for everyday viewer
  const calendarDateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      if (!s || s.receiverHidden) return;
      const d = (s.createdAt || (s as any).registrationDate || s.recordHistory?.[0]?.date || '').substring(0, 10);
      if (d) counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [students]);

  const distinctDates = useMemo(() => {
    return Object.keys(calendarDateCounts).sort().reverse();
  }, [calendarDateCounts]);

  // One calendar key per record, matching the day buckets used by the counters above.
  const studentDateKey = (s: Student): string =>
    (s.createdAt || (s as any).registrationDate || s.recordHistory?.[0]?.date || '').substring(0, 10);

  const dayChipLabel = (key: string): string => {
    const [y, m, d] = key.split('-').map(Number);
    if (!y || !m || !d) return key;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    });
  };

  const toggleSelectedDate = (day: string) => {
    if (!day) return;
    setSelectedDates(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()));
    setPage(1);
  };

  // Picker appends instead of replacing, so picking a second day keeps the first one in view.
  const addSelectedDate = (day: string) => {
    if (!day) return;
    setSelectedDates(prev => (prev.includes(day) ? prev : [...prev, day].sort()));
    setPage(1);
  };

  const clearSelectedDates = () => {
    setSelectedDates([]);
    setDatePickerValue('');
    setPage(1);
  };

  const folderDayCount = (folder: { students: Student[] }): number => {
    if (selectedDates.length === 0) return folder.students.length;
    return folder.students.filter(s => selectedDates.includes(studentDateKey(s))).length;
  };

  // Live Telemetry Poller from Authoritative Edge Stats API
  const fetchLiveTelemetry = async () => {
    setIsRefreshingTelemetry(true);
    const start = Date.now();
    try {
      const res = await fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' });
      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        setLiveServerStats({
          totalStudents: Number(data.totalStudents) || 0,
          totalPhotos: Number(data.totalPhotos) || 0,
          todayRecords: Number(data.todayRecords) || 0,
          weeklyRecords: Number(data.weeklyRecords) || 0,
          monthlyRecords: Number(data.monthlyRecords) || 0,
          queryLatencyMs: latency,
          acceptanceRate: data.acceptanceRate || '',
          r2Bucket: data.r2Bucket || '',
          lastPing: Date.now(),
          statsComplete: data.statsComplete !== false,
          statsMissing: Array.isArray(data.statsMissing) ? data.statsMissing : [],
          available: true
        });
      } else {
        setLiveServerStats(prev => ({ ...prev, available: false }));
      }
    } catch (e) {
      setLiveServerStats(prev => ({ ...prev, available: false }));
    } finally {
      setIsRefreshingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fleet rollup: 60s server cache, so a 30s poll is cheap and keeps "Active Senders" honest.
  useEffect(() => {
    let alive = true;
    const load = () => {
      refreshFleetTelemetry()
        .then(snap => {
          if (alive && snap) setFleetActiveSenders(snap.totals.activeSenders);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Degraded fallback (fleet endpoint unreachable): a sender counts as active only if one of its
  // records landed in the last 15 minutes.
  const fallbackActiveSenders = useMemo(() => {
    const cutoff = Date.now() - 15 * 60000;
    const senders = new Set<string>();
    students.forEach(s => {
      if (s.receiverHidden) return;
      const at = Date.parse(s.createdAt || '');
      if (!Number.isFinite(at) || at < cutoff) return;
      senders.add(String(s.senderId || s.senderName || '').toLowerCase().trim() || 'unattributed');
    });
    return senders.size;
  }, [students]);

  // Reload the whole registry into this station's dataset. Used when the loaded list is
  // smaller than the server total, which means a sync feed returned an incomplete page set.
  const retryDatasetLoad = async () => {
    setFeedRetrying(true);
    try {
      // forceFullFeed is the escape hatch: it ignores both the freshness window and a delta pass that
      // is already running, because the operator just told us the loaded list is short.
      await initStore({ forceFullFeed: true });
      setStudents(getStudents());
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    } catch (e) {
      console.warn('Full registry reload notice:', e);
    } finally {
      setFeedRetrying(false);
    }
  };

  // Real-Time Transmission & Amounts Telemetry
  const telemetryAmounts = useMemo(() => {
    const now = new Date();
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const utcTodayStr = now.toISOString().substring(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const activeStudents = students.filter(s => !s.receiverHidden);

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;
    let withPhotoCount = 0;
    let verifiedPhotoCount = 0;
    let latestTransmitted: Student | null = null;

    activeStudents.forEach(s => {
      if (!s) return;
      const rawDate = s.createdAt || (s as any).registrationDate || s.recordHistory?.[0]?.date || '';
      const datePrefix = rawDate.replace('T', ' ').substring(0, 10);
      const isToday = datePrefix === localTodayStr || datePrefix === utcTodayStr || rawDate.startsWith(localTodayStr) || rawDate.startsWith(utcTodayStr);
      if (isToday) todayCount++;
      if (rawDate >= sevenDaysAgo || isToday) weekCount++;
      if (rawDate >= thirtyDaysAgo || isToday) monthCount++;

      const hasPhoto = s.photoIntegrityStatus === 'PHOTO_VERIFIED' ||
        (s.photoPath && !s.photoPath.includes('avatar') && !s.photoPath.includes('placeholder')) ||
        (s.previewPath && !s.previewPath.includes('avatar'));
      if (hasPhoto) withPhotoCount++;
      if (s.photoIntegrityStatus === 'PHOTO_VERIFIED') verifiedPhotoCount++;

      if (!latestTransmitted || (rawDate && rawDate > (latestTransmitted.createdAt || ''))) {
        latestTransmitted = s;
      }
    });

    // Header KPIs read the server totals, which are deduplicated by studentId and bucketed
    // on school-local calendar days; using them here keeps this page identical to the Live
    // Dashboard, Fleet and Telemetry Velocity instead of drifting by a browser-local rolling
    // window. The loop above only serves degraded mode when /api/stats is unreachable.
    // Sticky Math.max() blending was removed deliberately: a maximum can never go down, so
    // deleted or unverified records stayed on screen permanently.
    const server = liveServerStats.available ? liveServerStats : null;
    const shownTotal = server ? server.totalStudents : activeStudents.length;
    const shownPhotos = server ? server.totalPhotos : verifiedPhotoCount;

    return {
      total: shownTotal,
      today: server ? server.todayRecords : todayCount,
      week: server ? server.weeklyRecords : weekCount,
      month: server ? server.monthlyRecords : monthCount,
      withPhoto: shownPhotos,
      photoFilesCatalogued: withPhotoCount,
      pendingPhoto: Math.max(0, shownTotal - shownPhotos),
      latestTransmitted
    };
  }, [students, liveServerStats]);

  // =========================================================================
  // SCHOOL DIRECTORY FOLDERS COMPUTATION (Each School in its Dedicated Folder)
  // =========================================================================
  interface SchoolFolderData {
    schoolName: string;
    branch: string;
    totalStudents: number;
    withPhotoCount: number;
    photoPercent: number;
    latestTransmitted: string | null;
    grades: { grade: string; count: number }[];
    students: Student[];
  }

  const schoolFolders = useMemo<SchoolFolderData[]>(() => {
    const activeStudents = students.filter(s => !s.receiverHidden);
    const map = new Map<string, { branch: string; students: Student[] }>();

    // 1. Pre-populate all canonical schools from BRANCH_SCHOOL_MAP
    Object.entries(BRANCH_SCHOOL_MAP).forEach(([branch, schList]) => {
      schList.forEach(name => {
        const cleanName = name.trim();
        if (!map.has(cleanName)) {
          map.set(cleanName, { branch, students: [] });
        }
      });
    });

    // 2. Add students into their corresponding school folder
    activeStudents.forEach(st => {
      const sName = (st.school || '').trim() || 'Unassigned';
      const branch = getStudentBranch(st) || getBranchForSchool(sName);
      if (!map.has(sName)) {
        map.set(sName, { branch, students: [] });
      }
      map.get(sName)!.students.push(st);
    });

    const result: SchoolFolderData[] = [];
    map.forEach(({ branch, students: schStudents }, schoolName) => {
      let withPhoto = 0;
      let newestDate: string | null = null;
      const gradeCountMap = new Map<string, number>();

      schStudents.forEach(s => {
        const hasPhoto = s.photoIntegrityStatus === 'PHOTO_VERIFIED' ||
          (s.photoPath && !s.photoPath.includes('avatar') && !s.photoPath.includes('placeholder')) ||
          (s.previewPath && !s.previewPath.includes('avatar'));
        if (hasPhoto) withPhoto++;

        const d = s.createdAt || (s as any).registrationDate || s.updatedAt || '';
        if (d && (!newestDate || d > newestDate)) {
          newestDate = d;
        }

        const g = (s.grade || 'Unknown').trim();
        gradeCountMap.set(g, (gradeCountMap.get(g) || 0) + 1);
      });

      const total = schStudents.length;
      const pct = total > 0 ? Math.round((withPhoto / total) * 100) : 100;

      const grades = Array.from(gradeCountMap.entries())
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));

      result.push({
        schoolName,
        branch,
        totalStudents: total,
        withPhotoCount: withPhoto,
        photoPercent: pct,
        latestTransmitted: newestDate,
        grades,
        students: schStudents
      });
    });

    return result.sort((a, b) => {
      if (b.totalStudents !== a.totalStudents) return b.totalStudents - a.totalStudents;
      return a.schoolName.localeCompare(b.schoolName);
    });
  }, [students]);

  const filteredSchoolFolders = useMemo(() => {
    return schoolFolders.filter(folder => {
      if (folderBranchFilter !== 'ALL' && folder.branch !== folderBranchFilter) {
        return false;
      }
      if (folderSearchQuery.trim()) {
        const q = folderSearchQuery.toLowerCase().trim();
        const matchName = folder.schoolName.toLowerCase().includes(q);
        const matchBranch = folder.branch.toLowerCase().includes(q);
        if (!matchName && !matchBranch) return false;
      }
      return true;
    });
  }, [schoolFolders, folderBranchFilter, folderSearchQuery]);

  const currentSchoolFolder = useMemo(() => {
    if (!selectedSchoolFolder) return null;
    return schoolFolders.find(f => f.schoolName.toLowerCase() === selectedSchoolFolder.toLowerCase()) || null;
  }, [schoolFolders, selectedSchoolFolder]);

  const currentSchoolGradeHierarchy = useMemo<GradeHierarchyItem[]>(() => {
    if (!currentSchoolFolder) return [];
    const gradeMap = new Map<string, { total: number; secMap: Map<string, number>; noSec: number }>();

    currentSchoolFolder.students.forEach(s => {
      if (!s || s.receiverHidden) return;
      if (selectedDates.length > 0 && !selectedDates.includes(studentDateKey(s))) return;
      const parsed = parseGradeAndSection(s.grade, s.department || (s as any).section);
      const bg = parsed.cleanGrade || 'General';
      const sec = parsed.cleanSection;

      if (!gradeMap.has(bg)) {
        gradeMap.set(bg, { total: 0, secMap: new Map(), noSec: 0 });
      }
      const item = gradeMap.get(bg)!;
      item.total++;
      if (sec) {
        item.secMap.set(sec, (item.secMap.get(sec) || 0) + 1);
      } else {
        item.noSec++;
      }
    });

    const items: GradeHierarchyItem[] = [];
    gradeMap.forEach((val, bg) => {
      const sections = Array.from(val.secMap.entries())
        .map(([section, count]) => ({
          section,
          label: /^\d+$/.test(bg) ? `${bg}${section}` : `Section ${section}`,
          count
        }))
        .sort((a, b) => a.section.localeCompare(b.section));

      const displayLabel = /^\d+$/.test(bg) ? `Grade ${bg}` : bg;
      items.push({
        baseGrade: bg,
        displayLabel,
        totalCount: val.total,
        sections,
        noSectionCount: val.noSec
      });
    });

    return items.sort((a, b) => {
      const idxA = CANONICAL_GRADE_ORDER.indexOf(a.baseGrade);
      const idxB = CANONICAL_GRADE_ORDER.indexOf(b.baseGrade);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.baseGrade.localeCompare(b.baseGrade, undefined, { numeric: true });
    });
  }, [currentSchoolFolder, selectedDates]);

  const currentFolderActiveGrade = useMemo(() => {
    if (folderGradeTab === 'ALL') return null;
    return currentSchoolGradeHierarchy.find(g => g.baseGrade.toLowerCase() === folderGradeTab.toLowerCase()) || null;
  }, [currentSchoolGradeHierarchy, folderGradeTab]);

  const currentFolderStudents = useMemo(() => {
    if (!currentSchoolFolder) return [];
    let list = currentSchoolFolder.students;
    if (selectedDates.length > 0) {
      list = list.filter(s => selectedDates.includes(studentDateKey(s)));
    }
    if (folderGradeTab !== 'ALL') {
      list = list.filter(s => matchesGradeFilter(s, folderGradeTab));
    }
    if (folderSectionTab !== 'ALL') {
      list = list.filter(s => matchesSectionFilter(s, folderSectionTab));
    }
    if (folderSearchQuery.trim()) {
      const q = folderSearchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    return list;
  }, [currentSchoolFolder, folderGradeTab, folderSectionTab, folderSearchQuery, selectedDates]);

  useEffect(() => {
    setFolderCardLimit(60);
  }, [currentSchoolFolder?.schoolName, folderGradeTab, folderSectionTab, folderSearchQuery, selectedDates.length]);

  // Dynamically computed registry anomalies for the Mistake Analyzer pop-up
  const mistakeItems = useMemo(() => {
    const list: Array<{
      key: string;
      student: Student;
      type: 'Missing Photo' | 'Duplicate ID' | 'Invalid Phone Number';
      severity: 'High' | 'Medium';
      detail: string;
    }> = [];

    const idCounts = new Map<string, number>();
    students.forEach(s => {
      idCounts.set(s.studentId, (idCounts.get(s.studentId) || 0) + 1);
    });

    students.forEach(s => {
      // 1. Missing Photo: placeholder or empty
      const photo = s.photoPath || s.previewPath || '';
      if (!photo || photo.includes('data:image/svg') || photo.trim() === '') {
        const key = `photo_${s.studentId}`;
        if (!resolvedMistakeKeys.has(key)) {
          list.push({
            key,
            student: s,
            type: 'Missing Photo',
            severity: 'High',
            detail: 'Missing biometric portrait photo (default avatar)'
          });
        }
      }

      // 2. Duplicate ID
      if ((idCounts.get(s.studentId) || 0) > 1) {
        const key = `dupe_${s.id || s.studentId}`;
        if (!resolvedMistakeKeys.has(key)) {
          list.push({
            key,
            student: s,
            type: 'Duplicate ID',
            severity: 'High',
            detail: `ID collision: ${idCounts.get(s.studentId)} students share ${s.studentId}`
          });
        }
      }

      // 3. Invalid Phone
      const digits = (s.phone || '').replace(/\D/g, '');
      if (s.phone && (digits.length < 9 || digits.length > 13 || (!s.phone.startsWith('+251') && !s.phone.startsWith('09') && !s.phone.startsWith('07')))) {
        const key = `phone_${s.studentId}`;
        if (!resolvedMistakeKeys.has(key)) {
          list.push({
            key,
            student: s,
            type: 'Invalid Phone Number',
            severity: 'Medium',
            detail: `Format issue: "${s.phone}" (expected +251 9... / 09...)`
          });
        }
      }
    });

    return list;
  }, [students, resolvedMistakeKeys]);

  const handleQuickFixPhone = (s: Student) => {
    const fixed = formatPhoneNumber(s.phone || '');
    if (fixed && fixed !== s.phone) {
      updateStudent(s.studentId, { phone: fixed });
      setStudents(prev => prev.map(item => item.studentId === s.studentId ? { ...item, phone: fixed } : item));
      setResolvedMistakeKeys(prev => new Set([...prev, `phone_${s.studentId}`]));
      addCorrectionLog({
        studentId: s.studentId,
        studentName: s.fullName || 'Student',
        senderId: s.senderId,
        senderName: s.senderName || 'Field Sender',
        actionType: 'PHONE_FORMATTED',
        description: `Phone standardized to valid Ethiopian format (${fixed}) for ${s.fullName}`,
        resolvedBy: 'Receiver Desk'
      });
    }
  };

  const sortedFiltered = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'studentId') {
        comparison = (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true });
      } else if (sortField === 'grade') {
        const gradeA = `${a.grade || ''} ${a.department || ''}`.trim();
        const gradeB = `${b.grade || ''} ${b.department || ''}`.trim();
        comparison = gradeA.localeCompare(gradeB, undefined, { numeric: true });
      } else if (sortField === 'createdAt') {
        const rawDateA = a.createdAt || (a as any).registrationDate || a.updatedAt || a.recordHistory?.[0]?.date || '';
        const rawDateB = b.createdAt || (b as any).registrationDate || b.updatedAt || b.recordHistory?.[0]?.date || '';
        const timeA = rawDateA ? new Date(rawDateA).getTime() : 0;
        const timeB = rawDateB ? new Date(rawDateB).getTime() : 0;
        comparison = timeA - timeB;
        if (comparison === 0) {
          comparison = (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true });
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedFiltered.length / pageSize) || 1;
  const pagedStudents = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  // Selection Checkboxes
  const toggleSelectRow = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedStudents.length && pagedStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedStudents.map(s => s.studentId)));
    }
  };

  // Open Student Detail Drawer (View Action)
  const handleOpenDetail = (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDetailStudent(s);
    setDetailTab('Photo');
    setIsDetailDrawerOpen(true);
  };

  // Open Online Photo Editor (Triggered when photo thumbnail or avatar is clicked)
  const handleOpenPhotoEditor = (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPhotoStudent(s);
    setIsPhotoEditorOpen(true);
  };

  // Save Edited Photo: Uploads directly to Cloudflare R2 storage and replaces unedited photo
  const handleSaveEditedPhoto = async (croppedDataUrl: string) => {
    if (!editingPhotoStudent) return;
    const targetSid = editingPhotoStudent.studentId;
    const cleanGrade = (editingPhotoStudent.grade || 'General').trim().replace(/[\/\\:*?"<>|\s]+/g, '_');
    const cleanName = (editingPhotoStudent.fullName || 'Student').trim().replace(/[\/\\:*?"<>|\s]+/g, '_');
    const photoKey = `${cleanGrade}/${cleanName}.jpg`;

    // 1. Update UI state immediately with local data URL for instant zero-lag preview
    setStudents(prev => prev.map(s => s.studentId === targetSid ? {
      ...s,
      photoPath: croppedDataUrl,
      previewPath: croppedDataUrl,
      thumbnailPath: croppedDataUrl,
      photoIntegrityStatus: 'PHOTO_VERIFIED'
    } : s));

    if (detailStudent?.studentId === targetSid) {
      setDetailStudent(prev => prev ? {
        ...prev,
        photoPath: croppedDataUrl,
        previewPath: croppedDataUrl,
        thumbnailPath: croppedDataUrl,
        photoIntegrityStatus: 'PHOTO_VERIFIED'
      } : null);
    }

    setIsPhotoEditorOpen(false);

    // 2. Upload to Cloudflare R2 Bucket 'siliconlabs'
    let r2Url = `${R2_PUBLIC_BASE_URL}/${photoKey}`;
    try {
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          studentId: targetSid,
          grade: cleanGrade,
          filename: photoKey,
          data: croppedDataUrl
        })
      });
      if (upRes.ok) {
        const upData = await upRes.json();
        if (upData.url || upData.r2Url) {
          r2Url = upData.url || upData.r2Url;
        }
      }
    } catch (r2Err) {
      console.warn('R2 upload warning during photo edit, edge worker fallback:', r2Err);
    }

    // 3. Update store and local state with permanent Cloudflare R2 URL
    updateStudent(targetSid, {
      photoPath: r2Url,
      previewPath: r2Url,
      thumbnailPath: r2Url,
      originalPhotoPath: r2Url,
      photoIntegrityStatus: 'PHOTO_VERIFIED'
    });

    setStudents(prev => prev.map(s => s.studentId === targetSid ? {
      ...s,
      photoPath: r2Url,
      previewPath: r2Url,
      thumbnailPath: r2Url,
      photoIntegrityStatus: 'PHOTO_VERIFIED'
    } : s));

    if (detailStudent?.studentId === targetSid) {
      setDetailStudent(prev => prev ? {
        ...prev,
        photoPath: r2Url,
        previewPath: r2Url,
        thumbnailPath: r2Url,
        photoIntegrityStatus: 'PHOTO_VERIFIED'
      } : null);
    }

    // Add feedback log so the sender sees their mistake has been corrected:
    addCorrectionLog({
      studentId: targetSid,
      studentName: editingPhotoStudent.fullName || 'Student',
      senderId: editingPhotoStudent.senderId,
      senderName: editingPhotoStudent.senderName || 'Field Sender',
      actionType: 'PHOTO_CORRECTED',
      description: `Photograph re-centered & enhanced to 3:4 portrait standard for ${editingPhotoStudent.fullName}`,
      resolvedBy: 'Receiver Desk'
    });

    setEditingPhotoStudent(null);
  };

  // Open Edit Student Data Modal (Excludes photo and QR per requirement)
  const handleOpenEditData = (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDataStudent(s);
    setIsNewStudentMode(false);
    setNewStudentId('');
    setEditFullName(s.fullName || '');
    setEditSex(s.sex === 'Female' ? 'Female' : 'Male');
    setEditGrade(s.grade || '9');
    setEditSection(getSection(s));
    const loc = getStudentBranch(s);
    setEditBranch(loc);
    const validSchools = BRANCH_SCHOOL_MAP[loc] || ['YMS'];
    setEditSchool(validSchools.includes(s.school || '') ? s.school! : validSchools[0]);
    setEditPhone(s.phone || '');
    setEditDob(s.dateOfBirth ? s.dateOfBirth.substring(0, 10) : '2010-01-01');
    setEditBloodType(s.bloodType || 'Unknown');
    setEditGuardianName(s.guardianFullName || '');
    setEditEmergencyPhone(s.emergencyContactPhone || '');
    setEditBusUsage(s.schoolBusUsage === 'No' ? 'No' : 'Yes');
    setIsEditModalOpen(true);
  };

  // A directory ID is generated against the records this station holds, so the desk is not handed a
  // number that already belongs to someone else.
  const nextDirectoryStudentId = () => {
    const taken = new Set(getStudents().map(s => (s.studentId || '').trim().toUpperCase()));
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = `SB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `SB-2026-${Date.now().toString(36).toUpperCase()}`;
  };

  const handleOpenAddStudent = () => {
    setEditingDataStudent(null);
    setIsNewStudentMode(true);
    setNewStudentId(nextDirectoryStudentId());
    setEditFullName('');
    setEditSex('Male');
    setEditGrade('');
    setEditSection('');
    setEditBranch('Addis Ababa');
    setEditSchool((BRANCH_SCHOOL_MAP['Addis Ababa'] || ['YMS'])[0]);
    setEditPhone('');
    setEditDob('');
    setEditBloodType('Unknown');
    setEditGuardianName('');
    setEditEmergencyPhone('');
    setEditBusUsage('Yes');
    setAddStatus({ kind: 'idle', text: '' });
    setIsEditModalOpen(true);
  };

  // Start the next desk entry without closing the form.
  const handleAddAnotherStudent = () => {
    handleOpenAddStudent();
    void loadData();
  };

  const closeAddStudentModal = () => {
    setIsEditModalOpen(false);
    setIsNewStudentMode(false);
    setNewStudentId('');
    setAddStatus({ kind: 'idle', text: '' });
  };

  // A desk add is a send. The row goes to the authoritative store first, and a cloud that does not
  // answer leaves it on this station and in the outbox rather than pretending it is registered.
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = newStudentId.trim().toUpperCase();
    const name = editFullName.trim();
    if (!sid) { setAddStatus({ kind: 'error', text: 'Student ID is required.' }); return; }
    if (!name) { setAddStatus({ kind: 'error', text: 'Full Name is required.' }); return; }
    if (!editGrade.trim()) { setAddStatus({ kind: 'error', text: 'Grade is required.' }); return; }

    const clash = getStudents().find(s => (s.studentId || '').trim().toUpperCase() === sid);
    if (clash) {
      setAddStatus({ kind: 'error', text: `Student ID ${sid} already belongs to ${clash.fullName}. Edit that record instead of adding a second one.` });
      return;
    }

    const parsedG = parseGradeAndSection(editGrade.trim(), editSection.trim());
    const resolvedSection = (editSection.trim() || parsedG.cleanSection || '').toUpperCase();
    const cleanG = parsedG.cleanGrade || editGrade.trim();
    const fullGrade = resolvedSection ? `${cleanG}${resolvedSection}` : cleanG;
    const formattedPhone = formatPhoneNumber(editPhone);
    const formattedEmergency = formatPhoneNumber(editEmergencyPhone) || formattedPhone;
    const operator = getCurrentUser();

    const record: Student = {
      id: 'desk-' + Date.now().toString(36),
      studentId: sid,
      fullName: name,
      sex: editSex,
      grade: fullGrade,
      department: resolvedSection || undefined,
      section: resolvedSection || undefined,
      branch: editBranch,
      location: editBranch,
      address: editBranch,
      school: editSchool,
      country: 'Ethiopia',
      cityRegion: editBranch,
      phone: formattedPhone,
      emergencyContactPhone: formattedEmergency,
      parentPhone: formattedPhone,
      guardianPhone: formattedPhone,
      dateOfBirth: editDob || undefined,
      bloodType: editBloodType,
      guardianFullName: editGuardianName.trim() || undefined,
      schoolBusUsage: editBusUsage,
      busUser: editBusUsage,
      status: 'Accepted',
      createdAt: new Date().toISOString(),
      // The desk account is named as the source, so a record registered here is never counted as a
      // field sender's transmission.
      senderName: operator?.username || 'Receiver Desk',
      senderId: operator?.id || undefined,
      recordHistory: [
        {
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          action: 'Desk Registration',
          user: operator?.username || 'Receiver Desk',
          role: operator?.role || 'Receiver',
          notes: 'Record created at the Receiver Desk; no station capture exists for it'
        }
      ]
    } as any;

    setIsAddingStudent(true);
    setAddStatus({ kind: 'sending', text: `Delivering ${sid} to the cloud...` });

    const { queueOfflineOperation, cloudJsonResponse } = await import('@/lib/offlineQueue');
    let confirmed = false;
    let cloudDuplicate = false;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(record)
      });
      const body = await cloudJsonResponse(res);
      cloudDuplicate = res.status === 409 || body?.error === 'DUPLICATE_ID';
      confirmed = !!body && res.ok && !cloudDuplicate;
      if (!confirmed && !cloudDuplicate) {
        await queueOfflineOperation('CREATE_STUDENT', record).catch(() => {});
      }
    } catch (err) {
      await queueOfflineOperation('CREATE_STUDENT', record).catch(() => {});
    }

    if (cloudDuplicate) {
      setIsAddingStudent(false);
      setAddStatus({ kind: 'error', text: `The cloud already holds Student ID ${sid}. Edit that record instead of adding a second one.` });
      return;
    }

    addStudent(record);
    setStudents(prev => [record, ...prev]);
    setIsAddingStudent(false);
    setNewStudentId(nextDirectoryStudentId());

    if (confirmed) {
      setAddStatus({ kind: 'sent', text: `${sid} is saved in the cloud directory.` });
    } else {
      setAddStatus({ kind: 'queued', text: `${sid} is on this station and in its outbox; it transmits by itself until the cloud confirms.` });
    }
  };

  // Save Student Data Updates
  const handleSaveStudentData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDataStudent) {
      void handleCreateStudent(e);
      return;
    }
    const targetSid = editingDataStudent.studentId || editingDataStudent.id;
    const targetDbId = editingDataStudent.id || editingDataStudent.studentId;

    const parsedG = parseGradeAndSection(editGrade.trim(), editSection.trim());
    const resolvedSection = (editSection.trim() || parsedG.cleanSection || '').toUpperCase();
    const cleanG = parsedG.cleanGrade || editGrade.trim();
    const fullGrade = resolvedSection ? `${cleanG}${resolvedSection}` : cleanG;

    const formattedPhone = formatPhoneNumber(editPhone);
    const formattedEmergency = formatPhoneNumber(editEmergencyPhone) || formattedPhone;

    const updates: Partial<Student> = {
      fullName: editFullName.trim(),
      sex: editSex,
      grade: fullGrade,
      department: resolvedSection,
      section: resolvedSection,
      location: editBranch,
      branch: editBranch,
      address: editBranch,
      school: editSchool,
      phone: formattedPhone,
      emergencyContactPhone: formattedEmergency,
      parentPhone: formattedPhone,
      guardianPhone: formattedPhone,
      dateOfBirth: editDob,
      bloodType: editBloodType,
      guardianFullName: editGuardianName.trim(),
      schoolBusUsage: editBusUsage
    };

    updateStudent(targetSid, updates);
    if (targetDbId && targetDbId !== targetSid) {
      updateStudent(targetDbId, updates);
    }

    setStudents(prev => prev.map(s => {
      if (s.studentId === targetSid || s.id === targetDbId || s.id === targetSid || s.studentId === targetDbId) {
        return { ...s, ...updates };
      }
      return s;
    }));

    if (detailStudent && (detailStudent.studentId === targetSid || detailStudent.id === targetDbId || detailStudent.id === targetSid)) {
      setDetailStudent(prev => prev ? { ...prev, ...updates } : null);
    }

    addCorrectionLog({
      studentId: targetSid,
      studentName: editingDataStudent.fullName || 'Student',
      senderId: editingDataStudent.senderId,
      senderName: editingDataStudent.senderName || 'Field Sender',
      actionType: 'DATA_UPDATED',
      description: `Student metadata and academic records updated for ${editingDataStudent.fullName}`,
      resolvedBy: 'Receiver Desk'
    });

    setIsEditModalOpen(false);
    setEditingDataStudent(null);
  };

  // Branch change in Edit Modal
  const handleEditBranchChange = (newBranch: string) => {
    setEditBranch(newBranch);
    const allowed = BRANCH_SCHOOL_MAP[newBranch] || ['YMS'];
    if (!allowed.includes(editSchool)) {
      setEditSchool(allowed[0]);
    }
  };

  // =========================================================================
  // DOWNLOAD ENGINES (SINGLE & BULK WITH PROGRESS MODAL)
  // =========================================================================

  // Single Student Photo Download (Direct Native Download via Edge Proxy or Blob)
  const downloadSinglePhoto = async (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const photoUrl = getPhotoUrl(s.photoPath || s.previewPath || s.thumbnailPath);
    if (!photoUrl) {
      alert(`No biometric photograph available for ${s.fullName} (${s.studentId}).`);
      return;
    }

    markStudentsAsBulked([s.studentId]);
    const fileName = getStudentPhotoFileName(s);
    try {
      if (photoUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = photoUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Same-Origin Proxy URL with Content-Disposition: attachment header
      const proxyDownloadUrl = `/api/proxy-photo?url=${encodeURIComponent(photoUrl)}&filename=${encodeURIComponent(fileName)}&download=1`;

      // 1. Fetch as blob to trigger instant browser save
      let res = await fetch(proxyDownloadUrl).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(photoUrl, { mode: 'cors' }).catch(() => null);
      }

      if (res && res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      // 2. Direct browser navigation to same-origin download proxy
      const a = document.createElement('a');
      a.href = proxyDownloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.warn('Fallback download for photo:', fileName, err);
      const directProxy = `/api/proxy-photo?url=${encodeURIComponent(photoUrl)}&filename=${encodeURIComponent(fileName)}&download=1`;
      const a = document.createElement('a');
      a.href = directProxy;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Single Student QR Code Download (PNG - Token strictly JSON payload)
  const downloadSingleQr = async (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const qrPayload = generateStudentQrToken(s);
      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 600,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      const a = document.createElement('a');
      a.href = qrUrl;
      a.download = getStudentQrFileName(s);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Error generating QR code: ' + err.message);
    }
  };

  // Bulk Selected Photos Download (ZIP with Progress)
  const downloadSelectedPhotosZip = async (customTargets?: Student[]) => {
    const targets = customTargets || (selectedIds.size > 0 ? students.filter(s => selectedIds.has(s.studentId)) : filtered);
    if (targets.length === 0) {
      alert('No student records selected or available for Photo ZIP export.');
      return;
    }
    markStudentsAsBulked(targets.map(t => t.studentId));

    setProgressModal({
      isOpen: true,
      title: 'Downloading Selected Photographs (ZIP Archive)',
      current: 0,
      total: targets.length,
      statusText: 'Initializing compression engine...'
    });

    try {
      const zip = new JSZip();
      const folder = zip.folder('student_photos') || zip;
      let count = 0;

      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        const fileName = getStudentPhotoFileName(s);
        setProgressModal({
          isOpen: true,
          title: 'Downloading Selected Photographs (ZIP Archive)',
          current: i + 1,
          total: targets.length,
          statusText: `Fetching photo ${i + 1}/${targets.length}: ${fileName}...`
        });

        const photoUrl = getPhotoUrl(s.photoPath || s.previewPath || s.thumbnailPath);
        if (photoUrl) {
          try {
            if (photoUrl.startsWith('data:')) {
              const base64Data = photoUrl.split(',')[1];
              folder.file(fileName, base64Data, { base64: true });
              count++;
            } else {
              let res = await fetch(photoUrl, { mode: 'cors' }).catch(() => null);
              if (!res || !res.ok) {
                // Try proxy
                res = await fetch(`/api/proxy-photo?url=${encodeURIComponent(photoUrl)}`).catch(() => null);
              }
              if (res && res.ok) {
                const blob = await res.blob();
                folder.file(fileName, blob);
                count++;
              }
            }
          } catch (e) {
            console.warn('Skipping photo for', s.studentId, e);
          }
        }
        await new Promise(r => setTimeout(r, 15));
      }

      if (count === 0) {
        alert('None of the selected students have downloadable photos.');
        setProgressModal(prev => ({ ...prev, isOpen: false }));
        return;
      }

      setProgressModal(prev => ({ ...prev, statusText: 'Building ZIP archive for download...' }));
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setProgressModal(prev => ({
          ...prev,
          statusText: `Compressing ZIP archive (${metadata.percent.toFixed(0)}%)...`
        }));
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_photos_pack_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert('Error creating photo archive: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 500);
    }
  };

  // Bulk Selected QR Codes Download (ZIP with Progress - Token strictly JSON payload)
  const downloadSelectedQrsZip = async () => {
    const targets = students.filter(s => selectedIds.has(s.studentId));
    if (targets.length === 0) {
      alert('Please select at least one student from the table.');
      return;
    }

    setProgressModal({
      isOpen: true,
      title: 'Auto-Generating Student QR Codes (ZIP Archive)',
      current: 0,
      total: targets.length,
      statusText: 'Encoding QR codes with JSON payload...'
    });

    try {
      const zip = new JSZip();
      const folder = zip.folder('student_qr_codes') || zip;

      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        setProgressModal({
          isOpen: true,
          title: 'Auto-Generating Student QR Codes (ZIP Archive)',
          current: i + 1,
          total: targets.length,
          statusText: `Rendering QR token for ${s.studentId} (${i + 1}/${targets.length})...`
        });

        const qrPayload = generateStudentQrToken(s);
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          width: 500,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });

        const base64Data = qrDataUrl.split(',')[1];
        folder.file(getStudentQrFileName(s), base64Data, { base64: true });

        await new Promise(r => setTimeout(r, 10));
      }

      setProgressModal(prev => ({ ...prev, statusText: 'Packaging QR codes ZIP...' }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_qr_codes_pack_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert('Error generating QR archive: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 500);
    }
  };

  // Excel Export (.xlsx with Progress)
  const exportExcel = async (onlySelected: boolean = false) => {
    const targets = onlySelected
      ? students.filter(s => selectedIds.has(s.studentId))
      : filtered;

    if (targets.length === 0) {
      alert('No student records available for Excel export.');
      return;
    }
    await refreshPlatformSettings().catch(() => {});
    markStudentsAsBulked(targets.map(t => t.studentId));

    setProgressModal({
      isOpen: true,
      title: 'Compiling Excel Spreadsheet (.xlsx)',
      current: 0,
      total: targets.length,
      statusText: 'Formatting student records...'
    });

    try {
      const rows = targets.map((s, idx) => {
        return {
          '#': idx + 1,
          'Name': s.fullName,
          'StudentId': s.studentId,
          'Sex': s.sex || 'Male',
          'Grade': getGradeDisplay(s),
          'Section': getCleanSection(s),
          'BloodType': s.bloodType || 'Unknown',
          'Phone': exportPhoneValue(s.phone),
          '@photo': buildExportPhotoPath(s),
          '@qr': buildExportQrPath(s),
          'Branch': getStudentBranch(s),
          'School': s.school || '',
          'Status': s.status || 'Accepted'
        };
      });

      setProgressModal(prev => ({ ...prev, current: targets.length, statusText: 'Building Excel workbook...' }));
      await new Promise(r => setTimeout(r, 80));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `studentbridge_directory_${Date.now()}.xlsx`);
    } catch (err: any) {
      alert('Excel export error: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 400);
    }
  };

  // CSV Export (.csv with Progress - strictly formatted headers and Desktop photo path)
  const exportCsv = async (onlySelected: boolean = false) => {
    const targets = onlySelected
      ? students.filter(s => selectedIds.has(s.studentId))
      : filtered;

    if (targets.length === 0) {
      alert('No student records available for CSV export.');
      return;
    }
    await refreshPlatformSettings().catch(() => {});
    markStudentsAsBulked(targets.map(t => t.studentId));

    setProgressModal({
      isOpen: true,
      title: 'Compiling CSV Data File',
      current: 0,
      total: targets.length,
      statusText: 'Writing Name, StudentId, Sex, Grade, BloodType, Phone, @photo, @qr...'
    });

    try {
      // Exact required header format: Name StudentId Sex Grade BloodType Phone @photo @qr
      const headers = ['Name', 'StudentId', 'Sex', 'Grade', 'BloodType', 'Phone', '@photo', '@qr'];
      const csvRows = [headers.join(',')];

      targets.forEach(s => {
        const photoLocalPath = buildExportPhotoPath(s);
        const qrLocalPath = buildExportQrPath(s);

        const row = [
          `"${(s.fullName || '').replace(/"/g, '""')}"`,
          `"${s.studentId}"`,
          `"${s.sex || 'Male'}"`,
          `"${s.grade || ''}"`,
          `"${s.bloodType || 'Unknown'}"`,
          `"${exportPhoneValue(s.phone)}"`,
          `"${photoLocalPath.replace(/"/g, '""')}"`,
          `"${qrLocalPath.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      setProgressModal(prev => ({ ...prev, current: targets.length, statusText: 'Downloading CSV file...' }));
      await new Promise(r => setTimeout(r, 80));

      const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studentbridge_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert('CSV export error: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 400);
    }
  };

  // Safe Deletion Handler
  const executeDelete = async (permanent: boolean) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const targetSid = deleteTarget.studentId;
    const targetId = deleteTarget.id;

    try {
      if (permanent) {
        setStudents(prev => prev.filter(s => s.studentId !== targetSid && s.id !== targetId));
      } else {
        setStudents(prev => prev.map(s => {
          if (s.studentId === targetSid || s.id === targetId) {
            return { ...s, receiverHidden: true, hiddenAt: new Date().toISOString() };
          }
          return s;
        }));
      }

      if (detailStudent?.studentId === targetSid || detailStudent?.id === targetId) {
        setIsDetailDrawerOpen(false);
        setDetailStudent(null);
      }
      setDeleteTarget(null);

      await deleteStudent(targetSid, permanent);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Selected Deletion Handler
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const executeBulkDelete = async (permanent: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const targetIds = Array.from(selectedIds);
    try {
      if (permanent) {
        setStudents(prev => prev.filter(s => !selectedIds.has(s.studentId) && !selectedIds.has(s.id)));
      } else {
        setStudents(prev => prev.map(s => {
          if (selectedIds.has(s.studentId) || selectedIds.has(s.id)) {
            return { ...s, receiverHidden: true, hiddenAt: new Date().toISOString() };
          }
          return s;
        }));
      }

      for (const sid of targetIds) {
        await deleteStudent(sid, permanent);
      }
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // =========================================================================
  // FULL-SCREEN DIRECTORY + RIGHT-CLICK FOLDER ACTIONS
  // =========================================================================
  useEffect(() => {
    if (!isDirectoryFullscreen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setIsDirectoryFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [isDirectoryFullscreen]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!folderMenu) return;
    const close = () => setFolderMenu(null);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setFolderMenu(null);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [folderMenu]);

  const openFolderMenu = (
    e: React.MouseEvent,
    payload: { kind: 'folder'; folderName: string } | { kind: 'student'; folderName: string; studentId: string }
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const menuW = 236;
    const menuH = payload.kind === 'folder' ? 286 : 268;
    setFolderMenu({
      ...payload,
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - menuW - 8)),
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - menuH - 8))
    });
  };

  // Folder membership honours the active day filter, so "select" and "delete" inside a folder act
  // on exactly the days the desk has picked.
  const folderStudentsFor = (folderName: string): Student[] => {
    const folder = schoolFolders.find(f => f.schoolName.toLowerCase() === folderName.toLowerCase());
    if (!folder) return [];
    if (selectedDates.length === 0) return folder.students;
    return folder.students.filter(s => selectedDates.includes(studentDateKey(s)));
  };

  const openSchoolFolder = (folderName: string) => {
    setSelectedSchoolFolder(folderName);
    setFolderGradeTab('ALL');
    setFolderSectionTab('ALL');
    setFolderSearchQuery('');
    setFolderMenu(null);
  };

  const selectFolderRecords = (folderName: string) => {
    const ids = folderStudentsFor(folderName).map(s => s.studentId);
    if (ids.length === 0) {
      setActionNotice(`No ${folderName} records on the selected dates`);
      setFolderMenu(null);
      return;
    }
    setSelectedIds(prev => new Set([...prev, ...ids]));
    setActionNotice(`${ids.length} ${folderName} record(s) added to the selection`);
    setFolderMenu(null);
  };

  const deleteFolderRecords = (folderName: string) => {
    const ids = folderStudentsFor(folderName).map(s => s.studentId);
    if (ids.length === 0) {
      setActionNotice(`No ${folderName} records on the selected dates`);
      setFolderMenu(null);
      return;
    }
    setSelectedIds(new Set(ids));
    setIsBulkDeleteModalOpen(true);
    setFolderMenu(null);
  };

  const startMoveStudents = (ids: string[], fromSchool: string) => {
    if (ids.length === 0) {
      setActionNotice('Nothing to move for the selected dates');
      setFolderMenu(null);
      return;
    }
    setMoveTarget({ ids, fromSchool });
    setMoveDestination('');
    setFolderMenu(null);
  };

  const handleConfirmMove = async () => {
    if (!moveTarget || !moveDestination) return;
    const branch = getBranchForSchool(moveDestination);
    setIsMoving(true);
    let moved = 0;
    try {
      for (const sid of moveTarget.ids) {
        const ok = await updateStudent(sid, { school: moveDestination, branch });
        if (ok) moved++;
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        moveTarget.ids.forEach(id => next.delete(id));
        return next;
      });
      setActionNotice(`${moved} record(s) moved to ${moveDestination} \u00b7 ${branch}`);
      setMoveTarget(null);
      setMoveDestination('');
      await loadData();
    } catch (err) {
      setActionNotice('Move failed \u2014 records were left unchanged');
    } finally {
      setIsMoving(false);
    }
  };

  const startRenameFolder = (folderName: string, branch: string) => {
    setRenameTarget({ schoolName: folderName, branch });
    setRenameSchoolValue(folderName);
    setRenameBranchValue(branch);
    setFolderMenu(null);
  };

  // A rename re-files the whole folder, not just the days currently on screen.
  const handleConfirmRename = async () => {
    if (!renameTarget) return;
    const nextName = renameSchoolValue.trim();
    if (!nextName) return;
    const allFolderStudents = schoolFolders.find(f => f.schoolName === renameTarget.schoolName)?.students || [];
    const ids = allFolderStudents.map(s => s.studentId);
    if (ids.length === 0) {
      setActionNotice('This folder has no records to re-file');
      return;
    }
    setIsRenaming(true);
    try {
      for (const sid of ids) {
        await updateStudent(sid, { school: nextName, branch: renameBranchValue });
      }
      setActionNotice(`${ids.length} record(s) re-filed to ${nextName} \u00b7 ${renameBranchValue}`);
      if (selectedSchoolFolder?.toLowerCase() === renameTarget.schoolName.toLowerCase()) {
        setSelectedSchoolFolder(nextName);
      }
      setRenameTarget(null);
      await loadData();
    } catch (err) {
      setActionNotice('Edit failed \u2014 records were left unchanged');
    } finally {
      setIsRenaming(false);
    }
  };

  // Shared day picker: used by the master table and by the school folders so both views read the
  // same set of chosen transmit days.
  const renderDateStrip = () => {
    const allDaysCount = distinctDates.reduce((n, d) => n + (calendarDateCounts[d] || 0), 0);
    return (
      <div className="rounded-2xl border border-[#E3E9DD] bg-white p-3.5 shadow-[0_1px_6px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#EAF7DA]">
              <CalendarDays className="h-4 w-4 text-[#3F7A06]" />
            </div>
            <div>
              <div className="text-xs font-black text-[#0B1118]">Transmit days</div>
              <p className="text-[10px] font-medium text-[#8A9680]">
                Tap days to combine them — pick one day, then add the others at the same time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-[#E3E9DD] bg-[#F8FAF5] px-1.5 py-1">
              <CalendarDays className="ml-1 h-3.5 w-3.5 text-[#8A9680]" />
              <input
                type="date"
                value={datePickerValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setDatePickerValue(value);
                  if (value) addSelectedDate(value);
                }}
                className="cursor-pointer bg-transparent px-1 py-0.5 text-[11px] font-bold text-[#26301F] focus:outline-none"
                title="Add another transmitted day to the selection"
              />
            </div>
            <button
              type="button"
              onClick={clearSelectedDates}
              disabled={selectedDates.length === 0}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
 selectedDates.length === 0
 ? 'cursor-default border border-[#E3E9DD] bg-[#F3F7EE] text-[#A6B29B]'
 : 'cursor-pointer border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
 }`}
            >
              Clear days
            </button>
          </div>
        </div>

        {selectedDates.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#EDF3E7] pt-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">Selected</span>
            {selectedDates.map(dt => (
              <span
                key={dt}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1118] px-2 py-1 text-[11px] font-bold text-white"
              >
                {dayChipLabel(dt)}
                <span className="text-[10px] text-[#9EE617]">{calendarDateCounts[dt] || 0}</span>
                <button
                  type="button"
                  onClick={() => toggleSelectedDate(dt)}
                  className="rounded p-0.5 text-[#8A9680] transition-colors hover:text-white cursor-pointer"
                  title="Remove this day from the selection"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <span className="rounded-lg bg-[#EAF7DA] px-2 py-1 text-[11px] font-black text-[#3F7A06]">
              {filtered.length.toLocaleString()} records in view
            </span>
          </div>
        )}

        <div className="custom-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={clearSelectedDates}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
 selectedDates.length === 0
 ? 'bg-[#85E510] text-[#062404]'
 : 'border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
 }`}
          >
            All days <span className="opacity-70">{allDaysCount.toLocaleString()}</span>
          </button>
          {distinctDates.map(dt => {
            const active = selectedDates.includes(dt);
            return (
              <button
                key={dt}
                type="button"
                onClick={() => toggleSelectedDate(dt)}
                title={`${dt} — click to add or remove this day`}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
 active
 ? 'bg-[#0B1118] text-[#9EE617]'
 : 'border border-[#E3E9DD] bg-white text-[#5C6B51] hover:border-[#85E510]'
 }`}
              >
                <span>{dayChipLabel(dt)}</span>
                <span className="text-[10px] opacity-80">{calendarDateCounts[dt] || 0}</span>
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* Page Header — light lime hero */}
      <div className="relative overflow-hidden rounded-3xl border border-[#E1F0CF] bg-gradient-to-br from-white via-[#F8FDEF] to-[#ECF9DA] shadow-[0_2px_18px_rgba(63,122,6,0.07)]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#9EE617]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#85E510]/10 blur-3xl" />

        <div className="relative space-y-4 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0B1118] shadow-sm">
                <UsersIcon className="h-5 w-5 text-[#9EE617]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-heading font-black tracking-tight text-[#0B1118]">
                    Student Directory
                  </h1>
                  <span className="rounded-full border border-[#9EE617]/60 bg-white/80 px-2.5 py-0.5 text-[11px] font-black tabular-nums text-[#3F7A06]">
                    {filtered.length.toLocaleString()} records
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CDEBB4] bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3F7A06]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#85E510] opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#6FBF0A]" />
                    </span>
                    Live feed
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-[#6B7A60]">
                  Master registry, multi-day filters and school folders — every number reads the same snapshot.
                </p>
              </div>
            </div>

            {/* Global Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddStudent}
                className="flex items-center gap-1.5 rounded-xl bg-[#85E510] px-3.5 py-2 text-xs font-black text-[#062404] shadow-sm transition-all hover:bg-[#9EE617] cursor-pointer"
                title="Add a new student to the directory"
              >
                <Plus className="h-4 w-4" />
                <span>Add Student</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMistakeModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#F3D9A4] bg-[#FDF7E8] px-3.5 py-2 text-xs font-black text-[#7A5A10] transition-all hover:bg-[#FBEFD4] cursor-pointer"
                title="Scan student directory for mistakes & anomalies"
              >
                <AlertTriangle className="h-4 w-4 text-[#B8860B]" />
                <span>Mistake Analyzer</span>
                {mistakeItems.length > 0 && (
                  <span className="rounded-md bg-[#B8860B] px-1.5 py-0.5 text-[10px] font-black text-white">
                    {mistakeItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => exportExcel(false)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E3E9DD] bg-white px-3.5 py-2 text-xs font-bold text-[#26301F] transition-all hover:border-[#85E510] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => exportCsv(false)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E3E9DD] bg-white px-3.5 py-2 text-xs font-bold text-[#26301F] transition-all hover:border-[#85E510] cursor-pointer"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => downloadSelectedPhotosZip()}
                className="flex items-center gap-1.5 rounded-xl border border-[#E3E9DD] bg-white px-3.5 py-2 text-xs font-bold text-[#26301F] transition-all hover:border-[#85E510] cursor-pointer"
                title="Download student photos archive (ZIP)"
              >
                <Archive className="h-4 w-4 text-[#3F7A06]" />
                <span>Export Photo ZIP</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-[#E3E9DD] bg-white px-3 py-2 text-xs font-bold text-[#26301F] transition-all hover:border-[#85E510] cursor-pointer"
                title="Refresh from server"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#5C6B51] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleCloudSync}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl bg-[#0B1118] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#1E2A20] cursor-pointer"
                title="Synchronize registry with cloud master server"
              >
                <Cloud className="h-3.5 w-3.5 text-[#9EE617]" />
                <span>Cloud Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDirectoryFullscreen(v => !v)}
                className={`grid h-9 w-9 place-items-center rounded-xl border transition-all cursor-pointer ${
 isDirectoryFullscreen
 ? 'border-[#85E510] bg-[#85E510]/15 text-[#3F7A06]'
 : 'border-[#E3E9DD] bg-white text-[#4B5B42] hover:border-[#85E510]'
 }`}
                title={isDirectoryFullscreen ? 'Exit full screen' : 'View students in full screen'}
                aria-label={isDirectoryFullscreen ? 'Exit full screen' : 'Full screen directory'}
              >
                {isDirectoryFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Live facts from the authoritative snapshot */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[
              {
                label: 'Total Received',
                value: telemetryAmounts.total.toLocaleString(),
                hint: `${hiddenCount.toLocaleString()} hidden \u00b7 ${sortedFiltered.length.toLocaleString()} in view`,
                icon: UsersIcon
              },
              {
                label: 'Transmitted Today',
                value: telemetryAmounts.today.toLocaleString(),
                hint: 'since 00:00 local day',
                icon: Calendar
              },
              {
                label: 'Photos Verified',
                value: telemetryAmounts.withPhoto.toLocaleString(),
                hint: `${telemetryAmounts.total > 0 ? ((telemetryAmounts.withPhoto / telemetryAmounts.total) * 100).toFixed(1) : '0.0'}% coverage`,
                icon: ImageIcon
              },
              {
                label: 'Active Senders',
                value: String(fleetActiveSenders ?? fallbackActiveSenders),
                hint: 'transmitting now · last 15 min',
                icon: Radio
              }
            ].map(fact => (
              <div key={fact.label} className="rounded-2xl border border-[#E3EFD7] bg-white/75 px-3.5 py-2.5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">{fact.label}</span>
                  <fact.icon className="h-3.5 w-3.5 text-[#6FBF0A]" />
                </div>
                <div className="mt-1 text-xl font-black tabular-nums tracking-tight text-[#0B1118]">{fact.value}</div>
                <div className="text-[10px] font-medium text-[#8A9680]">{fact.hint}</div>
              </div>
            ))}
          </div>

          {/* Live link strip */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[#DBEDC9]/80 pt-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3EFD7] bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#5C6B51]">
              <Cloud className="h-3 w-3 text-[#3B82F6]" />
              R2 <strong className="font-bold text-[#26301F]">{liveServerStats.r2Bucket || '—'}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3EFD7] bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#5C6B51]">
              <Activity className="h-3 w-3 text-[#6FBF0A]" />
              Ping <strong className="font-bold text-[#26301F]">{liveServerStats.queryLatencyMs} ms</strong>
            </span>
            {telemetryAmounts.latestTransmitted ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3EFD7] bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#5C6B51]">
                <Clock className="h-3 w-3 text-[#6FBF0A]" />
                Last received{' '}
                <strong className="font-bold text-[#26301F]">
                  {telemetryAmounts.latestTransmitted.createdAt
                    ? new Date(telemetryAmounts.latestTransmitted.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'just now'}
                </strong>
                <span className="text-[#8A9680]">({telemetryAmounts.latestTransmitted.senderName || 'Sender'})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3EFD7] bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#8A9680]">
                Waiting for incoming transmissions…
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLiveTelemetry}
                disabled={isRefreshingTelemetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#CDEBB4] bg-white px-2.5 py-1 text-[11px] font-bold text-[#3F7A06] transition-colors hover:bg-[#F1FBE4] cursor-pointer"
                title="Refresh live telemetric data"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />
                {isRefreshingTelemetry ? 'Pinging…' : 'Sync'}
              </button>
              <Link
                to="/receiver/telemetric-velocity"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1118] px-2.5 py-1 text-[11px] font-bold text-[#9EE617] transition-colors hover:bg-[#1E2A20]"
                title="Open the full telemetric velocity & fleet cockpit"
              >
                <Radio className="h-3 w-3" />
                Fleet cockpit
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Items Bulk Action Bar (Visible when 1 or more rows selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3.5 bg-[#0B1118] text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg border border-[#2D3748] animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9EE617] animate-pulse" />
            <span className="text-xs font-black text-white">
              {selectedIds.size} {selectedIds.size === 1 ? 'student selected' : 'students selected'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-[#8A9680] hover:text-white underline ml-1 cursor-pointer"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Delete or hide selected student records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSelectedPhotosZip()}
              className="py-1.5 px-3 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-[#062404] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download Photos (ZIP)</span>
            </button>

            <button
              type="button"
              onClick={downloadSelectedQrsZip}
              className="py-1.5 px-3 rounded-xl bg-white hover:bg-[#F6FAEF] text-[#0B1118] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <QrIcon className="w-3.5 h-3.5 text-[#366804]" />
              <span>Download QRs (ZIP)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const targetIds = Array.from(selectedIds);
                const allBulked = targetIds.every(id => bulkedIds.has(id));
                setBulkedIds(prev => {
                  const next = new Set(prev);
                  if (allBulked) {
                    targetIds.forEach(id => next.delete(id));
                  } else {
                    targetIds.forEach(id => next.add(id));
                  }
                  localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
                  return next;
                });
              }}
              className="py-1.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-[#9EE617] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{Array.from(selectedIds).every(id => bulkedIds.has(id)) ? 'Unbulk Selected' : 'Bulk Selected'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportExcel(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Selected (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => exportCsv(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Selected (CSV)</span>
            </button>
          </div>
        </div>
      )}

      {!isServerApiOnline() && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3">
          <div className="text-xs text-rose-900 font-semibold leading-relaxed">
            The live sync API is not answering, so this list is the registry snapshot shipped with
            the build &mdash; {students.length.toLocaleString()} records, newest transmitted{' '}
            {students.reduce((max, s) => ((s.createdAt || '') > max ? s.createdAt || '' : max), '') || 'n/a'}.
            Records sent after that are safe in the database but cannot be listed until the API
            returns; photos still load directly from storage.
          </div>
          <button
            type="button"
            onClick={retryDatasetLoad}
            disabled={feedRetrying}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black disabled:opacity-50"
          >
            {feedRetrying ? 'Retrying…' : 'Retry connection'}
          </button>
        </div>
      )}

      {liveServerStats.available && liveServerStats.totalStudents > students.length && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="text-xs text-amber-900 font-semibold leading-relaxed">
            This station has {students.length.toLocaleString()} of{' '}
            {liveServerStats.totalStudents.toLocaleString()} registry records loaded. The sync
            feed returned an incomplete page set &mdash; no records were deleted, reload to fetch the rest.
          </div>
          <button
            type="button"
            onClick={retryDatasetLoad}
            disabled={feedRetrying}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black disabled:opacity-50"
          >
            {feedRetrying ? 'Reloading…' : 'Reload full registry'}
          </button>
        </div>
      )}

      {liveServerStats.available && !liveServerStats.statsComplete && (
        <div className="rounded-2xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-[11px] text-sky-900 font-semibold">
          Server counts incomplete{liveServerStats.statsMissing.length > 0 ? ` (${liveServerStats.statsMissing.join(', ')})` : ''}
          &mdash; those figures are reused from the last complete snapshot, not measured now.
        </div>
      )}

      {/* View Switcher — segmented light control */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E3E9DD] bg-white/90 p-2.5 shadow-[0_1px_6px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-1 rounded-xl bg-[#F3F7EE] p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => { setViewMode('table'); setSelectedSchoolFolder(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-black transition-all cursor-pointer sm:flex-none ${
 viewMode === 'table'
 ? 'bg-white text-[#0B1118] shadow-sm ring-1 ring-[#CDEBB4]'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
 }`}
          >
            <FileSpreadsheet className={`h-4 w-4 ${viewMode === 'table' ? 'text-[#3F7A06]' : 'text-[#8A9680]'}`} />
            <span>Master Table</span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
 viewMode === 'table' ? 'bg-[#EAF7DA] text-[#3F7A06]' : 'bg-white/70 text-[#7C8B70]'
 }`}>
              {sortedFiltered.length.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('folders')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-black transition-all cursor-pointer sm:flex-none ${
 viewMode === 'folders'
 ? 'bg-white text-[#0B1118] shadow-sm ring-1 ring-[#CDEBB4]'
 : 'text-[#5C6B51] hover:text-[#0B1118]'
 }`}
          >
            <FolderOpen className={`h-4 w-4 ${viewMode === 'folders' ? 'text-[#3F7A06]' : 'text-[#8A9680]'}`} />
            <span>School Folders</span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
 viewMode === 'folders' ? 'bg-[#EAF7DA] text-[#3F7A06]' : 'bg-white/70 text-[#7C8B70]'
 }`}>
              {schoolFolders.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] font-semibold text-[#7C8B70]">
          <span className="inline-flex items-center gap-1.5">
            <Cloud className="h-3.5 w-3.5 text-[#3B82F6]" />
            R2 <strong className="text-[#26301F]">{liveServerStats.r2Bucket || '—'}</strong>
          </span>
          <span className="h-3 w-px bg-[#DDE7D3]" />
          <span className="inline-flex items-center gap-1.5 text-[#3F7A06]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6FBF0A]" />
            Zero-drop feed
          </span>
          <button
            type="button"
            onClick={() => setIsDirectoryFullscreen(true)}
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-[#DDE7D3] bg-white px-2 py-1 text-[11px] font-bold text-[#4B5B42] transition-colors hover:border-[#85E510] cursor-pointer"
            title="View students in full screen"
          >
            <Maximize2 className="h-3 w-3" />
            Full screen
          </button>
        </div>
      </div>

      <div className={isDirectoryFullscreen ? 'fixed inset-0 z-[80] space-y-4 overflow-y-auto bg-[#F7FAF2] p-3 sm:p-5' : 'space-y-4'}>
        {isDirectoryFullscreen && (
          <div className="sticky top-0 z-10 -mx-3 -mt-3 flex flex-nowrap items-center justify-between gap-2 border-b border-white/10 bg-[#0B1118] px-3 py-2.5 text-white shadow-lg sm:-mx-5 sm:-mt-5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 text-xs font-black">
              <Maximize2 className="h-4 w-4 shrink-0 text-[#9EE617]" />
              <span className="truncate">Student Directory — Full Screen</span>
              <span className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#CFE8B6] sm:inline">
                {filtered.length.toLocaleString()} records
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden whitespace-nowrap text-[11px] font-semibold text-[#B9C4AE] md:inline">
                {selectedDates.length === 0 ? 'All days' : `${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'} selected`}
              </span>
              <button
                type="button"
                onClick={() => setIsDirectoryFullscreen(false)}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#85E510] px-3 py-1.5 text-[11px] font-black text-[#062404] transition-colors hover:bg-[#9EE617] cursor-pointer"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Exit<span className="hidden sm:inline">&nbsp;full screen (Esc)</span>
              </button>
            </div>
          </div>
        )}

      {viewMode === 'table' ? (
        <>
          {renderDateStrip()}
      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#8A9680] absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, name, phone, school or sender..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-[#8A9680] hover:text-black cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sender Filter */}
          <div>
            <select
              value={senderFilter}
              onChange={(e) => { setSenderFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">Sender: All Senders</option>
              {distinctSenders.map(s => (
                <option key={s} value={s}>Sender: {s}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">All Branches</option>
              {DEFAULT_BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* School Filter */}
          <div>
            <select
              value={schoolFilter}
              onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">All Schools</option>
              {Object.entries(BRANCH_SCHOOL_MAP).flatMap(([branch, schs]) =>
                schs.map(sName => (
                  <option key={`${branch}-${sName}`} value={sName}>
                    {sName} ({branch})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Grade & Sub-Section Filter */}
          <div>
            <select
              value={gradeFilter === 'ALL' ? 'ALL' : (sectionFilter !== 'ALL' ? `${gradeFilter}:${sectionFilter}` : gradeFilter)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL') {
                  setGradeFilter('ALL');
                  setSectionFilter('ALL');
                } else if (val.includes(':')) {
                  const [g, sec] = val.split(':');
                  setGradeFilter(g);
                  setSectionFilter(sec);
                } else {
                  setGradeFilter(val);
                  setSectionFilter('ALL');
                }
                setPage(1);
              }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">All Grades & Sections</option>
              {gradeHierarchy.map(g => (
                <optgroup key={g.baseGrade} label={`${g.displayLabel} (${g.totalCount} Students)`}>
                  <option value={g.baseGrade}>
                    All {g.displayLabel} ({g.totalCount})
                  </option>
                  {g.sections.map(sec => (
                    <option key={`${g.baseGrade}:${sec.section}`} value={`${g.baseGrade}:${sec.section}`}>
                      ↳ {g.displayLabel} — Section {sec.section} ({sec.label}) — {sec.count}
                    </option>
                  ))}
                  {g.noSectionCount > 0 && (
                    <option value={`${g.baseGrade}:NONE`}>
                      ↳ {g.displayLabel} — General / Unassigned ({g.noSectionCount})
                    </option>
                  )}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Live day summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#6B7A60]">
            <Calendar className="h-3.5 w-3.5 text-[#3F7A06]" />
            <span>
              {selectedDates.length === 0
                ? `All ${distinctDates.reduce((n, d) => n + (calendarDateCounts[d] || 0), 0).toLocaleString()} records \u00b7 no day filter`
                : `${selectedDates.length} ${selectedDates.length === 1 ? 'day' : 'days'} picked`}
            </span>
            <span className="h-3 w-px bg-[#DDE7D3]" />
            <span className="text-[#26301F]">
              <strong className="font-black tabular-nums">{filtered.length.toLocaleString()}</strong> match every filter
            </span>
            {selectedDates.length > 0 && (
              <button
                type="button"
                onClick={clearSelectedDates}
                className="ml-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#3F7A06] underline decoration-dotted hover:text-[#0B1118] cursor-pointer"
              >
                Clear days
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCalendarNoteModalOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E3E9DD] bg-white px-3 text-[11px] font-bold text-[#4B5B42] transition-colors hover:border-[#85E510] cursor-pointer"
            title="Note taking for pausing bulked students"
          >
            <span>Pause Bulked Note</span>
            {pausedIds.size > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-black">
                {pausedIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Full-Width Student Directory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[11px] font-black text-[#0B1118] uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-[#9EE617] focus:ring-[#9EE617] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 min-w-[220px] whitespace-nowrap">Students</th>
                <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('studentId')}
                    className="inline-flex items-center gap-1.5 hover:text-[#256002] transition-colors cursor-pointer group"
                    title="Sort by Student ID"
                  >
                    <span>Student ID</span>
                    {sortField === 'studentId' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#256002]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#256002]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#8A9680] group-hover:text-[#4B5B42]" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('grade')}
                    className="inline-flex items-center gap-1.5 hover:text-[#256002] transition-colors cursor-pointer group"
                    title="Sort by Grade & Section"
                  >
                    <span>Grade & Sec</span>
                    {sortField === 'grade' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#256002]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#256002]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#8A9680] group-hover:text-[#4B5B42]" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 min-w-[160px] whitespace-nowrap">School & Branch</th>
                <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">Phone</th>
                <th className="py-4 px-4 text-center min-w-[95px] whitespace-nowrap">Blood Type</th>
                <th className="py-4 px-4 text-center min-w-[115px] whitespace-nowrap">Bus Transport</th>
                <th className="py-4 px-4 text-center min-w-[115px] whitespace-nowrap">Batch Status</th>
                <th className="py-4 px-4 min-w-[145px] whitespace-nowrap">Sender Operator</th>
                <th className="py-4 px-4 min-w-[155px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('createdAt')}
                    className="inline-flex items-center gap-1.5 hover:text-[#256002] transition-colors cursor-pointer group"
                    title="Sort by Date Transmitted"
                  >
                    <span>Date Transmitted</span>
                    {sortField === 'createdAt' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#256002]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#256002]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-[#8A9680] group-hover:text-[#4B5B42]" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 text-center min-w-[95px] whitespace-nowrap">QR Code</th>
                <th className="py-4 px-4 text-right min-w-[115px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {pagedStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#64748B]">
                    <div className="w-12 h-12 rounded-full bg-[#F6FAEF] flex items-center justify-center mx-auto mb-2 text-[#8A9680]">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-[#0B1118]">No students found</div>
                    <p className="text-xs text-[#7C8B70] mt-0.5">Try adjusting your search query or branch filters</p>
                  </td>
                </tr>
              ) : (
                pagedStudents.map((s) => {
                  const isSelected = selectedIds.has(s.studentId);
                  const photoSources = getPhotoCandidates(s);
                  const photoSrc = photoSources[0] || DEFAULT_AVATAR;
                  const isBulked = bulkedIds.has(s.studentId) || s.bulkedStatus === 'BULKED';

                  return (
                    <tr
                      key={s.studentId}
                      className={`hover:bg-[#F8FAF9] transition-colors ${
 isSelected ? 'bg-[#BEF264]/10' : ''
 }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(s.studentId, e as any)}
                          className="rounded text-[#9EE617] focus:ring-[#9EE617] cursor-pointer"
                        />
                      </td>

                      {/* Photo & Name (Click photo to edit online) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={(e) => handleOpenPhotoEditor(s, e)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#F6FAEF] border border-[#CBD5E1] shrink-0 cursor-pointer group shadow-2xs"
                            title="Click photograph to crop and edit online"
                          >
                            <img
                              key={`${s.studentId}:${s.updatedAt || ''}:${photoSrc}`}
                              src={photoSrc}
                              alt={s.fullName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={photoSourceError(photoSources, DEFAULT_AVATAR)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Edit2 className="w-3.5 h-3.5 text-[#9EE617]" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div
                              onClick={() => handleOpenDetail(s)}
                              className="font-bold text-[#0B1118] hover:text-[#256002] cursor-pointer truncate max-w-[190px]"
                              title={s.fullName}
                            >
                              {s.fullName}
                            </div>
                            <div className="text-[10px] text-[#7C8B70] flex items-center gap-1.5 font-medium mt-0.5">
                              <span>{s.sex || 'Male'}</span>
                              <span>&bull;</span>
                              <span className="text-[#366804] font-semibold">{s.status || 'Accepted'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-bold text-[#0B1118] text-[11px] whitespace-nowrap">
                        {s.studentId}
                      </td>

                      {/* Grade & Section */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-[#F6FAEF] text-[#0B1118] font-bold text-[11px]">
                          {getGradeDisplay(s)}
                        </span>
                      </td>

                      {/* School & Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#0B1118] truncate max-w-[160px]">{s.school || 'Unassigned'}</div>
                        <div className="text-[10px] text-[#7C8B70] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#366804]" />
                          <span className="font-semibold text-[#2B3A22]">{getStudentBranch(s)}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-[11px] text-[#2B3A22] whitespace-nowrap">
                        {s.phone || '-'}
                      </td>

                      {/* Blood Type */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#F6FAEF] text-[#0B1118] border border-[#E3EFD7]">
                          {s.bloodType || 'Unknown'}
                        </span>
                      </td>

                      {/* Bus Transport */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {s.schoolBusUsage === 'Yes' || s.busUser === 'YES' ? (
                          <span className="px-2.5 py-1 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                            🚌 Bus
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8A9680] font-medium">No Bus</span>
                        )}
                      </td>

                      {/* Batch Status (Bulked / Unbulked / Paused Indicator) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {pausedIds.has(s.studentId) ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]"
                            title={`Paused: ${pausedNotes[s.studentId] || 'No note'}`}
                          >
                            <span>⏸️ Paused</span>
                          </span>
                        ) : isBulked ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkedIds(prev => {
                                const next = new Set(prev);
                                next.delete(s.studentId);
                                localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#85E510]/15 text-[#1D5102] border border-[#85E510]/40 font-black text-[11px] cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            title="Bulked (Click to unbulk)"
                          >
                            <Check className="w-3.5 h-3.5 text-[#85E510] stroke-[3]" />
                            <span>Bulked</span>
                          </span>
                        ) : (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkedIds(prev => {
                                const next = new Set(prev);
                                next.add(s.studentId);
                                localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F6FAEF] hover:bg-[#85E510]/20 text-[#7C8B70] hover:text-[#1D5102] font-medium text-[10px] cursor-pointer"
                            title="Unbulked (Click to bulk)"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C9D5BC]" />
                            <span>Unbulked</span>
                          </span>
                        )}
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-[#F6FAEF] text-[#2B3A22] text-[10px] font-bold">
                          {s.senderName || 'Field Sender'}
                        </span>
                      </td>

                      {/* Date Transmitted */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const iso = s.createdAt || (s as any).registrationDate || s.updatedAt || s.recordHistory?.[0]?.date;
                          if (!iso) return <span className="text-[10px] text-[#8A9680]">—</span>;
                          try {
                            const d = new Date(iso);
                            if (isNaN(d.getTime())) return <span className="text-[10px] text-[#4B5B42]">{iso}</span>;
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            const hh = String(d.getHours()).padStart(2, '0');
                            const min = String(d.getMinutes()).padStart(2, '0');
                            const ss = String(d.getSeconds()).padStart(2, '0');
                            const dateStr = `${yyyy}-${mm}-${dd}`;
                            const timeStr = `${hh}:${min}:${ss}`;
                            const isToday = dateStr === new Date().toISOString().substring(0, 10);
                            const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
                            const isRecent = diffMinutes >= 0 && diffMinutes <= 30;

                            return (
                              <div className="flex flex-col gap-0.5 text-[10px]">
                                <div className="flex items-center gap-1.5 font-bold text-[#0B1118]">
                                  <Calendar className="w-3 h-3 text-[#256002]" />
                                  <span>{dateStr}</span>
                                  {isRecent && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-[#9EE617] text-[#062404] text-[9px] font-black animate-pulse">
                                      {diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[#7C8B70] font-semibold">
                                  <Clock className="w-3 h-3 text-[#8A9680]" />
                                  <span>{timeStr}</span>
                                  {isToday && !isRecent && (
                                    <span className="text-[9px] text-[#256002] font-bold px-1 rounded bg-[#9EE617]/20">
                                      Today
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          } catch (e) {
                            return <span className="text-[10px] text-[#4B5B42]">{iso}</span>;
                          }
                        })()}
                      </td>

                      {/* QR Code Action (Token strictly studentId) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => downloadSingleQr(s, e)}
                          className="p-1.5 rounded-lg bg-[#F6FAEF] hover:bg-[#9EE617]/20 hover:text-[#256002] text-[#2B3A22] transition-colors cursor-pointer"
                          title="Download QR Code (PNG - Token: Student ID)"
                        >
                          <QrIcon className="w-4 h-4" />
                        </button>
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Dossier (Eye icon opens details drawer) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenDetail(s, e)}
                            className="p-1.5 rounded-lg text-[#4B5B42] hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="View Student Details Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Crop & Edit Photo (3:4 Portrait default) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenPhotoEditor(s, e)}
                            className="p-1.5 rounded-lg text-[#4B5B42] hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Crop & Edit Student Photograph (3:4 Portrait)"
                          >
                            <Crop className="w-4 h-4" />
                          </button>

                          {/* Download Photo */}
                          <button
                            type="button"
                            onClick={(e) => downloadSinglePhoto(s, e)}
                            className="p-1.5 rounded-lg text-[#4B5B42] hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Download Biometric Photograph"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Edit Student Data (excludes photo & qr) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditData(s, e)}
                            className="p-1.5 rounded-lg text-[#4B5B42] hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Edit Student Information (Text/Academic)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(s);
                            }}
                            className="p-1.5 rounded-lg text-[#8A9680] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-[#F8FAF9] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-[#4B5B42] font-medium">
            Showing <span className="font-bold text-[#0B1118]">{pagedStudents.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-[#0B1118]">{Math.min(filtered.length, page * pageSize)}</span> of{' '}
            <span className="font-bold text-[#0B1118]">{filtered.length.toLocaleString()}</span> entries{' '}
            <span className="text-[#7C8B70]">({pageSize} per page)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 hover:bg-[#FBFDF7] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-xs bg-white border border-[#CBD5E1] rounded-lg">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 hover:bg-[#FBFDF7] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="ml-2 bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-bold text-[#0B1118]"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page (Default)</option>
              <option value={100}>100 per page</option>
              <option value={250}>250 per page</option>
              <option value={500}>500 per page</option>
              <option value={1000}>1000 per page</option>
            </select>
          </div>
        </div>
      </div>
        </>
      ) : (
        /* =========================================================================
            SCHOOL DIRECTORY FOLDERS SECTION (Each School in its Dedicated Folder)
           ========================================================================= */
        <div className="space-y-4">
          {renderDateStrip()}
          {!selectedSchoolFolder ? (
            /* ALL SCHOOLS FOLDER OVERVIEW */
            <div className="space-y-4">
              {/* Folder Section Header & Controls */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-[#256002]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-sm text-[#0B1118]">
                        School Compartment Folders ({filteredSchoolFolders.length})
                      </h3>
                      <p className="text-[11px] text-[#7C8B70] font-medium">
                        Every school is organized into a dedicated folder with verified biometric photos, grades, and exact transmission timestamps
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#7C8B70] bg-[#F6FAEF] px-3 py-1.5 rounded-xl border border-[#E3EFD7]">
                      Total Active Folders: <strong className="text-[#0B1118]">{filteredSchoolFolders.length} Schools</strong>
                    </span>
                  </div>
                </div>

                {/* Search & Branch Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-[#8A9680] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      placeholder="Search school folders (e.g. Sena Yerosen, 1234, YMS, Debebech)..."
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                    />
                    {folderSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFolderSearchQuery('')}
                        className="absolute right-3 top-2.5 text-[#8A9680] hover:text-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <select
                      value={folderBranchFilter}
                      onChange={(e) => setFolderBranchFilter(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] cursor-pointer"
                    >
                      <option value="ALL">All Branches ({DEFAULT_BRANCHES.length})</option>
                      {DEFAULT_BRANCHES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid of School Folder Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSchoolFolders.map((folder) => {
                  const isAdama = folder.branch === 'Adama';
                  const dayCount = folderDayCount(folder);
                  const dayFiltered = selectedDates.length > 0;

                  return (
                    <div
                      key={folder.schoolName}
                      onContextMenu={(e) => openFolderMenu(e, { kind: 'folder', folderName: folder.schoolName })}
                      className="bg-white border border-[#E2E8F0] hover:border-[#9EE617] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header badge & icon */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
 isAdama
 ? 'bg-amber-50 text-amber-800 border-amber-200'
 : folder.branch === 'Addis Ababa'
 ? 'bg-blue-50 text-blue-800 border-blue-200'
 : 'bg-purple-50 text-purple-800 border-purple-200'
 }`}>
                            {folder.branch}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => openFolderMenu(e, { kind: 'folder', folderName: folder.schoolName })}
                              className="grid h-7 w-7 place-items-center rounded-lg text-[#7C8B70] transition-colors hover:bg-[#F6FAEF] hover:text-[#0B1118] cursor-pointer"
                              title="Folder actions (open, select, edit, move, delete)"
                              aria-label="Folder actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            <div className="w-8 h-8 rounded-xl bg-[#F8FAF9] group-hover:bg-[#9EE617]/20 border border-[#E2E8F0] group-hover:border-[#9EE617]/50 flex items-center justify-center transition-colors">
                              <Folder className="w-4 h-4 text-[#4B5B42] group-hover:text-[#256002]" />
                            </div>
                          </div>
                        </div>

                        {/* School Name */}
                        <h4 className="font-heading font-black text-sm text-[#0B1118] group-hover:text-[#256002] transition-colors flex items-center gap-1.5">
                          <span>{folder.schoolName}</span>
                          {folder.schoolName === 'Sena Yerosen' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Adama</span>
                          )}
                          {folder.schoolName === '1234' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">New</span>
                          )}
                        </h4>

                        {/* Student Count */}
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-2xl font-black font-heading text-[#0B1118]">
                            {dayCount.toLocaleString()}
                          </span>
                          <span className="text-xs text-[#7C8B70] font-bold">
                            {dayFiltered ? `on ${selectedDates.length === 1 ? 'the selected day' : 'the selected days'}` : 'Students Enrolled'}
                          </span>
                        </div>
                        {dayFiltered && (
                          <div className="mt-0.5 text-[10px] font-semibold text-[#8A9680]">
                            {folder.totalStudents.toLocaleString()} in folder total
                          </div>
                        )}

                        {/* Photo Verification Rate */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-[#4B5B42]">
                            <span>Biometric Verification</span>
                            <span className={folder.photoPercent >= 90 ? 'text-emerald-600 font-black' : 'text-[#4B5B42]'}>
                              {folder.photoPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-[#F6FAEF] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#9EE617] h-full transition-all duration-300"
                              style={{ width: `${folder.photoPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Grade Tags (Sample preview) */}
                        {folder.grades.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {folder.grades.slice(0, 4).map(g => (
                              <span
                                key={g.grade}
                                className="px-1.5 py-0.5 rounded bg-[#F6FAEF] text-[#2B3A22] text-[10px] font-bold"
                              >
                                {g.grade}: {g.count}
                              </span>
                            ))}
                            {folder.grades.length > 4 && (
                              <span className="px-1 py-0.5 text-[#8A9680] text-[10px] font-bold">
                                +{folder.grades.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 text-[11px] text-[#8A9680] italic">
                            Awaiting field registrations
                          </div>
                        )}

                        {/* Last Transmitted */}
                        {folder.latestTransmitted && (
                          <div className="mt-2.5 text-[10px] text-[#7C8B70] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#8A9680]" />
                            <span>Last sent: {new Date(folder.latestTransmitted).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EDF4E5] pt-3">
                        <button
                          type="button"
                          onClick={() => openSchoolFolder(folder.schoolName)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#0B1118] hover:bg-slate-800 text-[#9EE617] text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Open Folder</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSchoolFilter(folder.schoolName);
                            setBranchFilter(folder.branch);
                            setViewMode('table');
                            setPage(1);
                          }}
                          className="p-2 rounded-xl bg-[#F6FAEF] hover:bg-[#E3EFD7] text-[#2B3A22] transition-colors cursor-pointer"
                          title="View this school in Master Table"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        {folder.totalStudents > 0 && (
                          <button
                            type="button"
                            onClick={() => downloadSelectedPhotosZip(folderStudentsFor(folder.schoolName))}
                            className="p-2 rounded-xl bg-[#9EE617]/20 hover:bg-[#9EE617]/30 text-[#256002] transition-colors cursor-pointer"
                            title={dayFiltered ? 'Download photos for the selected days (.ZIP)' : 'Download all photos for this school (.ZIP)'}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-[#B3BEA9] opacity-0 transition-opacity group-hover:opacity-100">
                        Right-click for select · edit · move · delete
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* DRILL-DOWN FOLDER VIEW */
            currentSchoolFolder && (
              <div className="space-y-4">
                {/* Folder Breadcrumb & Header */}
                <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSchoolFolder(null)}
                        className="py-1.5 px-3 rounded-xl bg-[#F6FAEF] hover:bg-[#E3EFD7] text-[#2B3A22] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>All Folders</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-[#256002]" />
                        <h3 className="font-heading font-black text-base text-[#0B1118]">
                          {currentSchoolFolder.schoolName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/30">
                          {currentSchoolFolder.branch} Branch
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSchoolFilter(currentSchoolFolder.schoolName);
                          setBranchFilter(currentSchoolFolder.branch);
                          setViewMode('table');
                          setPage(1);
                        }}
                        className="py-2 px-3 rounded-xl bg-[#F6FAEF] hover:bg-[#E3EFD7] text-[#0B1118] text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View in Master Table</span>
                      </button>

                      {currentSchoolFolder.totalStudents > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadSelectedPhotosZip(currentFolderStudents)}
                          className="py-2 px-3.5 rounded-xl bg-[#0B1118] hover:bg-slate-800 text-[#9EE617] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Download Folder Photos (ZIP)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Folder Sub-Header Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#4B5B42] pt-1 border-t border-[#EDF4E5]">
                    <div>
                      {selectedDates.length > 0 ? 'On selected days' : 'Total Students'}:{' '}
                      <strong className="text-[#0B1118]">
                        {(selectedDates.length > 0 ? currentFolderStudents.length : currentSchoolFolder.totalStudents).toLocaleString()}
                      </strong>
                      {selectedDates.length > 0 && (
                        <span className="ml-1 font-medium text-[#7C8B70]">
                          of {currentSchoolFolder.totalStudents.toLocaleString()} in folder
                        </span>
                      )}
                    </div>
                    <div>&bull;</div>
                    <div>
                      Verified Biometric Photos: <strong className="text-emerald-700">{currentSchoolFolder.withPhotoCount.toLocaleString()} ({currentSchoolFolder.photoPercent}%)</strong>
                    </div>
                    {currentSchoolFolder.latestTransmitted && (
                      <>
                        <div>&bull;</div>
                        <div className="text-[#7C8B70]">
                          Latest Entry: <strong className="text-[#0B1118]">{new Date(currentSchoolFolder.latestTransmitted).toLocaleString()}</strong>
                        </div>
                      </>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ids = currentFolderStudents.map(s => s.studentId);
                          setSelectedIds(prev => new Set([...prev, ...ids]));
                          setActionNotice(`${ids.length} record(s) from ${currentSchoolFolder.schoolName} added to the selection`);
                        }}
                        className="rounded-lg border border-[#E3E9DD] bg-white px-2.5 py-1 text-[11px] font-bold text-[#3F7A06] transition-colors hover:border-[#85E510] cursor-pointer"
                      >
                        Select all in folder ({currentFolderStudents.length})
                      </button>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A6B29B]">
                        Right-click a card for actions
                      </span>
                    </div>
                  </div>

                  {/* Grade Compartment Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => { setFolderGradeTab('ALL'); setFolderSectionTab('ALL'); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
 folderGradeTab === 'ALL'
 ? 'bg-[#0B1118] text-[#9EE617]'
 : 'bg-[#F6FAEF] hover:bg-[#E3EFD7] text-[#2B3A22]'
 }`}
                    >
                      All Grades ({folderDayCount(currentSchoolFolder)})
                    </button>

                    {currentSchoolGradeHierarchy.map(g => (
                      <button
                        key={g.baseGrade}
                        type="button"
                        onClick={() => { setFolderGradeTab(g.baseGrade); setFolderSectionTab('ALL'); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
 folderGradeTab === g.baseGrade
 ? 'bg-[#0B1118] text-[#9EE617]'
 : 'bg-[#F6FAEF] hover:bg-[#E3EFD7] text-[#2B3A22]'
 }`}
                      >
                        <span>{g.displayLabel}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${
 folderGradeTab === g.baseGrade ? 'bg-[#9EE617] text-[#0B1118]' : 'bg-[#E3EFD7] text-[#2B3A22]'
 }`}>
                          {g.totalCount}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Sub-Section Chips inside School Folder */}
                  {currentFolderActiveGrade && (
                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                      <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-emerald-700" />
                        {currentFolderActiveGrade.displayLabel} Sections:
                      </span>
                      <button
                        type="button"
                        onClick={() => setFolderSectionTab('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 folderSectionTab === 'ALL'
 ? 'bg-[#0B1118] text-[#9EE617]'
 : 'bg-white border border-[#E3EFD7] text-[#2B3A22] hover:bg-emerald-100/50'
 }`}
                      >
                        All {currentFolderActiveGrade.displayLabel} ({currentFolderActiveGrade.totalCount})
                      </button>
                      {currentFolderActiveGrade.sections.map(sec => (
                        <button
                          key={sec.section}
                          type="button"
                          onClick={() => setFolderSectionTab(sec.section)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
 folderSectionTab === sec.section
 ? 'bg-[#256002] text-white shadow-sm'
 : 'bg-white border border-[#E3EFD7] text-[#2B3A22] hover:bg-emerald-100/50'
 }`}
                        >
                          <span>Section {sec.section}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
 folderSectionTab === sec.section ? 'bg-[#9EE617] text-[#0B1118]' : 'bg-[#F6FAEF] text-[#4B5B42]'
 }`}>
                            {sec.count}
                          </span>
                        </button>
                      ))}
                      {currentFolderActiveGrade.noSectionCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFolderSectionTab('NONE')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
 folderSectionTab === 'NONE'
 ? 'bg-[#256002] text-white shadow-sm'
 : 'bg-white border border-[#E3EFD7] text-[#2B3A22] hover:bg-emerald-100/50'
 }`}
                        >
                          <span>General ({currentFolderActiveGrade.noSectionCount})</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Search inside folder */}
                  <div className="relative pt-1">
                    <Search className="w-4 h-4 text-[#8A9680] absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      placeholder={`Search within ${currentSchoolFolder.schoolName} by student ID, name, or phone...`}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
                    />
                    {folderSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFolderSearchQuery('')}
                        className="absolute right-3 top-3 text-[#8A9680] hover:text-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Student Photo Card Grid inside Folder */}
                {currentFolderStudents.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[#F6FAEF] mx-auto flex items-center justify-center">
                      <Folder className="w-8 h-8 text-[#8A9680]" />
                    </div>
                    <h4 className="font-heading font-black text-sm text-[#0B1118]">
                      {currentSchoolFolder.totalStudents === 0
                        ? `Folder for ${currentSchoolFolder.schoolName} is ready!`
                        : selectedDates.length > 0
                        ? 'No students in this folder on the selected days'
                        : 'No students match this grade or search filter'}
                    </h4>
                    <p className="text-xs text-[#7C8B70] max-w-md mx-auto">
                      {currentSchoolFolder.totalStudents === 0
                        ? `This school is active in the ${currentSchoolFolder.branch} branch. Senders can select "${currentSchoolFolder.schoolName}" in the registration console to begin transmitting student records.`
                        : selectedDates.length > 0
                        ? 'Clear the day filter or add the day this folder was transmitted.'
                        : 'Try selecting a different grade tab or clearing your search query.'}
                    </p>
                    {currentSchoolFolder.totalStudents === 0 && (
                      <div className="pt-2">
                        <Link
                          to="/sender"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
                        >
                          <span>Open Registration Console</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {currentFolderStudents.slice(0, folderCardLimit).map(s => {
                      const photoSources = getPhotoCandidates(s);
                      const photoUrl = photoSources[0] || null;
                      const hasRealPhoto = s.photoIntegrityStatus === 'PHOTO_VERIFIED' ||
                        (photoUrl && !photoUrl.includes('avatar') && !photoUrl.includes('placeholder'));

                      return (
                        <div
                          key={s.studentId}
                          onClick={(e) => handleOpenDetail(s, e)}
                          onContextMenu={(e) => openFolderMenu(e, { kind: 'student', folderName: currentSchoolFolder.schoolName, studentId: s.studentId })}
                          className={`flex cursor-pointer flex-col justify-between rounded-2xl border bg-white p-2.5 shadow-sm transition-all hover:shadow-md group ${
 selectedIds.has(s.studentId)
 ? 'border-[#85E510] ring-2 ring-[#85E510]/40'
 : 'border-[#E2E8F0] hover:border-[#9EE617]'
 }`}
                        >
                          <div>
                            {/* 3:4 Studio Portrait Frame */}
                            <div className="aspect-[3/4] w-full rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] overflow-hidden relative mb-2">
                              {photoUrl ? (
                                <img
                                  key={`${s.studentId}:${s.updatedAt || ''}:${photoUrl}`}
                                  src={photoUrl}
                                  alt={s.fullName}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={photoSourceError(photoSources, DEFAULT_AVATAR)}
                                />
                              ) : (
                                <img src={DEFAULT_AVATAR} alt="Avatar" className="w-full h-full object-cover" />
                              )}

                              {/* Cloudflare R2 verified pill */}
                              {hasRealPhoto && (
                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-[#0B1118]/55 backdrop-blur-sm backdrop-blur-sm text-[#9EE617] text-[9px] font-black tracking-tight border border-[#9EE617]/40">
                                  R2
                                </span>
                              )}

                              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-center">
                                <span className="px-1.5 py-0.5 rounded bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm text-white text-[9px] font-bold">
                                  {s.grade}
                                </span>
                              </div>
                            </div>

                            {/* Name & ID */}
                            <h5 className="font-heading font-black text-xs text-[#0B1118] truncate group-hover:text-[#256002] transition-colors" title={s.fullName}>
                              {s.fullName}
                            </h5>
                            <div className="text-[10px] font-bold text-[#7C8B70]">
                              {s.studentId}
                            </div>

                            {/* Exact Date Transmitted */}
                            <div className="mt-1 text-[9px] text-[#8A9680] truncate" title={s.createdAt || ''}>
                              {s.createdAt ? new Date(s.createdAt).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                            </div>
                          </div>

                          {/* Action Row */}
                          <div className="mt-2 flex items-center justify-between gap-1 border-t border-[#EDF4E5] pt-2">
                            <label
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] font-bold transition-colors ${
 selectedIds.has(s.studentId)
 ? 'bg-[#EAF7DA] text-[#2F5E04]'
 : 'text-[#7C8B70] hover:bg-[#FBFDF7] hover:text-[#0B1118]'
 }`}
                              title={selectedIds.has(s.studentId) ? 'Remove from selection' : 'Select this record'}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span
                                className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition-colors ${
 selectedIds.has(s.studentId)
 ? 'border-[#6FBF0A] bg-[#6FBF0A] text-white'
 : 'border-[#DBEDC9] bg-white'
 }`}
                              >
                                {selectedIds.has(s.studentId) && <Check className="h-2.5 w-2.5 stroke-[4]" />}
                              </span>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.studentId)}
                                onChange={() => {
                                  setSelectedIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(s.studentId)) next.delete(s.studentId);
                                    else next.add(s.studentId);
                                    return next;
                                  });
                                }}
                                className="sr-only"
                              />
                              <span>Select</span>
                            </label>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleOpenPhotoEditor(s, e)}
                                className="p-1 rounded text-[#8A9680] hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Edit/Crop Photo"
                              >
                                <Crop className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenEditData(s, e)}
                                className="p-1 rounded text-[#8A9680] hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                title="Edit Student Data"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => downloadSinglePhoto(s, e)}
                                className="p-1 rounded text-[#8A9680] hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors"
                                title="Download Photo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => downloadSingleQr(s, e)}
                                className="p-1 rounded text-[#8A9680] hover:text-[#0B1118] hover:bg-[#F6FAEF] transition-colors"
                                title="Download QR Code (PNG)"
                              >
                                <QrIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentFolderStudents.length > folderCardLimit && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#E3EFD7] bg-white px-3.5 py-2.5">
                    <span className="text-[11px] font-semibold text-[#7C8B70]">
                      Showing {folderCardLimit.toLocaleString()} of {currentFolderStudents.length.toLocaleString()} records in this folder
                    </span>
                    <button
                      type="button"
                      onClick={() => setFolderCardLimit(n => n + 120)}
                      className="shrink-0 rounded-lg bg-[#85E510] px-3 py-1.5 text-[11px] font-black text-[#062404] transition-colors hover:bg-[#76CF0C] cursor-pointer"
                    >
                      Show next {Math.min(120, currentFolderStudents.length - folderCardLimit).toLocaleString()}
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
      </div>

      {/* =========================================================================
          SLIDE-OVER DRAWER: STUDENT PROFILE DETAILS (Exact Match to User's Screenshot)
         ========================================================================= */}
      {isDetailDrawerOpen && detailStudent && (
        <div className="fixed inset-0 z-50 bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#dce7e1] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#eef5f1] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-[#080808]">Student Profile Details</h3>
                <span className="text-[11px] text-[#3F7A06] font-semibold">{detailStudent.studentId}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailDrawerOpen(false)}
                className="rounded-lg p-1 text-[#6b7771] hover:text-[#080808] hover:bg-[#F6FAEF] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Studio Portrait Showcase Card */}
              <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl border border-[#dce7e1] bg-[#f8fafc]">
                <span className="text-xs uppercase tracking-wider text-[#6b7771] font-semibold">
                  Official Studio Portrait (3:4)
                </span>

                {/* Portrait Frame */}
                <div
                  onClick={() => handleOpenPhotoEditor(detailStudent)}
                  className="w-48 aspect-[3/4] rounded-2xl border-2 border-[#dce7e1] bg-white overflow-hidden flex items-center justify-center shadow-md relative cursor-pointer group/drawerPhoto"
                  title="Click to Crop & Edit Studio Portrait"
                >
                  <img
                    key={`${detailStudent.studentId}:${detailStudent.updatedAt || ''}:${getPhotoCandidates(detailStudent)[0] || ''}`}
                    src={getPhotoCandidates(detailStudent)[0] || DEFAULT_AVATAR}
                    alt={detailStudent.fullName}
                    className="w-full h-full object-cover group-hover/drawerPhoto:scale-105 transition-transform"
                    onError={photoSourceError(getPhotoCandidates(detailStudent), DEFAULT_AVATAR)}
                  />
                  <div className="absolute inset-0 bg-[#0B1118]/40 backdrop-blur-sm opacity-0 group-hover/drawerPhoto:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold pointer-events-none">
                    <Crop className="h-6 w-6 text-[#3F7A06]" />
                    <span className="bg-[#0B1118]/45 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] border border-white/20">Click to Edit Photo</span>
                  </div>
                </div>

                {/* Action Buttons Below Portrait */}
                <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                  <button
                    type="button"
                    onClick={() => downloadSinglePhoto(detailStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white border border-[#dce7e1] text-[#080808] hover:bg-[#FBFDF7] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-[#3F7A06]" />
                    <span>Download Original Portrait (.jpg)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPhotoEditor(detailStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-[#85E510] text-[#062404] hover:bg-[#76CF0C] transition-all shadow-sm cursor-pointer"
                  >
                    <Crop className="h-3.5 w-3.5" />
                    <span>Crop &amp; Edit Portrait</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const url = getPhotoUrl(detailStudent.capturedPhoto || detailStudent.photoBase64 || detailStudent.photoPath || detailStudent.previewPath || detailStudent.thumbnailPath);
                      if (url) {
                        navigator.clipboard.writeText(url);
                        alert('Image link copied to clipboard!');
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white border border-[#dce7e1] text-[#080808] hover:bg-[#FBFDF7] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Link2 className="h-3.5 w-3.5 text-[#3F7A06]" />
                    <span>Copy Direct Image Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPhotoEditor(detailStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white border border-[#dce7e1] text-[#080808] hover:bg-[#FBFDF7] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-500" />
                    <span>Replace Photo File Directly</span>
                  </button>

                  <div className="text-[11px] text-[#6b7771] text-center truncate pt-0.5">
                    /api/uploads?studentId={detailStudent.studentId}
                  </div>
                </div>
              </div>

              {/* Field Details List - Exactly matching Screenshot */}
              <div className="space-y-3 divide-y divide-[#eef5f1] text-sm font-sans">
                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">Name:</span>
                  <strong className="text-[#080808] font-bold text-sm">{detailStudent.fullName}</strong>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">Grade & Section:</span>
                  <span className="text-[#080808] font-bold text-xs">{getGradeDisplay(detailStudent)}</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">Section:</span>
                  <span className="text-[#080808] font-bold text-xs">{getCleanSection(detailStudent)}</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">Branch:</span>
                  <span className="text-[#080808] font-bold text-xs">{getStudentBranch(detailStudent)}</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">School:</span>
                  <span className="text-[#080808] font-semibold text-xs">{detailStudent.school || "Unassigned"}</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">Blood Group:</span>
                  <span className="text-[#43A047] font-black text-xs">
                    {detailStudent.bloodType && detailStudent.bloodType.trim() ? detailStudent.bloodType : "AB+"}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[#6b7771] text-xs font-medium">Data Sent By:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#EAF7DA] text-[#366804] border border-[#CDEBB4]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6FBF0A]" />
                    {detailStudent.senderName || (detailStudent as any).senderId || "miskrdires12"}
                  </span>
                </div>

                {/* Real Verified QR Code Preview Card */}
                <div className="pt-3 border-t border-[#dce7e1] flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#080808] flex items-center gap-1.5">
                      <QrIcon className="h-4 w-4 text-[#3F7A06]" />
                      <span>Real Verified QR Code</span>
                    </div>
                    <div className="text-[10px] text-[#6b7771]">
                      Token strictly {detailStudent.studentId}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => downloadSingleQr(detailStudent)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-[#85E510] text-[#062404] hover:bg-[#76CF0C] transition-all shadow-sm cursor-pointer"
                        title="Save QR Code"
                      >
                        <Download className="h-3 w-3" />
                        <span>Save QR</span>
                      </button>
                    </div>
                  </div>

                  <div
                    className="shrink-0 cursor-pointer p-1 rounded-xl bg-white border border-[#dce7e1] shadow-2xs hover:scale-105 transition-transform"
                    onClick={() => downloadSingleQr(detailStudent)}
                    title="Click to download QR"
                  >
                    {detailQrDataUrl ? (
                      <img src={detailQrDataUrl} alt="QR Code" className="w-14 h-14 object-contain" />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#8A9680]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action: Delete Student Record */}
              <div className="pt-4 border-t border-[#eef5f1]">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(detailStudent);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50/60 py-2.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Student Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ONLINE PHOTO EDITOR & PHONE CROP MODAL
         ========================================================================= */}
      {isPhotoEditorOpen && editingPhotoStudent && (
        <PhoneCropModal
          isOpen={isPhotoEditorOpen}
          imageUrl={getPhotoUrl(editingPhotoStudent.capturedPhoto || editingPhotoStudent.photoBase64 || editingPhotoStudent.photoPath || editingPhotoStudent.previewPath || editingPhotoStudent.thumbnailPath) || DEFAULT_AVATAR}
          studentId={editingPhotoStudent.studentId}
          title={`Edit Student Photograph (${editingPhotoStudent.fullName})`}
          onClose={() => {
            setIsPhotoEditorOpen(false);
            setEditingPhotoStudent(null);
          }}
          onSave={handleSaveEditedPhoto}
        />
      )}

      {/* =========================================================================
          EDIT STUDENT DATA MODAL (All fields EXCEPT Photo and QR)
         ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3EFD7]">
              <div>
                <h3 className="font-heading font-black text-base text-[#0B1118]">
                  {editingDataStudent ? 'Edit Student Information' : 'Add Student to Directory'}
                </h3>
                <p className="text-[11px] text-[#7C8B70]">
                  {editingDataStudent
                    ? `${editingDataStudent.studentId} • Academic & Contact metadata`
                    : `${newStudentId} • Academic & Contact metadata`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => (isNewStudentMode ? closeAddStudentModal() : setIsEditModalOpen(false))}
                className="p-1 text-[#8A9680] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentData} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {isNewStudentMode && (
                  <div className="col-span-2">
                    <label className="font-bold text-[#0B1118] block mb-1 flex items-center justify-between">
                      <span>Student ID *</span>
                      <button
                        type="button"
                        onClick={() => setNewStudentId(nextDirectoryStudentId())}
                        className="text-[10px] font-black text-[#256002] hover:underline cursor-pointer"
                      >
                        Generate new ID
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="font-bold text-[#0B1118] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Sex Identification</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSex('Male')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
 editSex === 'Male'
 ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
 : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-[#F6FAEF] hover:text-[#0B1118]'
 }`}
                    >
                      <span className="text-sm">♂</span>
                      <span>Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSex('Female')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
 editSex === 'Female'
 ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
 : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-[#F6FAEF] hover:text-[#0B1118]'
 }`}
                    >
                      <span className="text-sm">♀</span>
                      <span>Female</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Grade</label>
                  <input
                    type="text"
                    required
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    placeholder="e.g. 10 or 9"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Section / Department</label>
                  <input
                    type="text"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    placeholder="e.g. A, B, C or Natural"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Blood Group</label>
                  <select
                    value={editBloodType === 'O+' ? 'Unknown' : editBloodType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBloodType(val === 'O+' ? 'Unknown' : val);
                    }}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Branch Location */}
                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Branch Location</label>
                  <select
                    value={editBranch}
                    onChange={(e) => handleEditBranchChange(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    {DEFAULT_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Assigned School (Filtered to branch) */}
                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Assigned School ({editBranch})</label>
                  <select
                    value={editSchool}
                    onChange={(e) => setEditSchool(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    {(BRANCH_SCHOOL_MAP[editBranch] || ['YMS']).map(sch => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                </div>

                {/* Phone (auto formats 09/07 to +2519/+2517, blank stays blank) */}
                <div className="col-span-2">
                  <label className="font-bold text-[#0B1118] block mb-1 flex items-center justify-between">
                    <span>Student Phone Number</span>
                    <span className="text-[10px] text-[#8A9680] font-normal">Auto 09/07 &rarr; +2519/+2517 (blank if empty)</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                    onBlur={() => setEditPhone(formatPhoneNumber(editPhone))}
                    placeholder="e.g. 0911223344"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={editGuardianName}
                    onChange={(e) => setEditGuardianName(e.target.value)}
                    placeholder="Parent / Guardian"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={editEmergencyPhone}
                    onChange={(e) => setEditEmergencyPhone(formatPhoneNumber(e.target.value))}
                    onBlur={() => setEditEmergencyPhone(formatPhoneNumber(editEmergencyPhone))}
                    placeholder="e.g. 0911223344"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">School Bus Transport</label>
                  <select
                    value={editBusUsage}
                    onChange={(e) => setEditBusUsage(e.target.value as any)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    <option value="Yes">Yes (School Bus)</option>
                    <option value="No">No (Private)</option>
                  </select>
                </div>
              </div>

              {isNewStudentMode && addStatus.kind !== 'idle' && (
                <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
 addStatus.kind === 'error'
 ? 'bg-rose-50 border-rose-300 text-rose-900'
 : addStatus.kind === 'queued'
 ? 'bg-amber-50 border-amber-300 text-amber-900'
 : addStatus.kind === 'sent'
 ? 'bg-emerald-50 border-[#9EE617] text-[#256002]'
 : 'bg-[#FBFDF7] border-[#E3EFD7] text-[#4B5B42]'
 }`}>
                  {addStatus.text}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E3EFD7]">
                <button
                  type="button"
                  onClick={() => (isNewStudentMode ? closeAddStudentModal() : setIsEditModalOpen(false))}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-[#FBFDF7] cursor-pointer"
                >
                  Cancel
                </button>
                {isNewStudentMode && (addStatus.kind === 'sent' || addStatus.kind === 'queued') && (
                  <button
                    type="button"
                    onClick={handleAddAnotherStudent}
                    className="px-4 py-2 rounded-xl border border-[#9EE617] bg-[#9EE617]/10 text-[#256002] text-xs font-black hover:bg-[#9EE617]/20 cursor-pointer"
                  >
                    Add another
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] disabled:opacity-60 text-[#062404] text-xs font-black shadow-sm cursor-pointer"
                >
                  {isNewStudentMode ? (isAddingStudent ? 'Adding...' : 'Add Student') : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE DOWNLOAD PROGRESS MODAL
         ========================================================================= */}
      {progressModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1118]/55 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1118] text-white border border-[#2D3748] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center text-[#9EE617]">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-white">
                  {progressModal.title}
                </h3>
                <p className="text-xs text-[#8A9680] mt-0.5">Please wait while files are processed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#8A9680] truncate max-w-[240px]">{progressModal.statusText}</span>
                <span className="text-[#9EE617]">
                  {progressModal.total > 0
                    ? Math.round((progressModal.current / progressModal.total) * 100)
                    : 100}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-[#9EE617] to-[#BEF264] transition-all duration-150 rounded-full"
                  style={{
                    width: `${progressModal.total > 0
                      ? Math.min(100, Math.round((progressModal.current / progressModal.total) * 100))
                      : 100}%`
                  }}
                />
              </div>
              <div className="text-[11px] text-[#8A9680] flex justify-between">
                <span>Processed: {progressModal.current} of {progressModal.total}</span>
                <span>Active thread</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE MODAL (Temporary hide vs Permanent purge)
         ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FBFDF7]">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#0B1118]">Delete Confirmation</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-[#8A9680] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#F6FAEF] rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-[#DBEDC9] overflow-hidden shrink-0">
                  <img
                    src={getPhotoUrl(deleteTarget.capturedPhoto || deleteTarget.photoBase64 || deleteTarget.photoPath || deleteTarget.previewPath) || DEFAULT_AVATAR}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-[#0B1118]">{deleteTarget.fullName}</div>
                  <div className="text-[#64748B] text-[11px]">{deleteTarget.studentId}</div>
                </div>
              </div>

              {/* Temporary Hide */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                <div className="font-bold text-amber-900">Temporary Hide</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Hides student from table view. Record remains safe in database and can be restored.
                </p>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(false)}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer"
                >
                  {isDeleting ? 'Updating...' : 'Hide from Directory'}
                </button>
              </div>

              {/* Permanent Delete */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                <div className="font-bold text-rose-900">Permanent Purge</div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Irreversibly removes student from database and purges photograph from Cloudflare R2 bucket.
                </p>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(true)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isDeleting ? 'Erasing...' : 'Permanent Purge Everywhere'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BULK DELETE MODAL (Selected Students Deletion)
         ========================================================================= */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FBFDF7]">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#0B1118]">
                  Delete {selectedIds.size} Selected Students
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1 text-[#8A9680] hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#F6FAEF] rounded-xl">
                <div className="font-bold text-[#0B1118] text-sm">
                  {selectedIds.size} student record{selectedIds.size === 1 ? '' : 's'} selected
                </div>
                <p className="text-[11px] text-[#7C8B70] mt-0.5">
                  Choose whether to temporarily hide these records or permanently erase them from both the active station and the master server.
                </p>
              </div>

              {/* Temporary Hide Selected */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                <div className="font-bold text-amber-900">Temporary Hide Selected</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Removes selected students from active view. Records remain safe in the repository and can be restored anytime.
                </p>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => executeBulkDelete(false)}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
                >
                  {isBulkDeleting ? 'Updating records...' : `Hide ${selectedIds.size} Records from Directory`}
                </button>
              </div>

              {/* Permanent Purge Selected */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                <div className="font-bold text-rose-900">Permanent Purge Selected</div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Irreversibly deletes selected students from database and purges photos from storage bucket.
                </p>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => executeBulkDelete(true)}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
                >
                  {isBulkDeleting ? 'Erasing records...' : `Permanently Delete ${selectedIds.size} Records`}
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-[#F6FAEF] hover:bg-[#E3EFD7] text-[#2B3A22] font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MISTAKE ANALYZER POP-UP MODAL (Screen Overlay in Student Directory)
         ========================================================================= */}
      {isMistakeModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-[#CBD5E1] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-sm">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-lg text-[#0B1118]">
                      Mistake Analyzer & Quality Control
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                      {mistakeItems.length} Flagged Anomalies
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Automated heuristic scan of student photographs, duplicate IDs, and phone formats
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMistakeModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-[#E3EFD7] hover:border-[#DBEDC9] flex items-center justify-center text-[#7C8B70] hover:text-black hover:bg-[#F6FAEF] transition-all cursor-pointer"
                title="Close Analyzer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Category Filter Cards */}
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAF9] shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <button
                  type="button"
                  onClick={() => setMistakeFilterType('ALL')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
 mistakeFilterType === 'ALL'
 ? 'bg-[#9EE617] border-black text-black font-black shadow-sm'
 : 'bg-white border-[#E3EFD7] hover:border-[#DBEDC9] text-[#2B3A22]'
 }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">All Anomalies</div>
                  <div className="text-2xl font-black">{mistakeItems.length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMistakeFilterType('Missing Photo')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
 mistakeFilterType === 'Missing Photo'
 ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-sm'
 : 'bg-white border-[#E3EFD7] hover:border-amber-300 text-[#2B3A22]'
 }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Missing Photos</div>
                  <div className="text-2xl font-black text-amber-600">
                    {mistakeItems.filter(m => m.type === 'Missing Photo').length}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMistakeFilterType('Duplicate ID')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
 mistakeFilterType === 'Duplicate ID'
 ? 'bg-rose-100 border-rose-400 text-rose-950 font-black shadow-sm'
 : 'bg-white border-[#E3EFD7] hover:border-rose-300 text-[#2B3A22]'
 }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Duplicate IDs</div>
                  <div className="text-2xl font-black text-rose-600">
                    {mistakeItems.filter(m => m.type === 'Duplicate ID').length}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMistakeFilterType('Invalid Phone Number')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
 mistakeFilterType === 'Invalid Phone Number'
 ? 'bg-purple-100 border-purple-400 text-purple-950 font-black shadow-sm'
 : 'bg-white border-[#E3EFD7] hover:border-purple-300 text-[#2B3A22]'
 }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Phone Issues</div>
                  <div className="text-2xl font-black text-purple-600">
                    {mistakeItems.filter(m => m.type === 'Invalid Phone Number').length}
                  </div>
                </button>
              </div>

              {/* Search Within Anomalies */}
              <div className="mt-3 relative">
                <Search className="w-4 h-4 text-[#8A9680] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={mistakeSearch}
                  onChange={(e) => setMistakeSearch(e.target.value)}
                  placeholder="Filter anomaly by student name or ID..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                />
              </div>
            </div>

            {/* Anomalies List / Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
              {(() => {
                const filteredMistakes = mistakeItems.filter(m => {
                  const matchType = mistakeFilterType === 'ALL' || m.type === mistakeFilterType;
                  const q = mistakeSearch.toLowerCase().trim();
                  const matchSearch = !q || m.student.fullName.toLowerCase().includes(q) || m.student.studentId.toLowerCase().includes(q);
                  return matchType && matchSearch;
                });

                if (filteredMistakes.length === 0) {
                  return (
                    <div className="py-12 text-center text-[#7C8B70]">
                      <CheckCircle2 className="w-12 h-12 text-[#85E510] mx-auto mb-2 stroke-[1.8]" />
                      <div className="font-heading font-black text-base text-[#0B1118]">No Active Anomalies Found</div>
                      <p className="text-xs text-[#7C8B70] mt-1">All student records match quality standards.</p>
                    </div>
                  );
                }

                return filteredMistakes.map(m => {
                  const s = m.student;
                  const photoSources = getPhotoCandidates(s);
                  const photoSrc = photoSources[0] || DEFAULT_AVATAR;

                  return (
                    <div
                      key={m.key}
                      className="p-3.5 rounded-2xl border border-[#E3EFD7] hover:border-[#DBEDC9] bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Student Photo */}
                        <div
                          onClick={() => handleOpenPhotoEditor(s)}
                          className="w-12 h-14 rounded-xl overflow-hidden bg-[#F6FAEF] border border-[#DBEDC9] shrink-0 cursor-pointer group relative shadow-2xs"
                          title="Click to crop and edit photo in 3:4 portrait"
                        >
                          <img key={`${s.studentId}:${s.updatedAt || ''}:${photoSrc}`} src={photoSrc} onError={photoSourceError(photoSources, DEFAULT_AVATAR)} alt={s.fullName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Crop className="w-4 h-4 text-[#9EE617]" />
                          </div>
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-black text-xs text-[#0B1118] truncate">
                              {s.fullName}
                            </span>
                            <span className="text-[10px] font-bold text-[#4B5B42] bg-[#F6FAEF] px-1.5 py-0.5 rounded">
                              {s.studentId}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
 m.type === 'Missing Photo' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
 m.type === 'Duplicate ID' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
 'bg-purple-100 text-purple-800 border border-purple-300'
 }`}>
                              {m.type}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#4B5B42] font-medium">
                            {m.detail}
                          </div>

                          <div className="text-[10px] text-[#8A9680] flex items-center gap-2">
                            <span>{getGradeDisplay(s)}</span>
                            <span>&bull;</span>
                            <span>{s.school || 'Unassigned'}</span>
                            {s.phone && (
                              <>
                                <span>&bull;</span>
                                <span className="">{s.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* Crop & Edit Photo */}
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoEditor(s)}
                          className="py-1.5 px-2.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black font-black text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Open Biometric Photo Cropper (3:4)"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Edit Photo</span>
                        </button>

                        {/* Quick-fix phone if applicable */}
                        {m.type === 'Invalid Phone Number' && (
                          <button
                            type="button"
                            onClick={() => handleQuickFixPhone(s)}
                            className="py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                            title="Format to +251 standard"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Fix Phone</span>
                          </button>
                        )}

                        {/* Edit Student Info */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditData(s)}
                          className="py-1.5 px-2.5 rounded-xl border border-[#E3EFD7] hover:bg-[#F6FAEF] text-[#2B3A22] font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Edit academic and contact info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Data</span>
                        </button>

                        {/* Dismiss */}
                        <button
                          type="button"
                          onClick={() => setResolvedMistakeKeys(prev => new Set([...prev, m.key]))}
                          className="p-1.5 rounded-xl border border-[#E3EFD7] hover:bg-[#F6FAEF] text-[#8A9680] hover:text-[#4B5B42] cursor-pointer"
                          title="Dismiss anomaly"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#7C8B70] font-medium">
                Click "Edit Photo" to crop in default 3:4 portrait or "Edit Data" to resolve registry mistakes.
              </span>
              <button
                type="button"
                onClick={() => setIsMistakeModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-black text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close Analyzer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Pause Bulked Note Modal */}
      {calendarNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1118]/45 backdrop-blur-sm backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E3EFD7] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#256002]" />
                <h3 className="font-heading font-black text-sm text-[#0B1118]">Pause Bulked Students Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setCalendarNoteModalOpen(false)}
                className="p-1 rounded-lg text-[#8A9680] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#4B5B42]">
              Enter pause reason or notes for selected bulked students:
            </p>

            <textarea
              value={calendarPauseNote}
              onChange={(e) => setCalendarPauseNote(e.target.value)}
              placeholder="e.g. Card printer maintenance, pending ID badge validation, student reshoot needed..."
              rows={3}
              className="w-full p-3 rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] text-xs text-[#0B1118] focus:outline-none focus:border-[#9EE617]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCalendarNoteModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#E3EFD7] text-xs font-bold text-[#4B5B42] hover:bg-[#FBFDF7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : filtered.map(f => f.studentId);
                  const note = calendarPauseNote.trim() || 'Paused by operator';
                  setPausedIds(prev => {
                    const next = new Set(prev);
                    targetIds.forEach(id => next.add(id));
                    localStorage.setItem('sb_paused_student_ids', JSON.stringify(Array.from(next)));
                    return next;
                  });
                  setPausedNotes(prev => {
                    const next = { ...prev };
                    targetIds.forEach(id => { next[id] = note; });
                    localStorage.setItem('sb_paused_student_notes', JSON.stringify(next));
                    return next;
                  });
                  setCalendarNoteModalOpen(false);
                  setCalendarPauseNote('');
                  alert(`Successfully paused ${targetIds.length} students with note: "${note}"`);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#0B1118] text-[#9EE617] text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Save Pause Note
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Right-click context menu (school folders and student cards) */}
      {folderMenu && (() => {
        const menuFolderName = folderMenu.folderName;
        const menuStudent = folderMenu.kind === 'student'
          ? students.find(s => s.studentId === folderMenu.studentId) || null
          : null;
        const itemClass =
          'flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-[#26301F] transition-colors hover:bg-[#F3F7EE] cursor-pointer';
        return (
          <div
            className="fixed z-[90] w-[236px] overflow-hidden rounded-xl border border-[#E3E9DD] bg-white py-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
            style={{ left: folderMenu.x, top: folderMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="truncate border-b border-[#EEF3E8] px-3 pb-1.5 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8A9680]">
              {folderMenu.kind === 'folder' ? menuFolderName : menuStudent?.fullName || menuFolderName}
            </div>

            {folderMenu.kind === 'folder' ? (
              <>
                <button type="button" className={itemClass} onClick={() => openSchoolFolder(menuFolderName)}>
                  <FolderOpen className="h-3.5 w-3.5 text-[#3F7A06]" />
                  Open folder
                </button>
                <button type="button" className={itemClass} onClick={() => selectFolderRecords(menuFolderName)}>
                  <Check className="h-3.5 w-3.5 text-[#3F7A06]" />
                  Select {selectedDates.length > 0 ? 'records on these days' : 'all records'}
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    const folder = schoolFolders.find(f => f.schoolName === menuFolderName);
                    startRenameFolder(menuFolderName, folder?.branch || getBranchForSchool(menuFolderName));
                  }}
                >
                  <Edit2 className="h-3.5 w-3.5 text-[#2563EB]" />
                  Edit folder (rename / branch)
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => startMoveStudents(folderStudentsFor(menuFolderName).map(s => s.studentId), menuFolderName)}
                >
                  <MoveRight className="h-3.5 w-3.5 text-[#7C3AED]" />
                  Move students to another school…
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    downloadSelectedPhotosZip(folderStudentsFor(menuFolderName));
                    setFolderMenu(null);
                  }}
                >
                  <Download className="h-3.5 w-3.5 text-[#3F7A06]" />
                  Download photos (ZIP)
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-[#EEF3E8] px-3 py-2 text-left text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                  onClick={() => deleteFolderRecords(menuFolderName)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete records{selectedDates.length > 0 ? ' on these days' : ''}
                </button>
              </>
            ) : menuStudent ? (
              <>
                <button type="button" className={itemClass} onClick={() => { handleOpenDetail(menuStudent); setFolderMenu(null); }}>
                  <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
                  Open dossier
                </button>
                <button type="button" className={itemClass} onClick={() => { handleOpenEditData(menuStudent); setFolderMenu(null); }}>
                  <Edit2 className="h-3.5 w-3.5 text-[#2563EB]" />
                  Edit student data
                </button>
                <button type="button" className={itemClass} onClick={() => { handleOpenPhotoEditor(menuStudent); setFolderMenu(null); }}>
                  <Crop className="h-3.5 w-3.5 text-[#3F7A06]" />
                  Crop / edit photo
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    const wasSelected = selectedIds.has(menuStudent.studentId);
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(menuStudent.studentId)) next.delete(menuStudent.studentId);
                      else next.add(menuStudent.studentId);
                      return next;
                    });
                    setActionNotice(
                      wasSelected
                        ? `${menuStudent.fullName} removed from the selection`
                        : `${menuStudent.fullName} selected`
                    );
                    setFolderMenu(null);
                  }}
                >
                  <Check className="h-3.5 w-3.5 text-[#3F7A06]" />
                  {selectedIds.has(menuStudent.studentId) ? 'Remove from selection' : 'Select record'}
                </button>
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => startMoveStudents([menuStudent.studentId], menuFolderName)}
                >
                  <MoveRight className="h-3.5 w-3.5 text-[#7C3AED]" />
                  Move to another school…
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-[#EEF3E8] px-3 py-2 text-left text-[11px] font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                  onClick={() => { setDeleteTarget(menuStudent); setFolderMenu(null); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete record
                </button>
              </>
            ) : null}
          </div>
        );
      })()}

      {/* Move students to another school */}
      {moveTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0B1118]/40 backdrop-blur-sm p-4" onClick={() => { if (!isMoving) setMoveTarget(null); }}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF3E8] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF7DA]">
                  <MoveRight className="h-4 w-4 text-[#3F7A06]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0B1118]">Move students</h3>
                  <p className="text-[11px] font-medium text-[#8A9680]">
                    {moveTarget.ids.length} record(s) from {moveTarget.fromSchool}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!isMoving) setMoveTarget(null); }}
                className="rounded-lg p-1 text-[#8A9680] hover:bg-[#F6FAEF] hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">
                Destination school
              </label>
              <select
                value={moveDestination}
                onChange={(e) => setMoveDestination(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
              >
                <option value="">Choose a school…</option>
                {Object.entries(BRANCH_SCHOOL_MAP).map(([branch, schools]) => (
                  <optgroup key={branch} label={`${branch} Branch`}>
                    {schools
                      .filter(name => name !== moveTarget.fromSchool)
                      .map(name => (
                        <option key={`${branch}-${name}`} value={name}>{name}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
              {moveDestination && (
                <p className="rounded-xl border border-[#CDEBB4] bg-[#F3FBE8] px-3 py-2 text-[11px] font-semibold text-[#3F7A06]">
                  These records will be filed under <strong>{moveDestination}</strong> · {getBranchForSchool(moveDestination)} branch.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#EEF3E8] px-5 py-3">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                disabled={isMoving}
                className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#4B5B42] hover:bg-[#FBFDF7] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={!moveDestination || isMoving}
                className="rounded-xl bg-[#85E510] px-4 py-1.5 text-xs font-black text-[#062404] hover:bg-[#9EE617] disabled:opacity-50 cursor-pointer"
              >
                {isMoving ? 'Moving…' : 'Move records'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / rename folder */}
      {renameTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#0B1118]/40 backdrop-blur-sm p-4" onClick={() => { if (!isRenaming) setRenameTarget(null); }}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#EEF3E8] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF7DA]">
                  <Edit2 className="h-4 w-4 text-[#3F7A06]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0B1118]">Edit folder</h3>
                  <p className="text-[11px] font-medium text-[#8A9680]">
                    Re-files every record in {renameTarget.schoolName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!isRenaming) setRenameTarget(null); }}
                className="rounded-lg p-1 text-[#8A9680] hover:bg-[#F6FAEF] hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">School name</label>
                <input
                  type="text"
                  value={renameSchoolValue}
                  onChange={(e) => setRenameSchoolValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#7C8B70]">Branch</label>
                <select
                  value={renameBranchValue}
                  onChange={(e) => setRenameBranchValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none"
                >
                  {DEFAULT_BRANCHES.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] font-medium text-[#8A9680]">
                Records keep their IDs, photos and transmit dates — only their school folder changes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#EEF3E8] px-5 py-3">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                disabled={isRenaming}
                className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#4B5B42] hover:bg-[#FBFDF7] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                disabled={!renameSchoolValue.trim() || isRenaming}
                className="rounded-xl bg-[#85E510] px-4 py-1.5 text-xs font-black text-[#062404] hover:bg-[#9EE617] disabled:opacity-50 cursor-pointer"
              >
                {isRenaming ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action toast */}
      {actionNotice && (
        <div className="fixed bottom-5 right-5 z-[100] flex max-w-sm items-start gap-2.5 rounded-2xl border border-[#CDEBB4] bg-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3F7A06]" />
          <span className="text-[11px] font-bold leading-relaxed text-[#26301F]">{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="ml-1 shrink-0 rounded p-0.5 text-[#8A9680] hover:text-black cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
