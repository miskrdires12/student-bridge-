import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 font-sans select-none">
      {/* Silicon Labs Monogram Logo Card */}
      <div className="w-16 h-16 rounded-2xl bg-white border border-[#E3EFD7] shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-center justify-center p-2.5 mb-3">
        <img
          src="/logo.png"
          alt="Silicon Labs"
          className="w-11 h-11 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/brand-logo.png';
          }}
        />
      </div>

      {/* Brand Title */}
      <div className="flex items-center gap-1.5 text-2xl font-black text-black tracking-tight font-heading">
        <span>SILICON</span>
        <span className="bg-[#85E510] text-black text-xs font-black px-2 py-0.5 rounded-md leading-none shadow-sm">
          LABS
        </span>
      </div>

      <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 tracking-wider uppercase mt-1 text-center">
        STUDENT IDENTITY & CARD MANUFACTURING PLATFORM
      </div>

      {/* Password Recovery Card */}
      <div className="w-full max-w-[390px] bg-white rounded-[24px] border border-[#DBEDC9] shadow-[0_12px_36px_rgba(0,0,0,0.03)] p-6 sm:p-7 mt-5">
        <div className="mb-5">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-black mb-3 font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
            Reset Password
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Enter your institutional email address to receive workstation recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 rounded-xl bg-[#F3FBE8] border border-[#CDEBB4] text-[#24470A] text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#24470A]">
              <CheckCircle2 className="w-4 h-4 text-[#6FBF0A]" />
              <span>No email was sent</span>
            </div>
            <p className="leading-relaxed">
              This terminal has no outbound mail service, so nothing was dispatched for{' '}
              <span className="font-bold text-slate-900">{email}</span>. Contact a Super Administrator to reset
              the password for that account.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block px-3 py-1.5 bg-[#85E510] hover:bg-[#76CF0C] text-black font-bold rounded-lg text-xs"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                INSTITUTIONAL EMAIL ADDRESS
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-[#85E510] focus:ring-2 focus:ring-[#85E510]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] active:bg-[#6DB80A] text-black font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>SEND RECOVERY CODE</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
