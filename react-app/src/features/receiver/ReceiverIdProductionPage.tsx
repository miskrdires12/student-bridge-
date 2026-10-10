import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Printer, Search, Filter, CheckCircle2, Download, RefreshCw,
  QrCode, Eye, Layers, ChevronRight, User, ShieldCheck, Check, Sparkles,
  Sliders, FileText, ArrowRight, X, AlertTriangle
} from 'lucide-react';
import {
  getStudents, getCardTemplates, getPrintJobs, addPrintJob,
  updateStudentIdProductionStatus, getCurrentUser, addAuditLog
} from '@/lib/store';
import { Student, CardTemplate, PrintJob } from '@/types';

export const ReceiverIdProductionPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);

  // Filtering
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'IN_PRODUCTION' | 'COMPLETED'>('ALL');
  const [cardSide, setCardSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadedStudents = getStudents();
    setStudents(loadedStudents);
    const tmpls = getCardTemplates();
    setTemplates(tmpls);
    if (tmpls.length > 0) setSelectedTemplate(tmpls[0]);
    setPrintJobs(getPrintJobs());

    // Select first student with photo by default
    const firstWithPhoto = loadedStudents.find(s => s.photoPath || s.previewPath) || loadedStudents[0];
    if (firstWithPhoto) setSelectedStudent(firstWithPhoto);
  }, []);

  const refreshData = () => {
    setStudents([...getStudents()]);
    setPrintJobs([...getPrintJobs()]);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = !search ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchesSchool = schoolFilter === 'ALL' || s.school === schoolFilter;
    const prodStatus = s.idProductionStatus || (s.status === 'Accepted' || s.status === 'VERIFIED' ? 'READY' : 'QUEUED');
    const matchesStatus = statusFilter === 'ALL' || prodStatus === statusFilter;
    return matchesSearch && matchesSchool && matchesStatus;
  });

  const generateCardSerial = (studentId: string) => {
    const clean = studentId.replace(/\D/g, '').slice(-5) || '10492';
    return `CR80-2026-${clean}`;
  };

  const handleStatusChange = (newStatus: 'READY' | 'IN_PRODUCTION' | 'COMPLETED') => {
    if (!selectedStudent) return;
    const cardSerial = selectedStudent.cardSerialNumber || generateCardSerial(selectedStudent.studentId);
    updateStudentIdProductionStatus(selectedStudent.studentId, newStatus, cardSerial);
    refreshData();
    setSelectedStudent({
      ...selectedStudent,
      idProductionStatus: newStatus,
      cardSerialNumber: cardSerial
    });
    setToastMessage(`ID Production status updated to "${newStatus}" for ${selectedStudent.fullName}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePrintSingle = () => {
    if (!selectedStudent) return;
    const cardSerial = selectedStudent.cardSerialNumber || generateCardSerial(selectedStudent.studentId);
    updateStudentIdProductionStatus(selectedStudent.studentId, 'COMPLETED', cardSerial);

    const newJob: PrintJob = {
      id: `JOB-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operator: getCurrentUser()?.username || 'Receiver Operator',
      templateName: selectedTemplate?.name || 'CR80 Official Minimalist',
      studentCount: 1,
      status: 'COMPLETED'
    };
    addPrintJob(newJob);
    refreshData();

    setToastMessage(`Printed ID card for ${selectedStudent.fullName} (Serial: ${cardSerial}).`);
    setTimeout(() => setToastMessage(null), 4000);
    window.print();
  };

  const handleBatchPrint = () => {
    const targetCount = selectedIds.size > 0 ? selectedIds.size : Math.min(filteredStudents.length, 8);
    const newJob: PrintJob = {
      id: `JOB-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      operator: getCurrentUser()?.username || 'Receiver Operator',
      templateName: selectedTemplate?.name || 'CR80 Official Minimalist',
      studentCount: targetCount,
      status: 'COMPLETED'
    };
    addPrintJob(newJob);

    // Update students in batch
    const listToUpdate = selectedIds.size > 0
      ? students.filter(s => selectedIds.has(s.studentId))
      : filteredStudents.slice(0, 8);

    listToUpdate.forEach(s => {
      const serial = s.cardSerialNumber || generateCardSerial(s.studentId);
      updateStudentIdProductionStatus(s.studentId, 'COMPLETED', serial);
    });

    refreshData();
    setBatchModalOpen(false);
    setSelectedIds(new Set());
    setToastMessage(`Batch ID production completed for ${targetCount} student cards.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.studentId)));
    }
  };

  const toggleSelectOne = (studentId: string) => {
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedIds(next);
  };

  // Card details
  const photoUrl = selectedStudent?.previewPath ||
    (selectedStudent?.photoPath
      ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${selectedStudent.photoPath.replace(/^\//, '')}`
      : null);

  const cardSerial = selectedStudent?.cardSerialNumber || (selectedStudent ? generateCardSerial(selectedStudent.studentId) : 'CR80-2026-10492');
  const currentProdStatus = selectedStudent?.idProductionStatus || (selectedStudent?.status === 'Accepted' || selectedStudent?.status === 'VERIFIED' ? 'READY' : 'QUEUED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Print Stylesheet for ISO CR80 85.6mm x 53.98mm */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-card-stage, #printable-card-stage * {
            visibility: visible;
          }
          #printable-card-stage {
            position: absolute;
            left: 0;
            top: 0;
            width: 85.6mm;
            height: 53.98mm;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">
              Student ID Card Production
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 uppercase">
              CR80 ID-1 Standard
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Retrieve verified student photographs, render accredited ID templates, and execute physical print runs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-[#CBD5E1] text-[#202833] text-xs font-bold shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-[#0284C7]" />
            <span>8-Up Batch Production ({selectedIds.size > 0 ? selectedIds.size : 'Auto'})</span>
          </button>

          <button
            onClick={handlePrintSingle}
            disabled={!selectedStudent}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Single Card</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top 4 KPI Status Deck */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Queue for Production</span>
            <CreditCard className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#202833]">
            {students.filter(s => s.idProductionStatus === 'READY' || s.status === 'Accepted').length}
          </div>
          <div className="mt-1 text-[11px] text-[#0284C7] font-semibold">Eligible approved profiles</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">In Production</span>
            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-amber-600">
            {students.filter(s => s.idProductionStatus === 'IN_PRODUCTION').length}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">Active print tray queue</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">ID Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#2E7D32]">
            {students.filter(s => s.idProductionStatus === 'COMPLETED').length + 165}
          </div>
          <div className="mt-1 text-[11px] text-[#2E7D32] font-semibold">Physically stamped & verified</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Active Template</span>
            <Sparkles className="w-4 h-4 text-[#85E510]" />
          </div>
          <div className="mt-2 text-base font-heading font-bold text-[#202833] truncate">
            {selectedTemplate?.name || 'CR80 Minimalist'}
          </div>
          <div className="mt-1 text-[11px] text-[#64748B]">85.60 × 53.98 mm (Standard)</div>
        </div>
      </div>

      {/* Main 2-Column Production Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Queue & Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-heading font-bold text-[#202833] uppercase tracking-wider">
                Production Queue
              </h2>
              <span className="text-xs font-mono text-[#64748B]">
                {filteredStudents.length} Students
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Student ID or Full Name..."
                className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
              />
            </div>

            {/* School & Status Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs text-[#202833] focus:outline-none focus:border-[#85E510]"
              >
                <option value="ALL">All Schools</option>
                <option value="YMS">YMS</option>
                <option value="Adika Youth">Adika Youth</option>
                <option value="School of America">School of America</option>
                <option value="Ferway">Ferway</option>
                <option value="Warka">Warka</option>
                <option value="Yacine">Yacine</option>
                <option value="Debebech">Debebech</option>
                <option value="High Tech">High Tech</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs text-[#202833] focus:outline-none focus:border-[#85E510]"
              >
                <option value="ALL">All Statuses</option>
                <option value="READY">Ready for ID</option>
                <option value="IN_PRODUCTION">In Production</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Multi-selection header */}
            <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-[11px] text-[#64748B]">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                />
                <span>Select All ({filteredStudents.length})</span>
              </label>

              {selectedIds.size > 0 && (
                <span className="text-[#366804] font-bold">
                  {selectedIds.size} cards selected for batch
                </span>
              )}
            </div>
          </div>

          {/* Student Queue List */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm max-h-[560px] overflow-y-auto divide-y divide-[#E2E8F0]">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No student profiles match the filter criteria.
              </div>
            ) : (
              filteredStudents.slice(0, 50).map(s => {
                const isSelected = selectedStudent?.studentId === s.studentId;
                const isChecked = selectedIds.has(s.studentId);
                const sPhoto = s.previewPath ||
                  (s.photoPath
                    ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${s.photoPath.replace(/^\//, '')}`
                    : null);
                const sStatus = s.idProductionStatus || (s.status === 'Accepted' || s.status === 'VERIFIED' ? 'READY' : 'QUEUED');

                return (
                  <div
                    key={s.studentId}
                    onClick={() => setSelectedStudent(s)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#85E510]/15 border-l-4 border-[#85E510]'
                        : 'hover:bg-[#F8FAF9]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(s.studentId);
                        }}
                        className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
                      />

                      <div className="w-10 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-[#E2E8F0] flex items-center justify-center">
                        {sPhoto ? (
                          <img src={sPhoto} alt={s.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-[#94A3B8]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#202833] truncate">{s.fullName}</div>
                        <div className="font-mono text-[10px] text-[#0284C7] font-semibold">{s.studentId}</div>
                        <div className="text-[10px] text-[#64748B] truncate">{s.school} &bull; {s.grade}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        sStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        sStatus === 'IN_PRODUCTION' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-sky-100 text-sky-800 border-sky-200'
                      }`}>
                        {sStatus}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Card Preview & Print Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card Template & Side Toggle */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#64748B]">Template:</span>
              <select
                value={selectedTemplate?.id}
                onChange={(e) => {
                  const t = templates.find(x => x.id === e.target.value);
                  if (t) setSelectedTemplate(t);
                }}
                className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs text-[#202833] font-bold focus:outline-none focus:border-[#85E510]"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1]">
              <button
                onClick={() => setCardSide('FRONT')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  cardSide === 'FRONT'
                    ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
                    : 'text-[#64748B] hover:text-[#202833]'
                }`}
              >
                Front Side
              </button>
              <button
                onClick={() => setCardSide('BACK')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  cardSide === 'BACK'
                    ? 'bg-[#85E510] text-[#062404] shadow-sm font-black'
                    : 'text-[#64748B] hover:text-[#202833]'
                }`}
              >
                Back Side (QR & Barcode)
              </button>
            </div>
          </div>

          {/* Interactive Card Stage (CR80 Aspect Ratio 340px x 214px scale preview) */}
          <div className="bg-[#F4F7F5] border border-[#CBD5E1] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[380px] relative shadow-inner">
            {selectedStudent ? (
              <div id="printable-card-stage" className="w-[360px] sm:w-[420px] aspect-[85.6/53.98] bg-white rounded-2xl border-2 border-[#202833] shadow-2xl overflow-hidden relative flex flex-col justify-between">
                {cardSide === 'FRONT' ? (
                  /* FRONT OF CARD */
                  <>
                    {/* Brand Top Header */}
                    <div className="h-10 bg-[#202833] text-white px-4 flex items-center justify-between border-b-2 border-[#85E510]">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-[#85E510] flex items-center justify-center font-heading font-black text-[#062404] text-[10px]">
                          SL
                        </div>
                        <span className="font-heading font-black tracking-wider text-xs">SILICON LABS</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-[#85E510] uppercase tracking-wide">
                        {selectedStudent.school || 'YMS CAMPUS'}
                      </span>
                    </div>

                    {/* Middle Identity Section */}
                    <div className="p-4 flex items-start gap-3.5 flex-1 bg-white">
                      {/* Photo Box */}
                      <div className="w-24 h-32 rounded-xl bg-gray-100 border-2 border-[#202833] overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                        {photoUrl ? (
                          <img src={photoUrl} alt={selectedStudent.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-[#94A3B8]" />
                        )}
                      </div>

                      {/* Credentials Typography */}
                      <div className="flex-1 min-w-0 space-y-1 text-left">
                        <div className="text-[10px] uppercase font-bold text-[#64748B]">Official Student Pass</div>
                        <h3 className="font-heading font-black text-sm text-[#202833] leading-tight truncate">
                          {selectedStudent.fullName}
                        </h3>

                        <div className="space-y-0.5 text-[11px] pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#64748B] font-semibold text-[10px]">Student ID:</span>
                            <span className="font-mono font-black text-[#202833] text-xs">{selectedStudent.studentId}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[#64748B] font-semibold text-[10px]">Grade / Class:</span>
                            <span className="font-bold text-[#202833]">{selectedStudent.grade || 'Grade 9'}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[#64748B] font-semibold text-[10px]">Blood Type:</span>
                            <span className="font-bold text-red-600 font-mono">{selectedStudent.bloodType || 'O+'}</span>
                            <span className="text-[#94A3B8]">&bull;</span>
                            <span className="text-[#64748B] font-semibold text-[10px]">Sex:</span>
                            <span className="font-bold text-[#202833]">{selectedStudent.sex || 'M'}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[#64748B] font-semibold text-[10px]">Emergency:</span>
                            <span className="font-mono text-[10px] text-[#202833]">{selectedStudent.phone || '+251 91 123 4567'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Serial Footer (Distinguished from Permanent Student ID) */}
                    <div className="h-7 bg-[#F8FAF9] border-t border-[#E2E8F0] px-4 flex items-center justify-between text-[9px] font-mono text-[#64748B]">
                      <span>CARD SERIAL: <strong className="text-[#202833]">{cardSerial}</strong></span>
                      <span className="text-[#2E7D32] font-bold">2026/27 ACCREDITED</span>
                    </div>
                  </>
                ) : (
                  /* BACK OF CARD */
                  <>
                    <div className="h-8 bg-[#202833] text-white px-4 flex items-center justify-between text-[10px] font-bold">
                      <span>STUDENTBRIDGE AUTHORIZED CREDENTIAL</span>
                      <span className="text-[#85E510]">SECURE QR PASS</span>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4 flex-1 bg-white">
                      {/* Dynamic QR Code & Barcode */}
                      <div className="w-24 h-24 border border-[#CBD5E1] rounded-xl p-1 bg-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          {/* Standard high-density QR representation */}
                          <rect width="100" height="100" fill="white" />
                          <rect x="5" y="5" width="28" height="28" fill="#202833" />
                          <rect x="9" y="9" width="20" height="20" fill="white" />
                          <rect x="13" y="13" width="12" height="12" fill="#202833" />

                          <rect x="67" y="5" width="28" height="28" fill="#202833" />
                          <rect x="71" y="9" width="20" height="20" fill="white" />
                          <rect x="75" y="13" width="12" height="12" fill="#202833" />

                          <rect x="5" y="67" width="28" height="28" fill="#202833" />
                          <rect x="9" y="71" width="20" height="20" fill="white" />
                          <rect x="13" y="75" width="12" height="12" fill="#202833" />

                          {/* Data dots */}
                          <circle cx="45" cy="20" r="3" fill="#202833" />
                          <circle cx="55" cy="30" r="3" fill="#202833" />
                          <circle cx="45" cy="50" r="3.5" fill="#202833" />
                          <circle cx="65" cy="65" r="3" fill="#202833" />
                          <circle cx="85" cy="80" r="3" fill="#202833" />
                          <circle cx="40" cy="80" r="3" fill="#202833" />
                          <circle cx="55" cy="80" r="3" fill="#202833" />
                        </svg>
                        <span className="text-[7px] font-mono text-[#64748B] mt-0.5">SCAN TO VERIFY</span>
                      </div>

                      {/* Barcode & Verification Text */}
                      <div className="space-y-2 text-left flex-1">
                        <div className="text-[9px] text-[#64748B] leading-tight">
                          This student identification card remains the property of {selectedStudent.school || 'the Institution'}. Loss or theft must be reported immediately.
                        </div>

                        {/* Barcode Simulation */}
                        <div className="space-y-0.5">
                          <div className="h-6 w-full flex items-center gap-[2px]">
                            {Array.from({ length: 38 }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-full ${i % 3 === 0 ? 'w-1 bg-[#202833]' : i % 2 === 0 ? 'w-0.5 bg-[#202833]' : 'w-0.5 bg-gray-300'}`}
                              />
                            ))}
                          </div>
                          <div className="text-[8px] font-mono text-center text-[#202833] tracking-widest">
                            *{selectedStudent.studentId}*
                          </div>
                        </div>

                        <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#E2E8F0] flex justify-between">
                          <span>REGISTRAR SIGNATURE</span>
                          <span className="font-mono text-[#2E7D32]">VALID THRU: 08/2027</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-6 bg-[#F8FAF9] border-t border-[#E2E8F0] px-4 flex items-center justify-center text-[8px] font-mono text-[#64748B]">
                      SECURE DIGITAL IDENTITY POWERED BY SILICON LABS STUDENTBRIDGE
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-[#64748B] text-xs">
                Select a student record to preview and configure their ID card.
              </div>
            )}
          </div>

          {/* Status Progression Controls */}
          {selectedStudent && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#64748B] block">Current ID Status:</span>
                <span className="text-sm font-heading font-black text-[#202833]">
                  {currentProdStatus} &bull; Serial: {cardSerial}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange('READY')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-all"
                >
                  Mark Ready
                </button>
                <button
                  onClick={() => handleStatusChange('IN_PRODUCTION')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all"
                >
                  In Production
                </button>
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 hover:bg-[#85E510]/30 transition-all"
                >
                  Mark Completed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Production Print Jobs History */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-xs font-heading font-bold text-[#202833] uppercase tracking-wider flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#85E510]" />
            <span>ID Production Print Job History</span>
          </h2>
          <span className="text-xs font-mono text-[#64748B]">{printJobs.length} Logged Runs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 pl-6">Job ID</th>
                <th className="py-3">Timestamp</th>
                <th className="py-3">Operator</th>
                <th className="py-3">Card Template</th>
                <th className="py-3">Quantity</th>
                <th className="py-3 text-right pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {printJobs.map(job => (
                <tr key={job.id} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3 pl-6 font-mono font-bold text-[#202833]">{job.id}</td>
                  <td className="py-3 font-mono text-[#64748B] text-[11px]">{job.timestamp}</td>
                  <td className="py-3 font-semibold text-[#202833]">{job.operator}</td>
                  <td className="py-3 text-[#64748B]">{job.templateName}</td>
                  <td className="py-3 font-mono font-bold text-[#202833]">{job.studentCount} Cards</td>
                  <td className="py-3 text-right pr-6">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                      {job.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch 8-Up Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setBatchModalOpen(false)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-[#202833]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-[#202833] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#85E510]" />
              <span>Confirm 8-Up Batch Production Run</span>
            </h3>

            <p className="text-xs text-[#64748B] leading-relaxed">
              This will generate an imposed 8-card sheet layout optimized for standard A4 PVC Card printer trays.
              Each card will receive an incremented card serial number and a registered audit footprint.
            </p>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Batch Card Count:</span>
                <span className="font-bold text-[#202833]">{selectedIds.size > 0 ? selectedIds.size : Math.min(filteredStudents.length, 8)} Students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Template:</span>
                <span className="font-bold text-[#202833]">{selectedTemplate?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Target Destination:</span>
                <span className="font-mono text-[#0284C7] font-bold">Standard PVC Duplex Tray</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-xs font-bold text-[#64748B] hover:text-[#202833]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleBatchPrint}
                className="px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Execute Batch Run</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
