import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Eye, Edit2, Trash2, X, Download, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronRight, Phone, School as SchoolIcon,
  UserCheck, Shield, ExternalLink, Calendar, HeartPulse, QrCode, FileText,
  Clock, ArrowUpRight
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

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Selected Student for Dossier Modal (Matching screenshot)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'Record History' | 'Photo History' | 'Notes'>('Record History');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const loadData = () => {
    setStudents(getStudents());
  };

  useEffect(() => {
    loadData();

    // Listen for reactive student additions from Sender Station
    const handleDataChange = () => {
      loadData();
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleDataChange);
    };
  }, []);

  // Generate QR code whenever selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const qrPayload = JSON.stringify({
        id: selectedStudent.studentId,
        name: selectedStudent.fullName,
        school: selectedStudent.school || 'YMS',
        grade: selectedStudent.grade || '9C',
        status: selectedStudent.status || 'Accepted',
        issuer: 'Silicon Labs StudentBridge'
      });
      QRCode.toDataURL(qrPayload, { width: 140, margin: 1, color: { dark: '#062404', light: '#85e510' } })
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

      return matchSearch && matchSchool && matchGrade && matchStatus;
    });
  }, [students, search, schoolFilter, gradeFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student record?')) {
      deleteStudent(id);
      loadData();
      if (selectedStudent?.id === id || selectedStudent?.studentId === id) {
        setSelectedStudent(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Student Directory</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#85e510]/20 text-[#85e510] border border-[#85e510]/30 uppercase font-mono">
              {students.length.toLocaleString()} Total Records
            </span>
          </div>
          <p className="text-xs text-[#8fa2b7] mt-0.5">
            Central repository of all biometric students transmitted from field sender workstations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/receiver/exports"
            className="px-3 py-2 rounded-xl bg-[#85e510] hover:bg-[#9bf028] text-[#062404] text-xs font-black shadow-[0_0_15px_rgba(133,229,16,0.3)] transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Registry</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar Matching Screenshot */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          {/* Search by ID or Name */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa2b7]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID or name..."
              className="w-full bg-[#0b1118] border border-[#1e2e42] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#3f5267] focus:outline-none focus:border-[#85e510]"
            />
          </div>

          {/* School: All */}
          <select
            value={schoolFilter}
            onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
            className="bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
          >
            <option value="ALL">School: All</option>
            {distinctSchools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Grade: All */}
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
            className="bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
          >
            <option value="ALL">Grade: All</option>
            {['9C', '9A', '9B', '10A', '10B', '11A', '12A', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#0b1118] border border-[#1e2e42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#85e510]"
          >
            <option value="ALL">Status: All</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={() => { setSearch(''); setSchoolFilter('ALL'); setGradeFilter('ALL'); setStatusFilter('ALL'); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#0b1118] border border-[#1e2e42] text-xs font-bold text-white hover:bg-white/5 transition-all"
          >
            Reset
          </button>
          <span className="text-xs font-mono text-[#85e510] font-bold">
            {filtered.length.toLocaleString()} Found
          </span>
        </div>
      </div>

      {/* Directory Table Matching Screenshot */}
      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1118] border-b border-[#1e2e42] text-[#8fa2b7] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4 w-10">
                  <input type="checkbox" className="rounded border-[#1e2e42] bg-[#0b1118] text-[#85e510] focus:ring-0" />
                </th>
                <th className="py-3.5 pl-2">Photo</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">Name</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Phone</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2e42]/60">
              {pagedStudents.map((s) => {
                const photoSrc = s.previewPath || (s.photoPath ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${s.photoPath.replace(/^\//, '')}` : null);
                const status = s.status || 'Accepted';

                return (
                  <tr
                    key={s.id || s.studentId}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-[#1e2e42] bg-[#0b1118] text-[#85e510] focus:ring-0" />
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-3 pl-2">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-[#0b1118] border border-[#1e2e42] shrink-0 flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={s.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-amber-400">NO</span>
                        )}
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="py-3 font-mono text-[#85e510] font-semibold">{s.studentId}</td>

                    {/* Full Name */}
                    <td className="py-3 font-bold text-white text-xs">{s.fullName}</td>

                    {/* Grade */}
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-[#0b1118] border border-[#1e2e42] font-bold text-white text-[11px]">
                        {s.grade || '9C'}
                      </span>
                    </td>

                    {/* School */}
                    <td className="py-3 text-white font-medium">{s.school || 'YMS'}</td>

                    {/* Phone */}
                    <td className="py-3 font-mono text-[#8fa2b7]">{s.phone || '+251 912 400 376'}</td>

                    {/* Status Pill matching screenshot */}
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
                        className="p-1.5 rounded-lg bg-[#0b1118] hover:bg-[#85e510] hover:text-[#062404] text-[#8fa2b7] transition-all border border-[#1e2e42]"
                        title="View Dossier"
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
        <div className="p-4 bg-[#0b1118] border-t border-[#1e2e42] flex items-center justify-between text-xs text-[#8fa2b7]">
          <div>
            Showing <span className="text-white font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="text-white font-semibold">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
            <span className="text-white font-semibold">{filtered.length.toLocaleString()}</span> records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Receiver - Student Details Modal (MATCHING SCREENSHOT CENTER EXACTLY) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131e2b] border border-[#1e2e42] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative text-left my-8">
            {/* Top Close */}
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-5 right-5 text-[#8fa2b7] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Student ID, Status Pill, Full Name */}
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-lg font-black text-white">{selectedStudent.studentId}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#85e510]/15 text-[#85e510] border border-[#85e510]/40 text-[10px] font-black uppercase">
                {selectedStudent.status === 'VERIFIED' ? 'Accepted' : (selectedStudent.status || 'Accepted')}
              </span>
            </div>
            <h2 className="text-2xl font-heading font-black text-white mb-6">
              {selectedStudent.fullName}
            </h2>

            {/* Main Content Grid: Photo (Left) + Details (Center) + QR & Actions (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pb-6 border-b border-[#1e2e42]">
              {/* Photo */}
              <div className="sm:col-span-4 flex flex-col items-center">
                <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-[#1e2e42] bg-[#0b1118] relative shadow-lg">
                  {selectedStudent.previewPath || selectedStudent.photoPath ? (
                    <img
                      src={
                        selectedStudent.previewPath ||
                        `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${selectedStudent.photoPath?.replace(/^\//, '')}`
                      }
                      alt={selectedStudent.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-400 text-xs font-bold p-2 text-center">
                      <AlertTriangle className="w-8 h-8 mb-1" />
                      <span>Missing Photo</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Details (Matching screenshot middle) */}
              <div className="sm:col-span-5 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1e2e42]/40">
                  <span className="text-[#8fa2b7]">Sex:</span>
                  <span className="font-bold text-white">{selectedStudent.sex || 'Female'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2e42]/40">
                  <span className="text-[#8fa2b7]">Grade/Class:</span>
                  <span className="font-bold text-white">{selectedStudent.grade || '9C'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2e42]/40">
                  <span className="text-[#8fa2b7]">Blood Group:</span>
                  <span className="font-mono font-bold text-purple-300">{selectedStudent.bloodType || 'O+'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2e42]/40">
                  <span className="text-[#8fa2b7]">Phone:</span>
                  <span className="font-mono text-white font-bold">{selectedStudent.phone || '+251912400376'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2e42]/40">
                  <span className="text-[#8fa2b7]">School:</span>
                  <span className="font-bold text-white">{selectedStudent.school || 'YMS'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#8fa2b7]">Location:</span>
                  <span className="font-bold text-white">{selectedStudent.location || 'Addis Ababa'}</span>
                </div>
              </div>

              {/* QR Code & Action Buttons (Right) */}
              <div className="sm:col-span-3 flex flex-col items-center justify-between space-y-2">
                <div className="p-1 rounded-xl bg-white/5 border border-[#1e2e42]">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-20 h-20 rounded-lg" />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center text-xs text-[#8fa2b7]">QR Code</div>
                  )}
                </div>

                <div className="w-full space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => alert('Photo download requested from Cloudflare R2.')}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-[11px] font-bold text-white flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3 text-[#85e510]" />
                    <span>Download Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('Photo editor active.')}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-[11px] font-bold text-white flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3 h-3 text-blue-400" />
                    <span>Edit Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('New QR Code generated and signed.')}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#0b1118] hover:bg-white/5 border border-[#1e2e42] text-[11px] font-bold text-white flex items-center justify-center gap-1"
                  >
                    <QrCode className="w-3 h-3 text-purple-400" />
                    <span>Generate QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('Correction requested and dispatched to Sender Station.')}
                    className="w-full py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-300 flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Request Correction</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Tabs: Record History | Photo History | Notes */}
            <div className="pt-4">
              <div className="flex items-center gap-4 text-xs font-bold border-b border-[#1e2e42] pb-2 mb-3">
                {(['Record History', 'Photo History', 'Notes'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`transition-colors ${
                      activeTab === tab ? 'text-[#85e510] border-b-2 border-[#85e510] pb-2 -mb-2.5' : 'text-[#8fa2b7] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Record History' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-[#8fa2b7] text-[10px] uppercase border-b border-[#1e2e42]">
                      <tr>
                        <th className="pb-2">Date &amp; Time</th>
                        <th className="pb-2">Action</th>
                        <th className="pb-2">User</th>
                        <th className="pb-2">Role</th>
                        <th className="pb-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2e42]/40 text-[11px]">
                      {(selectedStudent.recordHistory || [
                        { date: '2026-10-13 10:34', action: 'Initial Submission', user: 'Loza Bereket', role: 'Sender', notes: 'Initial submission' },
                        { date: '2026-10-13 11:02', action: 'Data Correction', user: 'Alemu Tadesse', role: 'Receiver', notes: 'Corrected grade' },
                        { date: '2026-10-13 11:30', action: 'Photo Verified', user: 'Getnet Kassa', role: 'Admin', notes: 'Approved' }
                      ]).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-2 text-[#8fa2b7]">{row.date}</td>
                          <td className="py-2 text-white font-bold">{row.action}</td>
                          <td className="py-2 text-white">{row.user}</td>
                          <td className="py-2 text-[#85e510]">{row.role}</td>
                          <td className="py-2 text-[#8fa2b7] font-sans">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'Photo History' && (
                <div className="text-xs text-[#8fa2b7] p-3 rounded-xl bg-[#0b1118] border border-[#1e2e42]">
                  Portrait ingested via Sender WebRTC Biometric Stream. Verified ISO/IEC 19794 portrait standard with 99.4% confidence score.
                </div>
              )}

              {activeTab === 'Notes' && (
                <div className="text-xs text-[#8fa2b7] p-3 rounded-xl bg-[#0b1118] border border-[#1e2e42]">
                  Authorized for regional ID badge card printing and StudentCore synchronization.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-[#1e2e42] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleDelete(selectedStudent.id || selectedStudent.studentId)}
                className="text-red-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Student</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="py-2 px-5 rounded-xl bg-[#85e510] text-[#062404] font-bold text-xs shadow"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
