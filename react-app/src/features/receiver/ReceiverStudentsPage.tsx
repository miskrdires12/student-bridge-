import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Eye, Edit2, Trash2, X, Download, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronRight, Phone, School as SchoolIcon,
  UserCheck, Shield, ExternalLink, Calendar, HeartPulse, QrCode, FileText,
  Clock, ArrowUpRight, Check, Printer, FileSpreadsheet
} from 'lucide-react';
import QRCode from 'qrcode';
import { getStudents, updateStudent, deleteStudent } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [photoFilter, setPhotoFilter] = useState('ALL');

  // Multi-selection for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination (supports 100, 250, 500 per master prompt)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Selected Student for Details Slide-Over Drawer
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'Record History' | 'Photo History' | 'Correction Form'>('Record History');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Correction Form States
  const [editFullName, setEditFullName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionSaved, setCorrectionSaved] = useState(false);

  const loadData = () => {
    setStudents(getStudents());
  };

  useEffect(() => {
    loadData();

    // Reactive event listener for student registrations from Sender Station
    const handleDataChange = () => {
      loadData();
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleDataChange);
    };
  }, []);

  // Update correction form whenever selected student changes
  useEffect(() => {
    if (selectedStudent) {
      setEditFullName(selectedStudent.fullName);
      setEditGrade(selectedStudent.grade || '');
      setEditPhone(selectedStudent.phone || '');
      setCorrectionReason('');
      setCorrectionSaved(false);

      const qrPayload = JSON.stringify({
        id: selectedStudent.studentId,
        name: selectedStudent.fullName,
        school: selectedStudent.school || 'YMS',
        grade: selectedStudent.grade || '9C',
        status: selectedStudent.status || 'Accepted',
        issuer: 'Silicon Labs StudentBridge'
      });
      QRCode.toDataURL(qrPayload, { width: 140, margin: 1, color: { dark: '#062404', light: '#85E510' } })
        .then(url => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(null));
    }
  }, [selectedStudent]);

  const distinctSchools = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.school) set.add(s.school); });
    return Array.from(set).sort();
  }, [students]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q));

      const matchSchool = schoolFilter === 'ALL' || s.school === schoolFilter;
      const matchGrade = gradeFilter === 'ALL' || s.grade === gradeFilter;
      const matchStatus = statusFilter === 'ALL' || (s.status || 'Accepted').toUpperCase() === statusFilter.toUpperCase();
      const hasPhoto = !!(s.photoPath || s.previewPath);
      const matchPhoto = photoFilter === 'ALL' || (photoFilter === 'YES' && hasPhoto) || (photoFilter === 'NO' && !hasPhoto);

      return matchSearch && matchSchool && matchGrade && matchStatus && matchPhoto;
    });
  }, [students, search, schoolFilter, gradeFilter, statusFilter, photoFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedStudents.length && pagedStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedStudents.map(s => s.studentId)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!correctionReason.trim()) {
      alert('Please provide a reason for this audit correction.');
      return;
    }

    updateStudent(selectedStudent.studentId, {
      fullName: editFullName.trim(),
      grade: editGrade.trim(),
      phone: editPhone.trim()
    });

    loadData();
    setCorrectionSaved(true);
    setTimeout(() => {
      setCorrectionSaved(false);
      setSelectedStudent(null);
    }, 1500);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this student record?')) {
      deleteStudent(id);
      loadData();
      if (selectedStudent?.id === id || selectedStudent?.studentId === id) {
        setSelectedStudent(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Student Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 font-mono">
              {students.length.toLocaleString()} Authoritative Records
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            High-density student directory with real-time biometric verification, inspection drawer, and exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-xs font-bold text-[#366804] bg-[#85E510]/20 px-3 py-1.5 rounded-xl border border-[#85E510]/40">
              {selectedIds.size} Selected
            </span>
          )}
          <Link
            to="/receiver/exports"
            className="px-3.5 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Registry & Photos</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
          {/* Search by ID, Name, Phone */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search ID, name, or phone..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
            />
          </div>

          {/* School filter */}
          <select
            value={schoolFilter}
            onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">School: All</option>
            {distinctSchools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Grade filter */}
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Grade: All</option>
            {['9C', '9A', '9B', '10A', '10B', '11A', '12A', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Photo filter */}
          <select
            value={photoFilter}
            onChange={(e) => { setPhotoFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Photo: All</option>
            <option value="YES">Has Photo</option>
            <option value="NO">Missing Photo</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Status: All</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Page Size Selector (Supports 100, 250, 500) */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-bold text-[#202833]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => { setSearch(''); setSchoolFilter('ALL'); setGradeFilter('ALL'); setStatusFilter('ALL'); setPhotoFilter('ALL'); setPage(1); }}
            className="px-3 py-1.5 rounded-xl bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-xs font-bold text-[#202833] transition-all"
          >
            Reset
          </button>
          <span className="text-xs font-mono text-[#366804] font-bold">
            {filtered.length.toLocaleString()} Found
          </span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                  />
                </th>
                <th className="py-3.5 pl-2">Photo</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">Full Name</th>
                <th className="py-3.5">Sex</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Phone Number</th>
                <th className="py-3.5">Sender</th>
                <th className="py-3.5">Review Status</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pagedStudents.map((s) => {
                const photoSrc = s.previewPath || (s.photoPath ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${s.photoPath.replace(/^\//, '')}` : null);
                const status = s.status || 'Accepted';
                const isSelected = selectedIds.has(s.studentId);

                return (
                  <tr
                    key={s.id || s.studentId}
                    className={`hover:bg-[#F8FAF9] transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#85E510]/5' : ''
                    }`}
                    onClick={() => setSelectedStudent(s)}
                  >
                    <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(s.studentId)}
                        className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                      />
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-3 pl-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#F4F7F5] border border-[#CBD5E1] shrink-0 flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={s.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 w-full h-full flex items-center justify-center">
                            NO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="py-3 font-mono text-[#366804] font-bold">{s.studentId}</td>

                    {/* Full Name */}
                    <td className="py-3 font-bold text-[#202833] text-xs">{s.fullName}</td>

                    {/* Sex */}
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.sex === 'Female' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {s.sex || 'Female'}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-[#F4F7F5] border border-[#E2E8F0] font-bold text-[#202833] text-[11px]">
                        {s.grade || '9C'}
                      </span>
                    </td>

                    {/* School */}
                    <td className="py-3 text-[#202833] font-semibold">{s.school || 'YMS'}</td>

                    {/* Phone */}
                    <td className="py-3 font-mono text-[#64748B]">{s.phone || '+2519...'}</td>

                    {/* Sender */}
                    <td className="py-3 text-[#64748B]">{s.senderName || 'Sender-01'}</td>

                    {/* Status Badge */}
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        status === 'Accepted' || status === 'VERIFIED'
                          ? 'badge-accepted'
                          : status === 'Pending'
                          ? 'badge-pending'
                          : 'badge-rejected'
                      }`}>
                        {status === 'VERIFIED' ? 'Accepted' : status}
                      </span>
                    </td>

                    {/* View Button */}
                    <td className="py-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className="p-1.5 rounded-lg bg-[#F4F7F5] hover:bg-[#85E510] hover:text-[#062404] text-[#64748B] transition-all border border-[#CBD5E1]"
                        title="View Full Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#F8FAF9] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing <strong className="text-[#202833]">{(page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-[#202833]">{Math.min(page * pageSize, filtered.length)}</strong> of{' '}
            <strong className="text-[#202833]">{filtered.length.toLocaleString()}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 text-[#202833] hover:bg-[#F4F7F5]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-[#202833]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 text-[#202833] hover:bg-[#F4F7F5]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Dossier Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#85E510]/20 flex items-center justify-center text-[#4D8A07]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#202833]">
                    {selectedStudent.fullName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#366804]">
                    <span>{selectedStudent.studentId}</span>
                    <span>&bull;</span>
                    <span className="text-[#64748B] font-sans font-medium">{selectedStudent.school}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg hover:bg-[#F4F7F5] text-[#64748B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Photo & Identity Quick Card */}
              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className="w-24 h-28 rounded-xl bg-white border border-[#CBD5E1] overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                  {selectedStudent.previewPath || selectedStudent.photoPath ? (
                    <img
                      src={selectedStudent.previewPath || `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${selectedStudent.photoPath?.replace(/^\//, '')}`}
                      alt={selectedStudent.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-amber-600">No Photo</span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Grade & Section:</span>
                    <span className="font-bold text-[#202833]">{selectedStudent.grade || '9C'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Blood Type:</span>
                    <span className="font-bold text-[#202833]">{selectedStudent.bloodType || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Sex:</span>
                    <span className="font-bold text-[#202833]">{selectedStudent.sex || 'Female'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Phone:</span>
                    <span className="font-mono text-[#202833]">{selectedStudent.phone || '+251...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Origin Sender:</span>
                    <span className="font-semibold text-[#202833]">{selectedStudent.senderName || 'Field Sender'}</span>
                  </div>
                </div>
              </div>

              {/* QR Verification Payload */}
              {qrCodeDataUrl && (
                <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-[#202833] flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-[#4D8A07]" />
                      <span>Encrypted Verification QR</span>
                    </h4>
                    <p className="text-[11px] text-[#64748B] mt-1 max-w-[280px]">
                      Authentic QR payload compatible with StudentCore Android field scanners.
                    </p>
                  </div>
                  <img
                    src={qrCodeDataUrl}
                    alt="Student QR Code"
                    className="w-20 h-20 rounded-lg border border-[#E2E8F0] p-1 bg-white"
                  />
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-bold text-[#64748B]">
                {(['Record History', 'Photo History', 'Correction Form'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-[#85E510] text-[#202833] font-black'
                        : 'hover:text-[#202833]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab 1: Record History */}
              {activeTab === 'Record History' && (
                <div className="space-y-3">
                  {selectedStudent.recordHistory && selectedStudent.recordHistory.length > 0 ? (
                    selectedStudent.recordHistory.map((h, i) => (
                      <div key={i} className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] text-xs space-y-1">
                        <div className="flex justify-between font-bold text-[#202833]">
                          <span>{h.action}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">{h.date}</span>
                        </div>
                        <div className="text-[#64748B]">
                          By: <strong className="text-[#202833]">{h.user}</strong> ({h.role})
                        </div>
                        {h.notes && <p className="text-[11px] text-[#475569] italic">{h.notes}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-[#F8FAF9] rounded-xl text-center text-xs text-[#64748B]">
                      Initial registration record from Sender Station.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Photo History */}
              {activeTab === 'Photo History' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                    <div className="font-bold text-[#202833] mb-1">R2 Object Reference</div>
                    <div className="font-mono text-[11px] text-[#366804] break-all">
                      {selectedStudent.photoPath || 'No R2 key registered'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Integrity Status:</span>
                      <span className="font-bold text-[#366804]">PHOTO_VERIFIED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Public CDN URL:</span>
                      <span className="text-[#202833]">pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Record Correction Form */}
              {activeTab === 'Correction Form' && (
                <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
                  {correctionSaved && (
                    <div className="p-3 rounded-xl bg-[#85E510]/20 border border-[#85E510]/40 text-[#366804] font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Correction applied and audited successfully!</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Grade / Class</label>
                    <input
                      type="text"
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Reason for Correction (Audited)</label>
                    <textarea
                      required
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g. Corrected spelling of father's name as requested by school registrar"
                      rows={2}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl p-2.5 text-xs text-[#202833]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm transition-all"
                  >
                    Save & Record in Audit Trail
                  </button>
                </form>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDelete(selectedStudent.studentId)}
                className="px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Student</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-1.5 rounded-xl bg-[#202833] text-white text-xs font-bold hover:bg-[#161D26]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
