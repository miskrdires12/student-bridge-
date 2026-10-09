import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, User, Eye } from 'lucide-react';
import { getStudents, updateStudent } from '@/lib/store';
import { Student } from '@/types';

export const ReceiverReviewPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setStudents(getStudents());
  }, []);

  const current = students[currentIndex];

  const handleApprove = () => {
    if (current) {
      updateStudent(current.id || current.studentId, { status: 'VERIFIED' });
      setCurrentIndex(prev => (prev + 1) % students.length);
    }
  };

  const handleFlag = () => {
    if (current) {
      updateStudent(current.id || current.studentId, { status: 'FLAGGED' });
      setCurrentIndex(prev => (prev + 1) % students.length);
    }
  };

  if (!current) {
    return <div className="text-white text-xs">No records available for review.</div>;
  }

  const photoSrc = current.previewPath || (current.photoPath ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${current.photoPath.replace(/^\//, '')}` : null);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Biometric Quality Review Queue</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Single-record inspection mode &bull; Verify portrait centering, background clarity, and metadata
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          Record {currentIndex + 1} of {students.length}
        </span>
      </div>

      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 shadow-xl flex flex-col items-center text-center">
        {/* Photo Stage */}
        <div className="w-48 h-60 rounded-2xl overflow-hidden border-2 border-[#8fe617]/60 shadow-[0_0_35px_rgba(143,230,23,0.3)] bg-[#070908] mb-4 flex items-center justify-center">
          {photoSrc ? (
            <img src={photoSrc} alt={current.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-amber-400 text-xs font-bold p-4">No Photograph Uploaded</div>
          )}
        </div>

        <h2 className="text-xl font-heading font-black text-white">{current.fullName}</h2>
        <div className="font-mono text-sm text-[#8fe617] mt-0.5">{current.studentId}</div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white font-medium">
            Campus: {current.school || 'YMS'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white font-medium">
            Grade: {current.grade}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white font-medium">
            Phone: {current.phone || 'N/A'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 font-mono font-bold">
            Blood: {current.bloodType || 'Unknown'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 mt-8 w-full max-w-sm">
          <button
            type="button"
            onClick={handleFlag}
            className="flex-1 py-3 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-red-500/30"
          >
            <XCircle className="w-4 h-4" />
            <span>Flag for Retake</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 py-3 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(143,230,23,0.3)]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Verify</span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between w-full text-xs text-[#9eb2a6] pt-4 border-t border-[#1e2c22]">
          <button
            onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : students.length - 1))}
            className="hover:text-white"
          >
            &larr; Previous Student
          </button>
          <span>Use keyboard arrows or buttons to navigate</span>
          <button
            onClick={() => setCurrentIndex(prev => (prev + 1) % students.length)}
            className="hover:text-white"
          >
            Skip Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
