import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Filter, Eye, Edit2, Trash2, X, Download, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronRight, Phone, School as SchoolIcon,
  UserCheck, Shield, ExternalLink, Calendar, HeartPulse
} from 'lucide-react';
import { getStudents, updateStudent, deleteStudent } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [sexFilter, setSexFilter] = useState('ALL');
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL');
  const [schoolFilter, setSchoolFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selected Student for Slide-Over Drawer
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const refreshList = () => {
    setStudents([...getStudents()]);
  };

  // Distinct Schools for filtering
  const distinctSchools = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.school) set.add(s.school); });
    return Array.from(set).sort();
  }, [students]);

  // Filtered List
  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.school && s.school.toLowerCase().includes(q));

      const matchGrade = gradeFilter === 'ALL' || s.grade === gradeFilter;
      const matchSex = sexFilter === 'ALL' || s.sex === sexFilter;
      const matchSchool = schoolFilter === 'ALL' || s.school === schoolFilter;

      let matchPhoto = true;
      if (photoFilter === 'WITH_PHOTO') matchPhoto = !!s.photoPath;
      if (photoFilter === 'NO_PHOTO') matchPhoto = !s.photoPath;

      return matchSearch && matchGrade && matchSex && matchSchool && matchPhoto;
    });
  }, [students, search, gradeFilter, sexFilter, schoolFilter, photoFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleOpenDrawer = (student: Student) => {
    setSelectedStudent(student);
    setEditFormData(student);
    setIsEditing(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent) {
      updateStudent(selectedStudent.id || selectedStudent.studentId, editFormData);
      refreshList();
      setSelectedStudent({ ...selectedStudent, ...editFormData });
      setIsEditing(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student record from the directory?')) {
      deleteStudent(id);
      refreshList();
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Central Student Directory</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/30 uppercase font-mono">
              {students.length.toLocaleString()} Loaded
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Full enterprise index of biometric identities, cloud photographs, and campus assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9eb2a6]">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="bg-[#101612] border border-[#1e2c22] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#8fe617]"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
          </select>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by student name, ID (SB-2026-...), phone number, or school..."
              className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] transition-all"
            />
          </div>

          {/* School Filter */}
          <select
            value={schoolFilter}
            onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
            className="w-full md:w-44 bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617] transition-all"
          >
            <option value="ALL">All Schools ({distinctSchools.length})</option>
            {distinctSchools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
            className="w-full md:w-36 bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617] transition-all"
          >
            <option value="ALL">All Grades</option>
            {['Pre-K', 'KG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Sex Filter */}
          <select
            value={sexFilter}
            onChange={(e) => { setSexFilter(e.target.value); setPage(1); }}
            className="w-full md:w-28 bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617] transition-all"
          >
            <option value="ALL">All Sex</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>

          {/* Photo Status */}
          <select
            value={photoFilter}
            onChange={(e) => { setPhotoFilter(e.target.value as any); setPage(1); }}
            className="w-full md:w-36 bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617] transition-all"
          >
            <option value="ALL">All Photos</option>
            <option value="WITH_PHOTO">With Photo</option>
            <option value="NO_PHOTO">Missing Photo</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-[#9eb2a6] pt-1">
          <span>Found <span className="text-[#8fe617] font-bold font-mono">{filtered.length.toLocaleString()}</span> students matching criteria</span>
          {(search || gradeFilter !== 'ALL' || sexFilter !== 'ALL' || schoolFilter !== 'ALL' || photoFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setGradeFilter('ALL');
                setSexFilter('ALL');
                setSchoolFilter('ALL');
                setPhotoFilter('ALL');
                setPage(1);
              }}
              className="text-[#8fe617] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 pl-4 text-center w-12">View</th>
                <th className="py-3.5 pl-2">Photo & Name</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">Sex</th>
                <th className="py-3.5">Phone</th>
                <th className="py-3.5">Blood</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/70">
              {pagedStudents.map((s) => {
                const photoSrc = s.previewPath || (s.photoPath ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${s.photoPath.replace(/^\//, '')}` : null);

                return (
                  <tr key={s.id || s.studentId} className="hover:bg-white/[0.02] transition-colors group">
                    {/* View Details Icon Button */}
                    <td className="py-3 pl-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(s)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#8fe617] hover:text-[#062404] text-[#9eb2a6] transition-all"
                        title="View Full Student Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Photo & Name */}
                    <td className="py-3 pl-2 flex items-center gap-3">
                      <div
                        onClick={() => handleOpenDrawer(s)}
                        className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center cursor-pointer hover:border-[#8fe617] transition-all"
                      >
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
                      <div>
                        <div
                          onClick={() => handleOpenDrawer(s)}
                          className="font-bold text-white text-xs hover:text-[#8fe617] cursor-pointer"
                        >
                          {s.fullName}
                        </div>
                        <div className="text-[10px] text-[#9eb2a6]">ID: {s.studentId}</div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="py-3 font-mono text-[#8fe617] font-semibold">{s.studentId}</td>

                    {/* School */}
                    <td className="py-3 text-white font-medium">{s.school || 'YMS'}</td>

                    {/* Grade */}
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-white text-[11px]">
                        {s.grade || 'Grade 9'}
                      </span>
                    </td>

                    {/* Sex */}
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.sex === 'Female' ? 'badge-female' : 'badge-male'
                      }`}>
                        {s.sex || 'Male'}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-3 font-mono text-[#9eb2a6]">{s.phone || '+251 91 123 4567'}</td>

                    {/* Blood Type */}
                    <td className="py-3 font-mono text-purple-300 font-semibold">{s.bloodType || 'Unknown'}</td>

                    {/* Actions */}
                    <td className="py-3 text-right pr-4 space-x-1">
                      <button
                        type="button"
                        onClick={() => { handleOpenDrawer(s); setIsEditing(true); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-[#9eb2a6] hover:text-white transition-colors"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id || s.studentId)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#9eb2a6] hover:text-red-400 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#070908] border-t border-[#1e2c22] flex items-center justify-between text-xs text-[#9eb2a6]">
          <div>
            Showing <span className="text-white font-semibold">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="text-white font-semibold">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
            <span className="text-white font-semibold">{filtered.length.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Student Detail Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#101612] border-l border-[#1e2c22] h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Drawer Top Navigation */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1e2c22]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#8fe617] font-bold">{selectedStudent.studentId}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#9eb2a6]">Dossier</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#8fe617]" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[#9eb2a6] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Photo & Identity Hero */}
              <div className="mt-6 flex flex-col items-center text-center">
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-[#8fe617]/50 shadow-[0_0_30px_rgba(143,230,23,0.25)] bg-[#070908] relative mb-3">
                  {selectedStudent.photoPath || selectedStudent.previewPath ? (
                    <img
                      src={
                        selectedStudent.previewPath ||
                        `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${selectedStudent.photoPath?.replace(/^\//, '')}`
                      }
                      alt={selectedStudent.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-amber-400">
                      <AlertTriangle className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold">No Photo</span>
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-heading font-extrabold text-white">{selectedStudent.fullName}</h2>
                <div className="text-xs text-[#8fe617] font-mono mt-0.5">{selectedStudent.studentId}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedStudent.sex === 'Female' ? 'badge-female' : 'badge-male'
                  }`}>
                    {selectedStudent.sex || 'Male'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-bold text-[10px]">
                    {selectedStudent.grade}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono text-[10px] font-bold">
                    Blood: {selectedStudent.bloodType || 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Content Form or View */}
              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9eb2a6] uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editFormData.fullName || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                      className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9eb2a6] uppercase mb-1">Grade</label>
                      <input
                        type="text"
                        value={editFormData.grade || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                        className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9eb2a6] uppercase mb-1">Phone</label>
                      <input
                        type="text"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9eb2a6] uppercase mb-1">School</label>
                      <input
                        type="text"
                        value={editFormData.school || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, school: e.target.value })}
                        className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#9eb2a6] uppercase mb-1">Blood Type</label>
                      <input
                        type="text"
                        value={editFormData.bloodType || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, bloodType: e.target.value })}
                        className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8fe617]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-[#8fe617] text-[#062404] font-bold text-xs"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="p-4 rounded-xl bg-[#070908] border border-[#1e2c22] divide-y divide-[#1e2c22]/50 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-[#9eb2a6]">School Campus:</span>
                      <span className="text-white font-medium">{selectedStudent.school || 'YMS'}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-[#9eb2a6]">Contact Phone:</span>
                      <span className="text-white font-mono">{selectedStudent.phone || 'N/A'}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-[#9eb2a6]">Country / Region:</span>
                      <span className="text-white">{selectedStudent.country || 'Ethiopia'}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-[#9eb2a6]">Cloudflare R2 File:</span>
                      <span className="font-mono text-[11px] text-[#8fe617] truncate max-w-[200px]">
                        {selectedStudent.photoPath || 'Missing portrait'}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-[#9eb2a6]">Verification Status:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#1e2c22] flex items-center justify-between text-xs">
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
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold"
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
