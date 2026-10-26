import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, RotateCw, ZoomIn, ZoomOut,
  Upload, UserCheck, ArrowRight, ShieldCheck, Sparkles, X, Sliders, Crop,
  ChevronDown, ChevronUp, Image as ImageIcon, Check, Printer, SwitchCamera,
  TrendingUp, Calendar, Clock, BarChart2, MapPin, Scissors
} from 'lucide-react';
import {
  getStudents, addStudent, updateStudent, getSchools, getCurrentUser, getTasks,
  DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP, getSenderMetrics, SenderMetrics,
  generateStudentQrToken, getCorrectionLogs, CorrectionLog, getAuthHeaders,
  incrementSenderLiveCaptures, getPhotoUrl, refreshFleetTelemetry, refreshSenderTotalsFromPayroll,
  dropLocalStudentCopy
} from '@/lib/store';
import { queueOfflineOperation, cloudJsonResponse } from '@/lib/offlineQueue';
import { Student } from '@/types';
import { PhoneCropModal } from '@/components/PhoneCropModal';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { R2_PUBLIC_BASE_URL, fetchDeliveryReceipts, syncStationId, DeliveryReceipt } from '@/lib/syncEngine';
import { parseGradeAndSection } from '@/lib/gradeUtils';

// How long the sender keeps asking the cloud which stations applied its last send. Receivers on
// the bus answer within a second or two; the window covers a station whose tab was just opening.
const RECEIPT_POLL_MS = 3000;
const RECEIPT_WATCH_MS = 120000;
const RECEIPT_SLOW_POLL_MS = 20000;
const RECEIPT_STOP_MS = 20 * 60 * 1000;

// The bus header reports how the instant push went, not whether the record arrived: a station that
// the bus refused to subscribe still reads the send from the cloud within a few seconds. Naming the
// refusal separately keeps a throttled third party from being reported as a failed delivery.
function busFailureReason(busState: string): string {
  if (!busState.startsWith('failed')) return '';
  if (busState.includes('bus-limit')) return 'the sync bus is at its free subscription limit';
  if (busState.includes('timeout')) return 'the sync bus did not answer in time';
  if (busState.includes('unreachable')) return 'the sync bus could not be reached';
  const code = busState.match(/(\d{3})$/)?.[1];
  return code ? `the sync bus rejected the push (${code})` : 'the sync bus rejected the push';
}

// Unfinished registration draft, persisted per operator so a page refresh keeps
// the completion state (and therefore the remaining-item counts) intact.
type RegistrationDraft = {
  studentId?: string;
  fullName?: string;
  sex?: string;
  grade?: string;
  phone?: string;
  bloodType?: string;
  location?: string;
  school?: string;
  schoolBusUsage?: string;
  dateOfBirth?: string;
  address?: string;
  guardianName?: string;
  emergencyContact?: string;
  nationality?: string;
};

function readRegistrationDraft(key: string): RegistrationDraft {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as RegistrationDraft : {};
  } catch {
    return {};
  }
}

