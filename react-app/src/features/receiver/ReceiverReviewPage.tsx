import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, ArrowRight, User, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-[#64748B] text-xs">
        No student records available for review.
      </div>
    );
  }

  const photoSrc = current.previewPath || (current.photoPath ? `https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev/${current.photoPath.replace(/^\//, '')}` : null);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
            Biometric Review Queue
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Single-record inspection mode &bull; Verify portrait centering, background clarity, and metadata
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-[#366804] bg-[#85E510]/15 px-3 py-1 rounded-xl border border-[#85E510]/40">
          Record {currentIndex + 1} of {students.length}
        </span>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
        {/* Photo Stage */}
        <div className="w-48 h-60 rounded-2xl overflow-hidden border-2 border-[#85E510] shadow-md bg-[#F4F7F5] mb-5 flex items-center justify-center">
          {photoSrc ? (
            <img src={photoSrc} alt={current.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-amber-700 text-xs font-bold p-4">No Photograph Uploaded</div>
          )}
        </div>

        <h2 className="text-xl font-heading font-black text-[#202833]">{current.fullName}</h2>
        <div className="font-mono text-sm text-[#366804] font-bold mt-0.5">{current.studentId}</div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
          <span className="px-3 py-1 rounded-full bg-[#F8FAF9] border border-[#CBD5E1] text-[#202833] font-semibold">
            Campus: {current.school || 'YMS'}
          </span>
          <span className="px-3 py-1 rounded-full bg-[#F8FAF9] border border-[#CBD5E1] text-[#202833] font-semibold">
            Grade: {current.grade}
          </span>
          <span className="px-3 py-1 rounded-full bg-[#F8FAF9] border border-[#CBD5E1] text-[#202833] font-mono">
            Phone: {current.phone || 'N/A'}
          </span>
          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-mono font-bold border border-purple-200">
            Blood: {current.bloodType || 'Unknown'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 mt-8 w-full max-w-sm">
          <button
            type="button"
            onClick={handleFlag}
            className="flex-1 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-red-200"
          >
            <XCircle className="w-4 h-4" />
            <span>Flag Retake</span>
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="flex-1 py-3 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve & Verify</span>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between w-full text-xs text-[#64748B] pt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => (prev - 1 + students.length) % students.length)}
            className="hover:text-[#202833] font-semibold flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentIndex(prev => (prev + 1) % students.length)}
            className="hover:text-[#202833] font-semibold flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
