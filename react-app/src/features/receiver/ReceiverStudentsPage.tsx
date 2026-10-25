import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Eye, Edit2, Trash2, X, Plus, Calendar,
  UserCheck, Shield, ChevronLeft, ChevronRight,
  BookOpen, Users as UsersIcon, Check, Printer,
  Download, Image as ImageIcon, QrCode as QrIcon,
  Sliders, FileText, CheckCircle2, AlertTriangle, Phone,
  MapPin, Clock, ExternalLink, RefreshCw, FileSpreadsheet,
  Archive, ArrowUpDown, ArrowUp, ArrowDown, Filter, Sparkles, Crop, Cloud,
  Radio, Award, Activity, TrendingUp, ArrowRight, Link2, Upload,
  Folder, FolderOpen, Layers
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
  isServerApiOnline
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
  const [selectedDate, setSelectedDate] = useState('');

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
      const matchSchool = schoolFilter === 'ALL' || (s.school || '').toLowerCase().includes(schoolFilter.toLowerCase());
      const matchSender = senderFilter === 'ALL' || (s.senderName || s.senderId) === senderFilter;
      const studentDate = (s.createdAt || (s as any).registrationDate || s.recordHistory?.[0]?.date || '').substring(0, 10);
      const matchDate = !selectedDate || (studentDate === selectedDate);

      const st = (s.status || 'Active').toUpperCase();
      const isAccepted = st === 'ACCEPTED' || st === 'ACTIVE' || st === 'VERIFIED';
      const matchStatus =
        (statusFilter === 'ALL' && !s.receiverHidden) ||
        (statusFilter === 'Active' && isAccepted && !s.receiverHidden) ||
        (statusFilter === 'Hidden' && s.receiverHidden === true);

      return matchSearch && matchGrade && matchSection && matchBranch && matchSchool && matchSender && matchDate && matchStatus;
    });
  }, [students, search, gradeFilter, sectionFilter, branchFilter, schoolFilter, statusFilter, senderFilter, selectedDate]);

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
      activeSenders: distinctSenders.length,
      latestTransmitted
    };
  }, [students, distinctSenders, liveServerStats]);

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
      const sName = (st.school || 'YMS 1').trim();
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
  }, [currentSchoolFolder]);

  const currentFolderActiveGrade = useMemo(() => {
    if (folderGradeTab === 'ALL') return null;
    return currentSchoolGradeHierarchy.find(g => g.baseGrade.toLowerCase() === folderGradeTab.toLowerCase()) || null;
  }, [currentSchoolGradeHierarchy, folderGradeTab]);

  const currentFolderStudents = useMemo(() => {
    if (!currentSchoolFolder) return [];
    let list = currentSchoolFolder.students;
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
        (s.phone || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentSchoolFolder, folderGradeTab, folderSectionTab, folderSearchQuery]);

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
          'Phone': s.phone || '',
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
          `"${s.phone || ''}"`,
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

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#0B1118] tracking-tight">
              Student Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/40 font-mono">
              {filtered.length.toLocaleString()} Records
            </span>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 0. Register a record the field missed */}
          <button
            type="button"
            onClick={handleOpenAddStudent}
            className="py-2 px-3.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-[#062404] text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Add a new student to the directory"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>

          {/* 1. Mistake Analyzer */}
          <button
            type="button"
            onClick={() => setIsMistakeModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Scan student directory for mistakes & anomalies"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Mistake Analyzer</span>
            {mistakeItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-black">
                {mistakeItems.length}
              </span>
            )}
          </button>

          {/* 2. Excel (.xlsx) */}
          <button
            type="button"
            onClick={() => exportExcel(false)}
            className="py-2 px-3.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#0B1118] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* 3. Export CSV */}
          <button
            type="button"
            onClick={() => exportCsv(false)}
            className="py-2 px-3.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#0B1118] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Export CSV</span>
          </button>

          {/* 4. Export Photo ZIP */}
          <button
            type="button"
            onClick={() => downloadSelectedPhotosZip()}
            className="py-2 px-3.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#0B1118] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Download student photos archive (ZIP)"
          >
            <Archive className="w-4 h-4 text-[#256002]" />
            <span>Export Photo ZIP</span>
          </button>

          {/* 5. Refresh */}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1118] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* 6. Cloud Sync */}
          <button
            type="button"
            onClick={handleCloudSync}
            disabled={isLoading}
            className="py-2 px-3.5 rounded-xl bg-[#0B1118] hover:bg-[#1A2533] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Synchronize registry with cloud master server"
          >
            <Cloud className="w-3.5 h-3.5 text-[#9EE617]" />
            <span>Cloud Sync</span>
          </button>
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
              className="text-[11px] text-slate-400 hover:text-white underline ml-1 cursor-pointer"
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
              className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B1118] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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

      {/* Real-Time Live Transmission & Amounts Telemetry Banner */}
      <div className="bg-gradient-to-r from-[#0B1118] via-[#111A24] to-[#0B1118] border border-[#223126] rounded-2xl p-4 text-white shadow-lg space-y-3 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-20 bg-[#85E510]/10 blur-2xl pointer-events-none rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#85E510] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#85E510]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase text-[#85E510] font-heading flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Live Real-Time Telemetry &amp; Field Bus Console
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 font-mono">
                  Realtime Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Connected to global field sender bus &bull; Synchronizing live transmissions across all school campuses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Infrastructure Pills */}
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-xl border border-slate-700/80 text-[11px]">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">R2:</span>
              <strong className="text-white font-mono">{liveServerStats.r2Bucket}</strong>
            </div>

            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-xl border border-slate-700/80 text-[11px]">
              <Activity className="w-3.5 h-3.5 text-[#85E510]" />
              <span className="text-slate-300">Ping:</span>
              <strong className="text-emerald-400 font-mono">{liveServerStats.queryLatencyMs}ms</strong>
            </div>

            <button
              type="button"
              onClick={fetchLiveTelemetry}
              disabled={isRefreshingTelemetry}
              className="flex items-center gap-1.5 bg-[#0B1118] hover:bg-slate-800 text-[#85E510] px-3 py-1 rounded-xl border border-[#85E510]/30 text-[11px] font-bold transition-all cursor-pointer"
              title="Refresh Live Telemetric Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />
              <span>{isRefreshingTelemetry ? 'Pinging...' : 'Sync'}</span>
            </button>

            {/* Direct Link to Telemetric Velocity & Fleet Cockpit */}
            <Link
              to="/receiver/telemetric-velocity"
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#85E510]/20 hover:bg-[#85E510]/30 text-[#85E510] hover:text-white border border-[#85E510]/40 text-[11px] font-bold transition-all"
              title="Open Full Telemetric Velocity & Fleet Cockpit"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Fleet Velocity Cockpit &rarr;</span>
            </Link>

            {telemetryAmounts.latestTransmitted ? (
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-xl border border-slate-700/80 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-[#85E510]" />
                <span className="text-slate-300">Last Received:</span>
                <strong className="text-white font-mono">
                  {telemetryAmounts.latestTransmitted.createdAt
                    ? new Date(telemetryAmounts.latestTransmitted.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Just now'}
                </strong>
                <span className="text-slate-400">({telemetryAmounts.latestTransmitted.senderName || 'Sender'})</span>
              </div>
            ) : (
              <span className="text-slate-400 text-xs">Waiting for incoming transmission...</span>
            )}
          </div>
        </div>

        {/* 4 Metric Amount Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Received</span>
              <UsersIcon className="w-3.5 h-3.5 text-[#85E510]" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black font-heading text-white">
              {telemetryAmounts.total.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {pagedStudents.length.toLocaleString()} on this page &bull; {sortedFiltered.length.toLocaleString()} in view &bull; {hiddenCount.toLocaleString()} hidden
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Transmitted Today</span>
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black font-heading text-[#85E510] flex items-center gap-2">
              <span>{telemetryAmounts.today.toLocaleString()}</span>
              {telemetryAmounts.today > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#85E510]/20 text-[#85E510] font-black border border-[#85E510]/40 font-mono">
                  +{telemetryAmounts.today} New
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Live 0-start daily intake count</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Biometric Photos Encoded</span>
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-1.5">
              <span>{telemetryAmounts.withPhoto.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-normal font-mono">
                ({telemetryAmounts.total > 0 ? ((telemetryAmounts.withPhoto / telemetryAmounts.total) * 100).toFixed(1) : 100}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Verified portrait photos in R2</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Fleet Velocity &amp; Senders</span>
              <Radio className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-black font-heading text-white flex items-baseline gap-1.5">
              <span>{telemetryAmounts.activeSenders} Stations</span>
              <span className="text-xs text-[#85E510] font-mono font-bold">
                {telemetryAmounts.activeSenders > 0
                  ? `${(telemetryAmounts.today / telemetryAmounts.activeSenders).toFixed(1)} rec/sender today`
                  : 'no registered senders'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Field operator fleet streaming</div>
          </div>
        </div>
      </div>

      {!isServerApiOnline() && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-[#1b0d10] dark:border-rose-800 px-4 py-3">
          <div className="text-xs text-rose-900 dark:text-rose-200 font-semibold leading-relaxed">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-[#1a1608] dark:border-amber-700 px-4 py-3">
          <div className="text-xs text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
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
        <div className="rounded-2xl border border-sky-300 bg-sky-50 dark:bg-[#0b1620] dark:border-sky-800 px-4 py-2.5 text-[11px] text-sky-900 dark:text-sky-200 font-semibold">
          Server counts incomplete{liveServerStats.statsMissing.length > 0 ? ` (${liveServerStats.statsMissing.join(', ')})` : ''}
          &mdash; those figures are reused from the last complete snapshot, not measured now.
        </div>
      )}

      {/* View Switcher: Master Table vs School Directory Folders */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setViewMode('table'); setSelectedSchoolFolder(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[#0B1118] text-[#9EE617] shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Master Directory Table ({sortedFiltered.length.toLocaleString()})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('folders')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'folders'
                ? 'bg-[#0B1118] text-[#9EE617] shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FolderOpen className="w-4 h-4 text-[#9EE617]" />
            <span>📁 School Directory Folders ({schoolFolders.length} Schools)</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#9EE617]/20 text-[#256002] text-[10px] font-black border border-[#9EE617]/30">
              NEW
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Cloud className="w-3.5 h-3.5 text-blue-500" />
          <span>Cloudflare R2 Storage: <strong className="text-slate-800">{liveServerStats.r2Bucket}</strong></span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            100% Zero-Drop Active
          </span>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          {/* Top Calendar Date Filter */}
      <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#256002]" />
          </div>
          <div>
            <span className="text-xs font-black text-[#0B1118]">Transmit Date Filter</span>
            <p className="text-[10px] text-slate-500 font-medium">Filter directory records by day transmitted</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
            className="h-9 rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] px-3 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none cursor-pointer"
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Clear Date
            </button>
          )}
          <button
            type="button"
            onClick={() => setCalendarNoteModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-[#0B1118] hover:bg-slate-800 text-xs font-bold text-[#9EE617] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Note taking for pausing bulked students"
          >
            <span>Pause Bulked Note</span>
            {pausedIds.size > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-black rounded-full">
                {pausedIds.size}
              </span>
            )}
          </button>
        </div>
      </div>



      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                className="absolute right-3 top-2.5 text-slate-400 hover:text-black cursor-pointer"
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

        {/* Dynamic Grade & Sub-Sections Navigation Bar */}
        {activeGradeItem ? (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-slate-50 border border-emerald-200/90 rounded-2xl shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950 mr-1">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>{activeGradeItem.displayLabel} Sub-Sections:</span>
            </div>
            <button
              type="button"
              onClick={() => { setSectionFilter('ALL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                sectionFilter === 'ALL'
                  ? 'bg-[#0B1118] text-[#9EE617] shadow-sm ring-1 ring-[#9EE617]/50'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-100/50 hover:border-emerald-300'
              }`}
            >
              All {activeGradeItem.displayLabel} ({activeGradeItem.totalCount})
            </button>
            {activeGradeItem.sections.map(sec => (
              <button
                key={sec.section}
                type="button"
                onClick={() => { setSectionFilter(sec.section); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectionFilter === sec.section
                    ? 'bg-[#256002] text-white shadow-sm ring-2 ring-[#9EE617]/60'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-100/50 hover:border-emerald-300'
                }`}
              >
                <span>Section {sec.section}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  sectionFilter === sec.section ? 'bg-[#9EE617] text-[#0B1118]' : 'bg-slate-100 text-slate-700'
                }`}>
                  {sec.count}
                </span>
              </button>
            ))}
            {activeGradeItem.noSectionCount > 0 && (
              <button
                type="button"
                onClick={() => { setSectionFilter('NONE'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectionFilter === 'NONE'
                    ? 'bg-[#256002] text-white shadow-sm ring-2 ring-[#9EE617]/60'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-100/50 hover:border-emerald-300'
                }`}
              >
                <span>General / Unassigned</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  sectionFilter === 'NONE' ? 'bg-[#9EE617] text-[#0B1118]' : 'bg-slate-100 text-slate-700'
                }`}>
                  {activeGradeItem.noSectionCount}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { setGradeFilter('ALL'); setSectionFilter('ALL'); setPage(1); }}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Clear Grade Filter
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
            <span className="text-[11px] font-black text-slate-500 whitespace-nowrap flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Quick Grade & Sub-Sections:
            </span>
            {gradeHierarchy.map(g => (
              <button
                key={g.baseGrade}
                type="button"
                onClick={() => { setGradeFilter(g.baseGrade); setSectionFilter('ALL'); setPage(1); }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700 whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
                title={`${g.displayLabel}: ${g.totalCount} students across ${g.sections.length} sections`}
              >
                <span>{g.displayLabel}</span>
                <span className="text-[10px] text-slate-600 bg-slate-100 px-1 py-0.2 rounded font-mono">
                  {g.totalCount}
                </span>
                {g.sections.length > 0 && (
                  <span className="text-[9px] font-black text-emerald-800 bg-emerald-100/80 px-1 py-0.2 rounded">
                    {g.sections.map(s => s.section).join(',')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Everyday Calendar Data Viewer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#0B1118]">
              <Calendar className="w-4 h-4 text-[#256002]" />
              <span>Everyday Calendar Viewer:</span>
            </div>

            {/* Native Date Picker */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] cursor-pointer"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => { setSelectedDate(''); setPage(1); }}
                  className="ml-1 p-1 text-slate-400 hover:text-black rounded-lg hover:bg-slate-100"
                  title="Clear calendar date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Calendar Date Chips */}
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => { setSelectedDate(''); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !selectedDate
                    ? 'bg-[#0B1118] text-[#9EE617] shadow-xs'
                    : 'bg-[#F1F5F9] text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Days ({students.length})
              </button>
              {distinctDates.slice(0, 6).map(dt => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => { setSelectedDate(dt); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedDate === dt
                      ? 'bg-[#9EE617] text-[#0B1118] shadow-xs'
                      : 'bg-[#F1F5F9] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{dt}</span>
                  <span className="text-[10px] font-black opacity-80">({calendarDateCounts[dt]})</span>
                </button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="text-xs font-bold text-[#256002] bg-[#9EE617]/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#256002] animate-pulse" />
              <span>Viewing {filtered.length} student(s) registered on {selectedDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Student Directory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
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
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
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
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
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
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
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
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-[#0B1118]">No students found</div>
                    <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search query or branch filters</p>
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
                            className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-[#CBD5E1] shrink-0 cursor-pointer group shadow-2xs"
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
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium mt-0.5">
                              <span>{s.sex || 'Male'}</span>
                              <span>&bull;</span>
                              <span className="text-[#366804] font-semibold">{s.status || 'Accepted'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B1118] text-[11px] whitespace-nowrap">
                        {s.studentId}
                      </td>

                      {/* Grade & Section */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[#0B1118] font-bold text-[11px]">
                          {getGradeDisplay(s)}
                        </span>
                      </td>

                      {/* School & Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#0B1118] truncate max-w-[160px]">{s.school || 'YMS'}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#366804]" />
                          <span className="font-semibold text-slate-700">{getStudentBranch(s)}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {s.phone || '-'}
                      </td>

                      {/* Blood Type */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
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
                          <span className="text-[10px] text-slate-400 font-medium">No Bus</span>
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#85E510]/20 text-slate-500 hover:text-[#1D5102] font-medium text-[10px] cursor-pointer"
                            title="Unbulked (Click to bulk)"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>Unbulked</span>
                          </span>
                        )}
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {s.senderName || 'Field Sender'}
                        </span>
                      </td>

                      {/* Date Transmitted */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const iso = s.createdAt || (s as any).registrationDate || s.updatedAt || s.recordHistory?.[0]?.date;
                          if (!iso) return <span className="font-mono text-[10px] text-slate-400">—</span>;
                          try {
                            const d = new Date(iso);
                            if (isNaN(d.getTime())) return <span className="font-mono text-[10px] text-slate-600">{iso}</span>;
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
                              <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                                <div className="flex items-center gap-1.5 font-bold text-[#0B1118]">
                                  <Calendar className="w-3 h-3 text-[#256002]" />
                                  <span>{dateStr}</span>
                                  {isRecent && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-[#9EE617] text-[#062404] text-[9px] font-black animate-pulse">
                                      {diffMinutes === 0 ? 'Just now' : `${diffMinutes}m ago`}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                                  <Clock className="w-3 h-3 text-slate-400" />
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
                            return <span className="font-mono text-[10px] text-slate-600">{iso}</span>;
                          }
                        })()}
                      </td>

                      {/* QR Code Action (Token strictly studentId) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => downloadSingleQr(s, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#9EE617]/20 hover:text-[#256002] text-slate-700 transition-colors cursor-pointer"
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
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="View Student Details Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Crop & Edit Photo (3:4 Portrait default) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenPhotoEditor(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Crop & Edit Student Photograph (3:4 Portrait)"
                          >
                            <Crop className="w-4 h-4" />
                          </button>

                          {/* Download Photo */}
                          <button
                            type="button"
                            onClick={(e) => downloadSinglePhoto(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Download Biometric Photograph"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Edit Student Data (excludes photo & qr) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditData(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
          <div className="text-slate-600 font-medium">
            Showing <span className="font-bold text-[#0B1118]">{pagedStudents.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-[#0B1118]">{Math.min(filtered.length, page * pageSize)}</span> of{' '}
            <span className="font-bold text-[#0B1118]">{filtered.length.toLocaleString()}</span> entries{' '}
            <span className="text-slate-500">({pageSize} per page)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
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
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
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
          {!selectedSchoolFolder ? (
            /* ALL SCHOOLS FOLDER OVERVIEW */
            <div className="space-y-4">
              {/* Folder Section Header & Controls */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-[#256002]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-sm text-[#0B1118]">
                        School Compartment Folders ({filteredSchoolFolders.length})
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Every school is organized into a dedicated folder with verified biometric photos, grades, and exact transmission timestamps
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      Total Active Folders: <strong className="text-slate-900">{filteredSchoolFolders.length} Schools</strong>
                    </span>
                  </div>
                </div>

                {/* Search & Branch Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                      placeholder="Search school folders (e.g. Sena Yerosen, 1234, YMS 1, Debebech)..."
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                    />
                    {folderSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFolderSearchQuery('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-black cursor-pointer"
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

                  return (
                    <div
                      key={folder.schoolName}
                      className="bg-white border border-[#E2E8F0] hover:border-[#9EE617] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
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

                          <div className="w-8 h-8 rounded-xl bg-[#F8FAF9] group-hover:bg-[#9EE617]/20 border border-[#E2E8F0] group-hover:border-[#9EE617]/50 flex items-center justify-center transition-colors">
                            <Folder className="w-4 h-4 text-slate-600 group-hover:text-[#256002]" />
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
                            {folder.totalStudents.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">Students Enrolled</span>
                        </div>

                        {/* Photo Verification Rate */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-600">
                            <span>Biometric Verification</span>
                            <span className={folder.photoPercent >= 90 ? 'text-emerald-600 font-black' : 'text-slate-600'}>
                              {folder.photoPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
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
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold"
                              >
                                {g.grade}: {g.count}
                              </span>
                            ))}
                            {folder.grades.length > 4 && (
                              <span className="px-1 py-0.5 text-slate-400 text-[10px] font-bold">
                                +{folder.grades.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 text-[11px] text-slate-400 italic">
                            Awaiting field registrations
                          </div>
                        )}

                        {/* Last Transmitted */}
                        {folder.latestTransmitted && (
                          <div className="mt-2.5 text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Last sent: {new Date(folder.latestTransmitted).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSchoolFolder(folder.schoolName);
                            setFolderGradeTab('ALL');
                            setFolderSearchQuery('');
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#0B1118] hover:bg-slate-800 text-[#9EE617] text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
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
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="View this school in Master Table"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        {folder.totalStudents > 0 && (
                          <button
                            type="button"
                            onClick={() => downloadSelectedPhotosZip(folder.students)}
                            className="p-2 rounded-xl bg-[#9EE617]/20 hover:bg-[#9EE617]/30 text-[#256002] transition-colors cursor-pointer"
                            title="Download All Photos for this School (.ZIP)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSchoolFolder(null)}
                        className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View in Master Table</span>
                      </button>

                      {currentSchoolFolder.totalStudents > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadSelectedPhotosZip(currentFolderStudents)}
                          className="py-2 px-3.5 rounded-xl bg-[#0B1118] hover:bg-slate-800 text-[#9EE617] text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Download Folder Photos (ZIP)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Folder Sub-Header Info */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 pt-1 border-t border-slate-100">
                    <div>
                      Total Students: <strong className="text-slate-900">{currentSchoolFolder.totalStudents.toLocaleString()}</strong>
                    </div>
                    <div>&bull;</div>
                    <div>
                      Verified Biometric Photos: <strong className="text-emerald-700">{currentSchoolFolder.withPhotoCount.toLocaleString()} ({currentSchoolFolder.photoPercent}%)</strong>
                    </div>
                    {currentSchoolFolder.latestTransmitted && (
                      <>
                        <div>&bull;</div>
                        <div className="text-slate-500">
                          Latest Entry: <strong className="text-slate-800 font-mono">{new Date(currentSchoolFolder.latestTransmitted).toLocaleString()}</strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Grade Compartment Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => { setFolderGradeTab('ALL'); setFolderSectionTab('ALL'); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                        folderGradeTab === 'ALL'
                          ? 'bg-[#0B1118] text-[#9EE617]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      All Grades ({currentSchoolFolder.totalStudents})
                    </button>

                    {currentSchoolGradeHierarchy.map(g => (
                      <button
                        key={g.baseGrade}
                        type="button"
                        onClick={() => { setFolderGradeTab(g.baseGrade); setFolderSectionTab('ALL'); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          folderGradeTab === g.baseGrade
                            ? 'bg-[#0B1118] text-[#9EE617]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{g.displayLabel}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          folderGradeTab === g.baseGrade ? 'bg-[#9EE617] text-[#0B1118]' : 'bg-slate-200 text-slate-700'
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
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-100/50'
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
                              ? 'bg-[#256002] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-100/50'
                          }`}
                        >
                          <span>Section {sec.section}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                            folderSectionTab === sec.section ? 'bg-[#9EE617] text-[#0B1118]' : 'bg-slate-100 text-slate-600'
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
                              ? 'bg-[#256002] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-100/50'
                          }`}
                        >
                          <span>General ({currentFolderActiveGrade.noSectionCount})</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Search inside folder */}
                  <div className="relative pt-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
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
                        className="absolute right-3 top-3 text-slate-400 hover:text-black cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Student Photo Card Grid inside Folder */}
                {currentFolderStudents.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center">
                      <Folder className="w-8 h-8 text-slate-400" />
                    </div>
                    <h4 className="font-heading font-black text-sm text-[#0B1118]">
                      {currentSchoolFolder.totalStudents === 0
                        ? `Folder for ${currentSchoolFolder.schoolName} is ready!`
                        : 'No students match this grade or search filter'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {currentSchoolFolder.totalStudents === 0
                        ? `This school is active in the ${currentSchoolFolder.branch} branch. Senders can select "${currentSchoolFolder.schoolName}" in the registration console to begin transmitting student records.`
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
                    {currentFolderStudents.map(s => {
                      const photoSources = getPhotoCandidates(s);
                      const photoUrl = photoSources[0] || null;
                      const hasRealPhoto = s.photoIntegrityStatus === 'PHOTO_VERIFIED' ||
                        (photoUrl && !photoUrl.includes('avatar') && !photoUrl.includes('placeholder'));

                      return (
                        <div
                          key={s.studentId}
                          onClick={(e) => handleOpenDetail(s, e)}
                          className="bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#9EE617] p-2.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
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
                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[#9EE617] text-[9px] font-black tracking-tight border border-[#9EE617]/40">
                                  R2
                                </span>
                              )}

                              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between items-center">
                                <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold">
                                  {s.grade}
                                </span>
                              </div>
                            </div>

                            {/* Name & ID */}
                            <h5 className="font-heading font-black text-xs text-[#0B1118] truncate group-hover:text-[#256002] transition-colors" title={s.fullName}>
                              {s.fullName}
                            </h5>
                            <div className="font-mono text-[10px] font-bold text-slate-500">
                              {s.studentId}
                            </div>

                            {/* Exact Date Transmitted */}
                            <div className="mt-1 text-[9px] text-slate-400 font-mono truncate" title={s.createdAt || ''}>
                              {s.createdAt ? new Date(s.createdAt).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Saved'}
                            </div>
                          </div>

                          {/* Action Row */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => handleOpenPhotoEditor(s, e)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Edit/Crop Photo"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenEditData(s, e)}
                              className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              title="Edit Student Data"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => downloadSinglePhoto(s, e)}
                              className="p-1 rounded text-slate-400 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors"
                              title="Download Photo"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => downloadSingleQr(s, e)}
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="Download QR Code (PNG)"
                            >
                              <QrIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* =========================================================================
          SLIDE-OVER DRAWER: STUDENT PROFILE DETAILS (Exact Match to User's Screenshot)
         ========================================================================= */}
      {isDetailDrawerOpen && detailStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#dce7e1] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#eef5f1] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-[#080808]">Student Profile Details</h3>
                <span className="text-[11px] font-mono text-[#8fe617] font-semibold">{detailStudent.studentId}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailDrawerOpen(false)}
                className="rounded-lg p-1 text-[#6b7771] hover:text-[#080808] hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Studio Portrait Showcase Card */}
              <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl border border-[#dce7e1] bg-[#f8fafc]">
                <span className="text-xs font-mono uppercase tracking-wider text-[#6b7771] font-semibold">
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
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/drawerPhoto:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold pointer-events-none">
                    <Crop className="h-6 w-6 text-[#8fe617]" />
                    <span className="bg-black/60 px-2.5 py-1 rounded-full text-[11px] font-mono border border-white/20">Click to Edit Photo</span>
                  </div>
                </div>

                {/* Action Buttons Below Portrait */}
                <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                  <button
                    type="button"
                    onClick={() => downloadSinglePhoto(detailStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white border border-[#dce7e1] text-[#080808] hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-[#8fe617]" />
                    <span>Download Original Portrait (.jpg)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPhotoEditor(detailStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl bg-[#8fe617] text-[#062404] hover:bg-[#7ecc10] transition-all shadow-xs cursor-pointer"
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
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white border border-[#dce7e1] text-[#080808] hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Link2 className="h-3.5 w-3.5 text-[#8fe617]" />
                    <span>Copy Direct Image Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenPhotoEditor(detailStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-white border border-[#dce7e1] text-[#080808] hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-500" />
                    <span>Replace Photo File Directly</span>
                  </button>

                  <div className="text-[11px] font-mono text-[#6b7771] text-center truncate pt-0.5">
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
                  <span className="text-[#080808] font-semibold text-xs">{detailStudent.school || "YMS"}</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[#6b7771] text-xs font-medium">Blood Group:</span>
                  <span className="text-[#43A047] font-black font-mono text-xs">
                    {detailStudent.bloodType && detailStudent.bloodType.trim() ? detailStudent.bloodType : "AB+"}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-[#6b7771] text-xs font-medium">Data Sent By:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[#8fe617]/15 text-[#366804] border border-[#8fe617]/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                    {detailStudent.senderName || (detailStudent as any).senderId || "miskrdires12"}
                  </span>
                </div>

                {/* Real Verified QR Code Preview Card */}
                <div className="pt-3 border-t border-[#dce7e1] flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#080808] flex items-center gap-1.5">
                      <QrIcon className="h-4 w-4 text-[#8fe617]" />
                      <span>Real Verified QR Code</span>
                    </div>
                    <div className="text-[10px] text-[#6b7771] font-mono">
                      Token strictly {detailStudent.studentId}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => downloadSingleQr(detailStudent)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-[#8fe617] text-[#062404] hover:bg-[#7ecc10] transition-all shadow-xs cursor-pointer"
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
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-heading font-black text-base text-[#0B1118]">
                  {editingDataStudent ? 'Edit Student Information' : 'Add Student to Directory'}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editingDataStudent
                    ? `${editingDataStudent.studentId} • Academic & Contact metadata`
                    : `${newStudentId} • Academic & Contact metadata`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => (isNewStudentMode ? closeAddStudentModal() : setIsEditModalOpen(false))}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
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
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono font-bold text-xs"
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
                          : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
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
                          : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
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
                    <span className="text-[10px] text-slate-400 font-normal">Auto 09/07 &rarr; +2519/+2517 (blank if empty)</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                    onBlur={() => setEditPhone(formatPhoneNumber(editPhone))}
                    placeholder="e.g. 0911223344"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono font-bold text-xs"
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
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-xs"
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
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  {addStatus.text}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => (isNewStudentMode ? closeAddStudentModal() : setIsEditModalOpen(false))}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-slate-50 cursor-pointer"
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
                  className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] disabled:opacity-60 text-[#062404] text-xs font-black shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B1118] text-white border border-[#2D3748] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center text-[#9EE617]">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-white">
                  {progressModal.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Please wait while files are processed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-slate-400 truncate max-w-[240px]">{progressModal.statusText}</span>
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
              <div className="text-[11px] text-slate-400 flex justify-between">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#0B1118]">Delete Confirmation</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-300 overflow-hidden shrink-0">
                  <img
                    src={getPhotoUrl(deleteTarget.capturedPhoto || deleteTarget.photoBase64 || deleteTarget.photoPath || deleteTarget.previewPath) || DEFAULT_AVATAR}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-[#0B1118]">{deleteTarget.fullName}</div>
                  <div className="font-mono text-[#64748B] text-[11px]">{deleteTarget.studentId}</div>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#0B1118]">
                  Delete {selectedIds.size} Selected Students
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl">
                <div className="font-bold text-[#0B1118] text-sm">
                  {selectedIds.size} student record{selectedIds.size === 1 ? '' : 's'} selected
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
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
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
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
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {isBulkDeleting ? 'Erasing records...' : `Permanently Delete ${selectedIds.size} Records`}
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-[#CBD5E1] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
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
                className="w-9 h-9 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 transition-all cursor-pointer"
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
                      ? 'bg-[#9EE617] border-black text-black font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
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
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-300 text-slate-700'
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
                      ? 'bg-rose-100 border-rose-400 text-rose-950 font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-rose-300 text-slate-700'
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
                      ? 'bg-purple-100 border-purple-400 text-purple-950 font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-purple-300 text-slate-700'
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
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
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
                    <div className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-12 h-12 text-[#85E510] mx-auto mb-2 stroke-[1.8]" />
                      <div className="font-heading font-black text-base text-[#0B1118]">No Active Anomalies Found</div>
                      <p className="text-xs text-slate-500 mt-1">All student records match quality standards.</p>
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
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Student Photo */}
                        <div
                          onClick={() => handleOpenPhotoEditor(s)}
                          className="w-12 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-300 shrink-0 cursor-pointer group relative shadow-2xs"
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
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
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

                          <div className="text-[11px] text-slate-600 font-medium">
                            {m.detail}
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{getGradeDisplay(s)}</span>
                            <span>&bull;</span>
                            <span>{s.school || 'YMS'}</span>
                            {s.phone && (
                              <>
                                <span>&bull;</span>
                                <span className="font-mono">{s.phone}</span>
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
                          className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Edit academic and contact info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Data</span>
                        </button>

                        {/* Dismiss */}
                        <button
                          type="button"
                          onClick={() => setResolvedMistakeKeys(prev => new Set([...prev, m.key]))}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
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
              <span className="text-xs text-slate-500 font-medium">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#256002]" />
                <h3 className="font-heading font-black text-sm text-[#0B1118]">Pause Bulked Students Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setCalendarNoteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter pause reason or notes for selected bulked students:
            </p>

            <textarea
              value={calendarPauseNote}
              onChange={(e) => setCalendarPauseNote(e.target.value)}
              placeholder="e.g. Card printer maintenance, pending ID badge validation, student reshoot needed..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#9EE617]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCalendarNoteModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
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
    </div>
  );
};