export const StudentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  // getCurrentUser() parses storage and returns a brand new object on every render, so nothing
  // reactive may be keyed on it: an effect that was re-fired itself (setState of a fresh object)
  // re-ran on every render and issued a /api/telemetry/senders request each time, which is how
  // this page saturated the browser's connections and starved the student send.
  const [user] = useState(getCurrentUser);

  // Helper for generating an ID
  const generateNewId = () => {
    // 90k possible IDs against a 6k-record registry makes collisions routine, and a
    // collision used to hand the operator a taken ID that disabled the primary button.
    const taken = new Set(getStudents().map(s => (s.studentId || '').trim().toUpperCase()));
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = `SB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `SB-2026-${Date.now().toString(36).toUpperCase()}`;
  };

  const draftKey = `sb_reg_draft_${((user?.username || user?.email || 'field-operator') as string).toLowerCase().trim()}`;
  const [initialDraft] = useState<RegistrationDraft>(() => readRegistrationDraft(draftKey));

  // Form States (Phone default is strictly blank per user specification)
  const [studentId, setStudentId] = useState(() => (initialDraft.studentId || '').trim() || generateNewId());
  const [isIdTaken, setIsIdTaken] = useState(false);
  const [fullName, setFullName] = useState(() => initialDraft.fullName || '');
  const [sex, setSex] = useState<'Female' | 'Male'>(() => (initialDraft.sex === 'Male' ? 'Male' : 'Female'));
  const [grade, setGrade] = useState(() => initialDraft.grade || '');
  const [phone, setPhone] = useState(() => initialDraft.phone || '');
  const [bloodType, setBloodType] = useState(() => initialDraft.bloodType || '');
  const [location, setLocation] = useState(() => initialDraft.location || 'Addis Ababa');
  const [school, setSchool] = useState(() => {
    const forDraftBranch = BRANCH_SCHOOL_MAP[initialDraft.location || 'Addis Ababa'] || [];
    const restored = (initialDraft.school || '').trim();
    if (restored && (forDraftBranch.length === 0 || forDraftBranch.includes(restored))) return restored;
    return forDraftBranch[0] || 'YMS';
  });
  const [schoolBusUsage, setSchoolBusUsage] = useState<'Yes' | 'No' | ''>(
    () => (initialDraft.schoolBusUsage === 'Yes' || initialDraft.schoolBusUsage === 'No' ? initialDraft.schoolBusUsage as 'Yes' | 'No' : '')
  );
  const [correctionNotices, setCorrectionNotices] = useState<CorrectionLog[]>([]);

  // Extra Details (Expandable)
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(() => initialDraft.dateOfBirth || '');
  const [address, setAddress] = useState(() => initialDraft.address || 'Addis Ababa');
  const [guardianName, setGuardianName] = useState(() => initialDraft.guardianName || '');
  const [emergencyContact, setEmergencyContact] = useState(() => initialDraft.emergencyContact || '');
  const [nationality, setNationality] = useState(() => initialDraft.nationality || 'Ethiopian');

  // Camera & Photo States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Photo Editor & Crop Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorActiveTab, setEditorActiveTab] = useState<'Crop' | 'Brightness' | 'Contrast' | 'Saturation' | 'Rotate'>('Crop');
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:5' | '2:3'>('3:4');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Sender Transmission Metrics (Daily, Weekly, Monthly, Total)
  const [senderMetrics, setSenderMetrics] = useState<SenderMetrics>(() => {
    const cur = getCurrentUser() || user;
    return getSenderMetrics(cur?.username || cur?.email || '');
  });

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);
  // false = the record lives on this station and in the outbox only; the green
  // "cloud verified" banner must not be shown for it.
  const [cloudVerified, setCloudVerified] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // A send that never reached the cloud cannot be allowed to pass unnoticed. The operator is shown a
  // prompt naming the record that is still only on this station, with the resend action on it.
  const [resendPrompt, setResendPrompt] = useState<{ studentId: string; fullName: string } | null>(null);
  // The one thing said when the cloud confirms a write: that it went, and on what date.
  const [sentPopupAt, setSentPopupAt] = useState<string | null>(null);
  // What the background outbox did since the last look, announced rather than silently applied.
  const [outboxNews, setOutboxNews] = useState<{ synced: number; remaining: number } | null>(null);
  // Receiver confirmation for the send that just finished: the cloud answers with the stations
  // that applied the bus record into their own directory, so a green banner can name who holds it
  // instead of asserting a delivery nobody checked.
  const [receiverReceipts, setReceiverReceipts] = useState<DeliveryReceipt[]>([]);
  const [receiptsWatching, setReceiptsWatching] = useState(false);
  // What the sync bus answered when the edge published this send.
  const [busState, setBusState] = useState('');
  // Which store the edge confirmed holding the row — it names the one that actually answered.
  const [durableStore, setDurableStore] = useState('the cloud');
  const [stationId] = useState(syncStationId);
  // Whether a send made from this page is still unlanded. A background flush of some other page's
  // outbox must not throw a "successfully sent" modal over a form the operator is halfway through.
  const unlandedSendRef = useRef(false);
  // The relay pushes a receiver's confirmation the moment the edge records it; this is the poll the
  // nudge fires, so the banner can be driven by evidence arriving rather than by a timer expiring.
  const receiptPollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const sid = (submittedStudent?.studentId || '').trim();
    if (!cloudVerified || !sid) return;
    const selfStation = syncStationId();
    const startedAt = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const found = await fetchDeliveryReceipts(sid);
      if (stopped) return;
      // This station's own copy is not a receiver confirmation, it is the sender echoed back.
      const others = found.filter(r => r.station !== selfStation);
      if (others.length > 0) setReceiverReceipts(others);
      const elapsed = Date.now() - startedAt;
      if (elapsed >= RECEIPT_WATCH_MS) setReceiptsWatching(false);
      if (elapsed >= RECEIPT_STOP_MS) return;
      // Watching continues past the fast window at a slower cadence: a receiver that was still
      // booting, or one the browser only wakes every half minute, confirms a real delivery, and the
      // operator should see that rather than a verdict that closed before the evidence arrived.
      timer = setTimeout(poll, elapsed >= RECEIPT_WATCH_MS ? RECEIPT_SLOW_POLL_MS : RECEIPT_POLL_MS);
    };

    setReceiverReceipts([]);
    setReceiptsWatching(true);
    receiptPollRef.current = poll;
    poll();

    return () => {
      stopped = true;
      if (receiptPollRef.current === poll) receiptPollRef.current = null;
      if (timer) clearTimeout(timer);
    };
  }, [cloudVerified, submittedStudent?.studentId]);

  // A confirmation that lands over the relay socket is read immediately instead of on the next tick
  // of the watch loop, so "receiver confirmed" appears when it is true rather than seconds later.
  useEffect(() => {
    const handleReceiptNudge = (event: Event) => {
      const detail = (event as CustomEvent<{ studentId?: string }>).detail;
      const sid = (submittedStudent?.studentId || '').trim();
      if (!sid || !detail || detail.studentId !== sid) return;
      receiptPollRef.current?.();
    };
    window.addEventListener('studentbridge_receipt_event', handleReceiptNudge);
    return () => window.removeEventListener('studentbridge_receipt_event', handleReceiptNudge);
  }, [submittedStudent?.studentId]);

  // The fleet rollup is a cached server-side scan, so it can still answer with the number from before
  // the send that just landed. This station's own counters are re-read from the payroll report, which
  // recomputes from the row store on every call and is the answer the salary is paid from.
  const syncOwnTotalsFromPayroll = useCallback(async () => {
    const cur = getCurrentUser() || user;
    const identifier = cur?.username || cur?.email || '';
    const refreshed = await refreshSenderTotalsFromPayroll(identifier);
    if (refreshed) setSenderMetrics(getSenderMetrics(identifier));
  }, [user]);

  // The outbox drains itself on reconnect; the operator has to hear about it. A record that quietly
  // reached the cloud is indistinguishable from one that never left the station unless the station
  // says which happened.
  useEffect(() => {
    const handleOutbox = (event: Event) => {
      const detail = (event as CustomEvent<{ synced?: number; failed?: number; remaining?: number }>).detail;
      if (!detail) return;
      const synced = detail.synced || 0;
      const remaining = detail.remaining || 0;
      setOutboxNews({ synced, remaining });
      if (synced > 0) void syncOwnTotalsFromPayroll();
      // Only while this page is still sitting on the record that had not landed. Once the operator
      // has moved to the next form the outbox keeps working in the background, and a modal whose one
      // button wipes a half-filled registration would cost them real work.
      if (synced > 0 && unlandedSendRef.current && submittedStudent) {
        unlandedSendRef.current = false;
        setSentPopupAt(new Date().toISOString());
        setSubmitError(null);
        if (remaining === 0) setResendPrompt(null);
      }
    };
    window.addEventListener('studentbridge_outbox', handleOutbox);
    return () => window.removeEventListener('studentbridge_outbox', handleOutbox);
  }, [submittedStudent]);

  const confirmedStationNames = receiverReceipts.map(r => r.stationName || r.station);
  const lastReceiptTime = receiverReceipts.length
    ? new Date(receiverReceipts[receiverReceipts.length - 1].at).toLocaleTimeString()
    : '';
  // The record's own creation stamp, so the banner never shows a clock that changes every render.
  const sentStamp = submittedStudent?.createdAt || '';
  const schools = getSchools();

  // Refresh Sender Metrics dynamically on mount, after submission, or data changes
  const refreshMetrics = useCallback(() => {
    const cur = getCurrentUser() || user;
    const identifier = cur?.username || cur?.email || '';
    setSenderMetrics(getSenderMetrics(identifier));
  }, [user]);

  useEffect(() => {
    refreshMetrics();
    // Metrics read before the fleet snapshot exists use browser-local period
    // windows; re-read after the authoritative snapshot lands so this panel
    // cannot disagree with Fleet / Telemetry Velocity totals.
    let alive = true;
    refreshFleetTelemetry().then(() => { if (alive) refreshMetrics(); });
    const loadCorrections = () => {
      const cur = getCurrentUser() || user;
      setCorrectionNotices(getCorrectionLogs(cur?.username || cur?.email));
    };
    loadCorrections();

    const handleDataChange = () => {
      refreshMetrics();
      loadCorrections();
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);
    window.addEventListener('studentbridge_correction_event', loadCorrections);
    window.addEventListener('studentbridge_sync', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    return () => {
      alive = false;
      window.removeEventListener('studentbridge_datachange', handleDataChange);
      window.removeEventListener('studentbridge_correction_event', loadCorrections);
      window.removeEventListener('studentbridge_sync', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [refreshMetrics, submittedStudent, user]);

  // Check ID Uniqueness dynamically against all students
  useEffect(() => {
    const all = getStudents();
    const taken = all.some(s => s.studentId.trim().toUpperCase() === studentId.trim().toUpperCase());
    setIsIdTaken(taken);
  }, [studentId]);

  // Persist the in-progress draft so a refresh restores the same completion state.
  // The biometric photo is excluded — it must be captured in the live session.
  useEffect(() => {
    if (submittedStudent) {
      // Delivered record: drop the draft so a reload never restores a sent student.
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      return;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        studentId, fullName, sex, grade, phone, bloodType, location, school, schoolBusUsage,
        dateOfBirth, address, guardianName, emergencyContact, nationality
      } satisfies RegistrationDraft));
    } catch {
      // Storage full or unavailable: counts still derive from live form state.
    }
  }, [draftKey, submittedStudent, studentId, fullName, sex, grade, phone, bloodType, location, school,
      schoolBusUsage, dateOfBirth, address, guardianName, emergencyContact, nationality]);

  // Remaining-item counters, derived from the fields the form actually marks
  // required (the red * items). Blood group, bus usage and Extra Details are
  // optional and are never counted.
  const informationItems = [
    { label: 'Student ID', done: studentId.trim().length > 0 && !isIdTaken },
    { label: 'Full Name', done: fullName.trim().length > 0 },
    { label: 'Sex Identification', done: sex === 'Male' || sex === 'Female' },
    { label: 'Branch Location', done: location.trim().length > 0 },
    { label: 'Assigned School', done: school.trim().length > 0 },
    { label: 'Grade / Class', done: grade.trim().length > 0 },
    { label: 'Phone Number', done: phone.trim().length > 0 }
  ];
  const informationRemaining = informationItems.filter(item => !item.done).length;
  const photoRemaining = capturedPhoto ? 0 : 1;
  const totalRemaining = informationRemaining + photoRemaining;
  const outstandingLabels = [
    ...informationItems.filter(item => !item.done).map(item => item.label),
    ...(photoRemaining ? ['Student Photograph'] : [])
  ];

  const remainingChip = (count: number, scopeLabel: string) => (
    <span
      className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border transition-colors ${
        count > 0
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-[#4D8A07] bg-[#85E510]/20 border-[#85E510]/40'
      }`}
      title={count > 0
        ? `${count} required ${scopeLabel} item${count === 1 ? '' : 's'} still unfilled`
        : `All required ${scopeLabel} items are complete`}
    >
      {count > 0 ? `${count} remaining` : '0 remaining'}
    </span>
  );

  // Name Auto-Capitalizer (First Name, Father's Name, Grandfather's Name)
  const handleNameChange = (val: string) => {
    const capitalized = val
      .split(' ')
      .map(word => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
    setFullName(capitalized);
  };


  // Ethiopian Phone Number Auto-Formatter
  // 09... -> +2519... and 07... -> +2517... (blank stays blank)
  const handlePhoneFormat = (val: string, setter: (v: string) => void) => {
    let clean = val.trim();
    if (!clean) {
      setter('');
      return;
    }
    if (clean.startsWith('09')) {
      clean = '+2519' + clean.slice(2);
    } else if (clean.startsWith('07')) {
      clean = '+2517' + clean.slice(2);
    } else if (clean.startsWith('9') && !clean.startsWith('+')) {
      clean = '+2519' + clean.slice(1);
    } else if (clean.startsWith('7') && !clean.startsWith('+')) {
      clean = '+2517' + clean.slice(1);
    }
    setter(clean);
  };

  // Available schools dynamically filtered by selected branch location
  const availableSchools = BRANCH_SCHOOL_MAP[location] || ['YMS'];

  const handleLocationChange = (newLoc: string) => {
    setLocation(newLoc);
    const schoolsForBranch = BRANCH_SCHOOL_MAP[newLoc] || [];
    if (schoolsForBranch.length > 0 && !schoolsForBranch.includes(school)) {
      setSchool(schoolsForBranch[0]);
    }
  };

  // File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
          setIsEditorOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  // Telegram-style Thumbnail Compressor (fast, ~10KB JPEG preview)
  const createTelegramThumbnail = async (base64Image: string, maxDim = 180, quality = 0.65): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(base64Image);
          }
        };
        img.onerror = () => resolve(base64Image);
        img.src = base64Image;
      } catch {
        resolve(base64Image);
      }
    });
  };

  // Student Registration Submission (Telegram Protocol: Progressive Dual-Stage Transmission)
  // Stage 1: Send lightweight thumbnail preview & student metadata immediately (<100ms, zero cellular drops)
  // Stage 2: Background upload full original HD photo directly to Cloudflare R2 bucket 'siliconlabs' with offline queue fallback
  const handleSubmit = async (e: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitError(null);

    if (isIdTaken) {
      setSubmitError('The Student ID is already taken. Please generate or specify a unique ID.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError('Student Full Name is required.');
      return;
    }

    if (!capturedPhoto || !capturedPhoto.startsWith('data:image')) {
      setSubmitError('Biometric portrait photograph is strictly required before sending. Please capture or upload a photo.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatusText('Telegram Protocol: Generating low-size preview & delivering record envelope...');

    try {
      const cleanGrade = (grade.trim() || 'General').replace(/[\/\\:*?"<>|\s]+/g, '_');
      const cleanName = fullName.trim().replace(/[\/\\:*?"<>|\s]+/g, '_') || 'Student';
      const photoKey = `${cleanGrade}/${cleanName}.jpg`;
      const expectedPhotoUrl = `/api/photos/${photoKey}`;

      const parsedGradeInfo = parseGradeAndSection(grade);
      const fullDisplayGrade = parsedGradeInfo.displayString || grade.trim();
      const resolvedSection = parsedGradeInfo.cleanSection || '';

      // Stage 1 (Telegram Protocol): Instant lightweight ~10KB thumbnail preview
      const thumbnailPreview = await createTelegramThumbnail(capturedPhoto, 180, 0.65);

      const localStudentPayload: Student & { capturedPhoto?: string; photoBase64?: string; section?: string; branch?: string } = {
        id: 'cmu-' + Date.now().toString(36),
        studentId: studentId.trim(),
        fullName: fullName.trim(),
        sex,
        grade: fullDisplayGrade,
        department: resolvedSection || undefined,
        section: resolvedSection || undefined,
        phone: phone.trim(),
        bloodType: bloodType || undefined,
        school: school.trim(),
        location,
        branch: location,
        country: 'Ethiopia',
        dateOfBirth: dateOfBirth || undefined,
        address: address || location,
        cityRegion: location,
        guardianFullName: guardianName || undefined,
        emergencyContactPhone: emergencyContact.trim(),
        schoolBusUsage,
        busUser: schoolBusUsage,
        nationality,
        photoPath: expectedPhotoUrl,
        previewPath: thumbnailPreview,
        thumbnailPath: thumbnailPreview,
        originalPhotoPath: expectedPhotoUrl,
        capturedPhoto: capturedPhoto, // Retain full resolution locally
        photoBase64: capturedPhoto,
        // The portrait exists on this station from now on; the bucket copy is only proven by
        // stage 2, so the record must not claim a stored photo before that happens.
        photoIntegrityStatus: 'PENDING_CLOUD_UPLOAD',
        qrCodeData: generateStudentQrToken({
          studentId: studentId.trim(),
          fullName: fullName.trim(),
          rollNumber: '',
          grade: fullDisplayGrade
        }),
        senderName: user?.username || 'Field Operator',
        status: 'Accepted',
        idProductionStatus: 'READY',
        createdAt: new Date().toISOString(),
        recordHistory: [
          {
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            action: 'Initial Registration',
            user: user?.username || 'Field Operator',
            role: 'Sender',
            notes: 'Biometric capture and identity registration in Sender Station (Telegram-Style Pipeline)'
          }
        ]
      };

      // 1. SHORT-RANGE TRANSMISSION: Instantly commit to local memory, localStorage & broadcast to local tabs (0ms)
      // Retrying a transmission must reuse the record that is already on this station —
      // addStudent counts every call, so re-adding the same studentId would inflate the
      // sender totals shown on the dashboards.
      const existingLocal = getStudents().find(s =>
        s.id === localStudentPayload.id ||
        (s.studentId || '').trim().toUpperCase() === localStudentPayload.studentId.trim().toUpperCase()
      );
      if (existingLocal) {
        localStudentPayload.id = existingLocal.id;
        updateStudent(existingLocal.id, localStudentPayload);
      } else {
        // Note: addStudent increments the sender live captures exactly once (+1 single count).
        addStudent(localStudentPayload);
        refreshMetrics();
      }

      // 2. LONG-RANGE TRANSMISSION: Send to Supabase PostgreSQL + Cloudflare R2
      setSubmitStatusText('Delivering record & photo to cloud repository...');
      const cloudPayload = {
        ...localStudentPayload,
        previewPath: thumbnailPreview,
        thumbnailPath: thumbnailPreview,
        capturedPhoto: thumbnailPreview, // Tiny payload avoids cellular timeouts
        photoBase64: thumbnailPreview
      };

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(cloudPayload)
        });

        const cloudSaved = res.ok ? await cloudJsonResponse(res) : null;

        if (res.status === 409 || cloudSaved?.error === 'DUPLICATE_ID') {
          // Already in the database: nothing to re-send, and the operator must not be
          // trapped on a record the cloud rejected.
          setSubmittedStudent(localStudentPayload);
          setCloudVerified(false);
          setSubmitStatusText('Student ID already exists in the cloud database — kept on this station.');
          setSubmitError('Notice: this Student ID was already recorded in the database. The local record is kept so nothing is lost; you can register the next student now.');
        } else if (cloudSaved?.duplicateFolded) {
          // The cloud already holds this child under the id it sent back. A second row under the
          // fresh id is what made a sender's count read double and paid twice for one student, so
          // this station drops its own copy and keeps the record the cloud holds. Nothing is lost:
          // the held row carries the same name, school and grade.
          dropLocalStudentCopy(localStudentPayload.id);
          const heldStudent = { ...cloudSaved } as Student;
          setSubmittedStudent(heldStudent);
          setCloudVerified(true);
          setDurableStore('Cloudflare D1');
          setBusState('folded');
          setSubmitStatusText('Already registered — counted once.');
          setSubmitError(null);
          setSentPopupAt(heldStudent.createdAt || new Date().toISOString());
          setResendPrompt(null);
          unlandedSendRef.current = false;
          refreshMetrics();
          void syncOwnTotalsFromPayroll();
        } else if (cloudSaved) {
          const confirmedStudent = {
            ...localStudentPayload,
            ...cloudSaved,
            capturedPhoto,
            photoBase64: capturedPhoto
          };
          updateStudent(localStudentPayload.id, confirmedStudent);
          // Success message appears strictly when the server answered with the saved row!
          setSubmittedStudent(confirmedStudent);
          setCloudVerified(true);
          // The edge names the store that actually holds the row, so the operator is never told
          // "delivered to Supabase" for a record that landed only in Cloudflare R2. It is read into a
          // local here because the state variable still holds the previous send's answer in this tick.
          const durable = res.headers.get('X-SB-Durable');
          const storeName = durable === 'd1' ? 'Cloudflare D1'
            : durable === 'cloudflare-r2' ? 'Cloudflare R2'
            : durable === 'supabase' ? 'Supabase'
            : 'the cloud';
          setDurableStore(storeName);
          // The edge waits for the bus to answer before returning, so this is the sync network's
          // own reply, not an assumption that the message went out.
          setBusState(res.headers.get('X-SB-Bus') || 'unknown');
          setSubmitStatusText(`✓ Record delivered to ${storeName}. Uploading HD photo to Cloudflare R2...`);
          setSentPopupAt(confirmedStudent.createdAt || new Date().toISOString());
          setResendPrompt(null);
          unlandedSendRef.current = false;
          void syncOwnTotalsFromPayroll();
        } else {
          // HTTP 200 with the SPA HTML shell means the edge Worker is not executing — the
          // record was NOT written. Keep it in the outbox instead of reporting delivery.
          await queueOfflineOperation('CREATE_STUDENT', cloudPayload).catch(() => {});
          setSubmittedStudent(localStudentPayload);
          setCloudVerified(false);
          setSubmitStatusText('Saved on this station and queued — the cloud did not answer, so it will sync automatically.');
          unlandedSendRef.current = true;
          setResendPrompt({ studentId: localStudentPayload.studentId, fullName: localStudentPayload.fullName });
          if (!res.ok) setSubmitError(`The server rejected the record (HTTP ${res.status}). It is safe on this station and in the outbox; you can register the next student now.`);
        }
      } catch (netErr) {
        // Offline or slow cloud connection: automatically queued for background sync
        await queueOfflineOperation('CREATE_STUDENT', cloudPayload).catch(() => {});
        setSubmittedStudent(localStudentPayload);
        setCloudVerified(false);
        setSubmitStatusText('Saved on this station and queued for offline delivery. Will sync when the server is reachable.');
        // The network dropping must be loud. An amber line under a form is how a station ended up
        // believing a record had gone when it had only reached this browser.
        unlandedSendRef.current = true;
        setResendPrompt({ studentId: localStudentPayload.studentId, fullName: localStudentPayload.fullName });
      }

      // Operator UI instantly unlocks so they can immediately proceed!
      setIsSubmitting(false);

      // 3. LONG-RANGE STAGE 2 (Telegram Protocol Background HD Upload):
      // Asynchronously upload full-resolution original photo to Cloudflare R2 bucket 'siliconlabs'
      const photoOperation = {
        studentId: studentId.trim(),
        grade: cleanGrade,
        fullName: cleanName,
        filename: photoKey,
        data: capturedPhoto
      };
      (async () => {
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(photoOperation)
          });

          const upData = upRes.ok ? await cloudJsonResponse(upRes) : null;
          // Only a JSON answer from the Worker proves the object reached the bucket; the
          // HTML shell on a 200 would otherwise mark an absent photo as verified.
          if (upData && (upData.url || upData.r2Url || upData.key)) {
            const r2PhotoUrl = upData.r2Url || upData.url || expectedPhotoUrl;
            updateStudent(localStudentPayload.id, {
              photoPath: upData.url || r2PhotoUrl,
              originalPhotoPath: r2PhotoUrl,
              previewPath: upData.url || r2PhotoUrl,
              capturedPhoto: capturedPhoto,
              photoBase64: capturedPhoto,
              photoIntegrityStatus: 'PHOTO_VERIFIED'
            });
            setSubmitStatusText('✓ HD portrait stored in Cloudflare R2');
          } else {
            // Server error or inactive edge API: queue for automatic background retry
            await queueOfflineOperation('UPLOAD_PHOTO', photoOperation).catch(() => {});
            updateStudent(localStudentPayload.id, { photoIntegrityStatus: 'PENDING_CLOUD_UPLOAD' });
            setSubmitStatusText(prev => `${prev} HD photo queued for Cloudflare R2 upload.`);
          }
        } catch (uploadErr) {
          // Cellular drop or offline: queue for automatic background retry
          await queueOfflineOperation('UPLOAD_PHOTO', photoOperation).catch(() => {});
          updateStudent(localStudentPayload.id, { photoIntegrityStatus: 'PENDING_CLOUD_UPLOAD' });
          setSubmitStatusText(prev => `${prev} HD photo queued for Cloudflare R2 upload.`);
        }
      })();
    } catch (err: any) {
      console.warn('Registration flow notice:', err);
      setIsSubmitting(false);
    }
  };

  const resetFormForNext = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore storage failures — state below is what the UI counts from
    }
    setStudentId(generateNewId());
    setFullName('');
    setPhone('');
    setEmergencyContact('');
    setGuardianName('');
    setDateOfBirth('');
    setBloodType('');
    setGrade('');
    setSchoolBusUsage('');
    setCapturedPhoto(null);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setZoom(1);
    setAspectRatio('3:4');
    setSubmittedStudent(null);
    setCloudVerified(false);
    setSubmitError(null);
    setReceiverReceipts([]);
    setReceiptsWatching(false);
    setBusState('');
    setSentPopupAt(null);
    setResendPrompt(null);
    setOutboxNews(null);
    unlandedSendRef.current = false;
    refreshMetrics();
  };

  // Active task assigned to current operator
  const userTasks = getTasks().filter(t => {
    if (t.status === 'Completed') return false;
    const assigned = (t.assignedTo || '').toLowerCase().trim();
    const uName = (user?.username || '').toLowerCase().trim();
    const uEmail = (user?.email || '').toLowerCase().trim();
    const uSchool = (user?.school || '').toLowerCase().trim();
    const tSchool = (t.school || '').toLowerCase().trim();
    return (
      assigned === uName ||
      assigned === uEmail ||
      (uEmail.includes('@') && assigned === uEmail.split('@')[0]) ||
      (uSchool && tSchool === uSchool) ||
      assigned === 'all' ||
      assigned === 'field operator' ||
      assigned === 'operator'
    );
  });
  const activeTask = userTasks.length > 0 ? userTasks[0] : null;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#0B1118] tracking-tight">
            Register Student
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
            Operator: <strong className="text-[#0B1118]">{user?.username || 'Sender'}</strong>
          </span>
        </div>
      </div>

      {/* Sender Transmission Telemetry (Daily, Weekly, Monthly, Total) - Small & Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Today</span>
            <Calendar className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.today.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>This Week</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.week.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>This Month</span>
            <BarChart2 className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.month.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Sent</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Day by day - the per-day ledger the server's own totals are summed from, so a sender can
          check the salary day against the four figures above without asking the office. */}
      {Object.keys(senderMetrics.daily || {}).length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Day by day (Addis)
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(senderMetrics.daily)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 14)
              .map(([day, count]) => (
                <span key={day} className="text-[11px] font-semibold text-[#0B1118] bg-[#F1F5F9] rounded-lg px-2 py-0.5 tabular-nums">
                  {day} <strong className="text-[#4D7C0F]">{count}</strong>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Target Task Quota - ONLY rendered when there is an active task for this operator! */}
      {activeTask && (
        <div className="bg-gradient-to-r from-slate-900 to-[#101F08] border border-[#85E510]/30 rounded-2xl p-3.5 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#85E510] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#85E510]">
                Assigned Task: {activeTask.id}
              </span>
            </div>
            <div className="text-base font-heading font-black tracking-tight">
              {activeTask.title}
            </div>
            <p className="text-xs text-slate-300">
              Campus: {activeTask.school} • Priority: {activeTask.priority}
            </p>
          </div>

          <div className="w-full sm:w-64 bg-black/40 border border-slate-700/60 rounded-xl p-2.5 flex flex-col gap-1 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Status:</span>
              <span className="text-[#85E510] font-mono font-black">
                {activeTask.status}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>Deadline: {activeTask.deadline}</span>
              <span>Live Sync Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Resolved Mistake Reminder Notes (Always shown for sender whose data was corrected) */}
      {correctionNotices.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-heading font-black text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Reminder Notes: Mistake Data Corrected ({correctionNotices.length} updates for your submissions)</span>
            </div>
            <span className="text-[10px] text-amber-800 font-bold bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-300">
              Resolved by Receiver Desk
            </span>
          </div>
          <div className="divide-y divide-amber-200/60 max-h-48 overflow-y-auto custom-scrollbar">
            {correctionNotices.map(notice => (
              <div key={notice.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B1118]">{notice.studentName}</span>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {notice.studentId}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Author: <strong className="text-slate-800">{notice.senderName || 'Sender'}</strong>
                    </span>
                  </div>
                  <div className="text-amber-950 font-medium mt-1">
                    <strong className="text-amber-900">Correction Note:</strong> {notice.description}
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-1 flex items-center gap-1.5 font-bold">
                    <span>Corrected By:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-[#0B1118]">
                      {notice.resolvedBy}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(notice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Long-Range Transmission Banner: green only for a server-confirmed write, amber for
          a record that is safe on this station and waiting in the outbox. Both unlock the
          next registration — the operator is never trapped behind an unreachable server. */}
      {submittedStudent && (
        <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r ${cloudVerified
            ? 'from-emerald-950 via-slate-900 to-[#0e1d09] border-2 border-[#85E510]'
            : 'from-amber-950 via-slate-900 to-[#241703] border-2 border-amber-400'} text-white shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full animate-pulse shrink-0 ${cloudVerified ? 'bg-[#85E510]' : 'bg-amber-400'}`} />
              <div>
                <div className={`font-heading font-black text-sm uppercase tracking-wide flex items-center gap-2 ${cloudVerified ? 'text-[#85E510]' : 'text-amber-300'}`}>
                  <span>{cloudVerified
                    ? (receiverReceipts.length > 0 ? 'Delivered & Confirmed On Receiver Stations' : 'Long-Range Transmission Saved & Verified')
                    : 'Saved on This Station — Waiting for the Cloud'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${cloudVerified
                      ? 'bg-[#85E510]/20 text-[#85E510] border-[#85E510]/40'
                      : 'bg-amber-400/20 text-amber-200 border-amber-400/40'}`}>
                    {cloudVerified ? `Saved in ${durableStore}` : 'In station outbox'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {cloudVerified ? (
                    <>
                      <span>Sent at <strong className="text-white">{sentStamp ? new Date(sentStamp).toLocaleTimeString() : '—'}</strong> from station <strong className="text-white">{stationId}</strong> &bull; </span>
                      {receiverReceipts.length > 0 ? (
                        <>
                          <span className="text-[#85E510] font-bold">delivered on {receiverReceipts.length} receiver station{receiverReceipts.length > 1 ? 's' : ''}: {confirmedStationNames.join(', ')}{lastReceiptTime ? ` (confirmed ${lastReceiptTime})` : ''}</span>
                          {busFailureReason(busState) && (
                            <span className="text-slate-300"> &bull; {busFailureReason(busState)}, it still arrived through the cloud read</span>
                          )}
                        </>
                      ) : receiptsWatching ? (
                        <span className="text-amber-200">waiting for the receiver stations that are online to confirm&hellip;</span>
                      ) : (
                        <span>no receiver station has confirmed yet — the record is in the cloud and this station keeps watching for the receivers that come online{busFailureReason(busState) ? `; ${busFailureReason(busState)}` : ''}</span>
                      )}
                    </>
                  ) : (
                    <>{submitStatusText || 'Stored on this station; it will transmit automatically when the server answers.'}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={resetFormForNext}
                className={`w-full sm:w-auto py-2 px-4 rounded-xl text-[#062404] font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${cloudVerified
                    ? 'bg-[#85E510] hover:bg-[#76cf0c]'
                    : 'bg-amber-300 hover:bg-amber-200'}`}
              >
                <span>Register Next Student</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/40 rounded-xl p-3 border border-emerald-900/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-14 rounded-lg bg-slate-800 border border-emerald-500/40 overflow-hidden shrink-0 flex items-center justify-center">
                {(submittedStudent.capturedPhoto || getPhotoUrl(submittedStudent.photoPath || submittedStudent.previewPath)) ? (
                  <img
                    src={submittedStudent.capturedPhoto || getPhotoUrl(submittedStudent.photoPath || submittedStudent.previewPath) || ''}
                    alt={submittedStudent.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCheck className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{submittedStudent.fullName}</span>
                  <span className="font-mono text-xs text-[#85E510] bg-[#85E510]/10 px-2 py-0.5 rounded border border-[#85E510]/30 font-bold">
                    {submittedStudent.studentId}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {submittedStudent.school} &bull; Grade {submittedStudent.grade} {submittedStudent.department ? `(${submittedStudent.department})` : ''} &bull; {submittedStudent.phone || 'No phone'}
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400 font-mono w-full sm:w-auto">
              <div>Your Today Total: <strong className="text-[#85E510] text-sm">{senderMetrics.today}</strong></div>
              <div>Authoritative Sent: <strong className="text-white text-sm">{senderMetrics.total}</strong></div>
            </div>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-md space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-heading font-black text-sm text-rose-900 uppercase tracking-tight flex items-center gap-2">
                  <span>{submittedStudent ? 'Transmission Not Confirmed' : 'Upload Incomplete — Nothing Transmitted'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black">
                    Action Required
                  </span>
                </div>
                <p className="text-xs font-bold text-rose-800 mt-1">
                  {submitError}
                </p>
                <p className="text-[11px] text-rose-700 font-medium mt-1">
                  {submittedStudent
                    ? 'The student is safe on this station and in its outbox, and this page retries the transmission by itself. You can register the next student now.'
                    : 'Nothing left this station. Complete the highlighted item and transmit again, or press Clear Form to start over.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="pt-2 flex items-center gap-2 border-t border-rose-200">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>Retry Transmission Now</span>
            </button>
            {submittedStudent && (
              <button
                type="button"
                onClick={resetFormForNext}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Register Next Student</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* The whole of the success message: that it went, and the date it went. The next form is
          behind the one button, so an operator cannot mistake a banner for a confirmation. */}
      {sentPopupAt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0B1118]/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white border-2 border-[#85E510] p-6 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#85E510] flex items-center justify-center">
              <Check className="w-7 h-7 text-[#062404]" strokeWidth={3} />
            </div>
            <h2 className="mt-4 font-heading text-lg font-black text-[#0B1118] uppercase tracking-tight">
              Data successfully sent
            </h2>
            <p className="mt-1 text-sm font-black text-[#4D8A07]">
              {new Date(sentPopupAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <button
              autoFocus
              type="button"
              onClick={resetFormForNext}
              className="mt-5 w-full py-3 rounded-xl bg-[#85E510] hover:bg-[#76cf0c] text-[#062404] font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>Next Student</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* A send that did not reach the cloud stops the operator rather than quietly becoming a
          background retry: this popup names the record and puts the resend under their hand. */}
      {resendPrompt && (
        <div className="fixed inset-0 z-[121] flex items-center justify-center bg-[#0B1118]/85 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white border-2 border-rose-400 p-6 text-center shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
              <RefreshCw className={`w-7 h-7 text-rose-600 ${isSubmitting ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            </div>
            <h2 className="mt-4 font-heading text-lg font-black text-[#0B1118] uppercase tracking-tight">
              Resend the data
            </h2>
            <p className="mt-1 font-mono text-sm font-bold text-rose-600 break-all">{resendPrompt.studentId}</p>
            <button
              autoFocus
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-5 w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>Resend now</span>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setResendPrompt(null)}
              className="mt-2 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all cursor-pointer"
            >
              <span>Keep in outbox{outboxNews?.remaining ? ` (${outboxNews.remaining})` : ''}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: 2 White Cards */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Student Photograph Card (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-[#202833] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#4D8A07]" />
                <span>Student Photograph</span>
              </h2>
              <div className="flex items-center gap-2">
                {capturedPhoto && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Captured &bull; R2 Ready
                  </span>
                )}
                {remainingChip(photoRemaining, 'photograph')}
              </div>
            </div>

            {/* Photo Preview Container */}
            <div className="relative aspect-[3/4] w-full max-w-[340px] sm:max-w-[380px] mx-auto bg-[#F4F7F5] rounded-2xl border-2 border-dashed border-[#CBD5E1] overflow-hidden flex flex-col items-center justify-center shadow-inner group">
              {capturedPhoto ? (
                <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={capturedPhoto}
                    alt="Captured Student"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      transition: 'all 0.15s ease'
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded-md text-[9px] font-mono font-bold text-[#85E510] border border-[#85E510]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Biometric OK
                  </div>
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-xs rounded-lg text-[10px] font-mono text-white border border-white/10">
                    {studentId}
                  </div>
                  {/* Quick Edit Overlay */}
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Scissors className="w-6 h-6 text-[#85E510]" />
                    <span>Click to Edit &amp; Crop</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-[#64748B] flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4D8A07] shadow-sm">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#202833]">No Photograph Captured</div>
                    <p className="text-[11px] text-[#94A3B8] mt-1 max-w-[240px]">
                      Click below to open the dedicated biometric camera popup with Eye Line and Nose crosshairs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Launch Camera Modal</span>
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Photo Actions */}
          <div className="space-y-2 pt-2">
            <div className="space-y-2">
              {/* Activate Camera Button - Pops up Modal */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#062404]" />
                <span>{capturedPhoto ? 'Retake Photo (Camera Popup)' : 'Activate Camera'}</span>
              </button>

              {/* Edit & Crop Button */}
              <button
                type="button"
                onClick={() => {
                  if (capturedPhoto) {
                    setIsEditorOpen(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-[#85E510] text-[#202833] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Scissors className="w-4 h-4 text-[#4D8A07]" />
                <span>{capturedPhoto ? 'Edit & Crop Photo' : 'Upload & Crop Photo'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {capturedPhoto && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Portrait Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setBrightness(100);
                      setContrast(100);
                      setSaturation(100);
                      setRotation(0);
                      setZoom(1);
                    }}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Remove Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Student Information Card (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-black text-[#0B1118] uppercase tracking-wider flex items-center gap-2">
                <span>STUDENT INFORMATION</span>
                <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal">7 required</span>
              </h2>
              {remainingChip(informationRemaining, 'information')}
            </div>

            <div className="space-y-4">
              {/* Student ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0B1118]">Student ID <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    {isIdTaken ? (
                      <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Taken
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#4D8A07] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Available
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setStudentId(generateNewId())}
                      className="text-[10px] text-[#4D8A07] hover:underline font-bold flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto-Gen
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    placeholder="SB-2026-12788"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Loza Bereket"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0B1118] font-medium focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                />
              </div>

              {/* Sex Identification (Interactive Buttons - Not Dropdown!) */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Sex Identification <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      sex === 'Male'
                        ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
                    }`}
                  >
                    <span className="text-sm">♂</span>
                    <span>Male</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      sex === 'Female'
                        ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
                    }`}
                  >
                    <span className="text-sm">♀</span>
                    <span>Female</span>
                  </button>
                </div>
              </div>

              {/* Main Form: Branch Location & Assigned School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl">
                {/* Branch Location */}
                <div>
                  <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                    Branch Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={location}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] cursor-pointer appearance-none transition-all"
                    >
                      {DEFAULT_BRANCHES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Assigned School */}
                <div>
                  <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                    Assigned School ({location}) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] cursor-pointer appearance-none transition-all"
                    >
                      {availableSchools.map(schName => (
                        <option key={schName} value={schName}>{schName}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Blood Group / Type */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0B1118]">Blood Group / Type</label>
                  <span className="text-xs text-slate-400 font-semibold">Optional</span>
                </div>
                <div className="relative">
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] cursor-pointer appearance-none transition-all"
                  >
                    <option value="">-- No Blood Group Selected --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Grade / Class */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Grade / Class <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value.toUpperCase())}
                  placeholder="9C"
                  className="w-full bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E1B4B] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneFormat(e.target.value, setPhone)}
                  onBlur={() => handlePhoneFormat(phone, setPhone)}
                  placeholder="251912480376"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                />
              </div>

              {/* School Bus Usage (2 Dedicated Radio Buttons - unselected by default, toggleable) */}
              <div className="bg-[#F8FAF9] border border-[#E2E8F0] p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0B1118]">
                    School Bus Usage
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Click selected option to unselect</span>
                </div>
                <div className="flex items-center gap-6 pt-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                    <input
                      type="radio"
                      name="schoolBusUsage"
                      value="Yes"
                      checked={schoolBusUsage === 'Yes'}
                      onClick={() => setSchoolBusUsage(schoolBusUsage === 'Yes' ? '' : 'Yes')}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#85E510] cursor-pointer"
                    />
                    <span>Yes (Uses Bus)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                    <input
                      type="radio"
                      name="schoolBusUsage"
                      value="No"
                      checked={schoolBusUsage === 'No'}
                      onClick={() => setSchoolBusUsage(schoolBusUsage === 'No' ? '' : 'No')}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#85E510] cursor-pointer"
                    />
                    <span>No (Private Transport)</span>
                  </label>
                </div>
              </div>

              {/* Collapsible Extra Details */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtraDetails(!showExtraDetails)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 transition-all cursor-pointer"
                >
                  <span>{showExtraDetails ? 'Hide Extra Details' : 'Show Extra Details (Parent, Birth, Address)'}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400" title="Optional fields are excluded from the remaining-item counters">
                      Optional &mdash; not counted
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#85E510] transition-transform duration-200 ${showExtraDetails ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {showExtraDetails && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                    {/* Guardian Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Guardian Full Name</label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Parent / Guardian"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    {/* Emergency Contact Phone */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={emergencyContact}
                        onChange={(e) => handlePhoneFormat(e.target.value, setEmergencyContact)}
                        placeholder="e.g. 0911223344"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>

                    {/* Residential Address */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Woreda 03, House 412"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Completion Legend + Overall Remaining Indicator */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-help"
                title="Counting rule: each section counts only its own required items (the red * fields plus the biometric photo). Optional fields — blood group, school bus usage and Extra Details — are never counted. 'N remaining' means N required items are still unfilled; '0 remaining' means the section is complete."
              >
                Form completion
              </span>
              {remainingChip(totalRemaining, 'form')}
            </div>
            {totalRemaining > 0 ? (
              <span className="text-[11px] font-bold text-slate-500">Still needed: {outstandingLabels.join(', ')}</span>
            ) : (
              <span className="text-[11px] font-bold text-[#4D8A07]">All required items complete — ready to transmit</span>
            )}
          </div>

          {/* Action Buttons: Clear Form + Submit */}
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={resetFormForNext}
              className="w-full sm:w-auto py-3.5 px-4 rounded-xl border border-[#CBD5E1] hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear Form</span>
            </button>

            <button
              type={submittedStudent ? "button" : "submit"}
              onClick={submittedStudent ? resetFormForNext : undefined}
              disabled={isSubmitting || (!submittedStudent && (isIdTaken || !fullName.trim()))}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] disabled:opacity-50 text-[#062404] font-heading font-black text-sm shadow-[0_4px_15px_rgba(133,229,16,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#062404]" />
                  <span>{submitStatusText || 'Saving to Cloudflare R2 Storage...'}</span>
                </>
              ) : submittedStudent ? (
                <>
                  <ArrowRight className="w-4 h-4 text-[#062404]" />
                  <span>{receiverReceipts.length > 0
                    ? 'Receiver Confirmed'
                    : cloudVerified ? 'Saved in Cloud' : 'Student Kept on Station'} &bull; Click to Register Next</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#062404]" />
                  <span>Register &amp; Transmit Student</span>
                </>
              )}
            </button>
          </div>

          {/* Storage Security & Biometric Status Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Biometric Enrollment Console Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#2E7D32] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#85E510] animate-pulse" />
              <span>Live JPEG Photo Upload</span>
            </div>
          </div>
        </div>
      </form>

      {/* Biometric Camera Capture Modal Popup (Back Camera Default) */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        studentId={studentId}
        defaultFacingMode="environment"
        onCapture={(dataUrl) => {
          setCapturedPhoto(dataUrl);
          setIsCameraModalOpen(false);
          setIsEditorOpen(true);
        }}
      />

      {/* Smartphone-Style Photo Editor & Crop Modal */}
      <PhoneCropModal
        isOpen={isEditorOpen}
        imageUrl={capturedPhoto || ''}
        studentId={studentId}
        onClose={() => setIsEditorOpen(false)}
        onSave={(cropped) => {
          setCapturedPhoto(cropped);
          setIsEditorOpen(false);
        }}
      />
    </div>
  );
};
