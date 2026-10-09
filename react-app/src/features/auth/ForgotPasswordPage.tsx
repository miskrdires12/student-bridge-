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
    <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="mb-6">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-[#8fe617] hover:underline mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <h2 className="text-xl font-heading font-extrabold text-white tracking-tight">Reset Password</h2>
        <p className="text-xs text-[#9eb2a6] mt-1">
          Enter your registered email address to receive password reset instructions.
        </p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-xl bg-[#8fe617]/10 border border-[#8fe617]/30 text-[#8fe617] text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Reset Link Dispatched</span>
          </div>
          <p className="text-[#9eb2a6]">
            If an account exists for <span className="text-white font-mono">{email}</span>, a secure recovery code has been sent. Check your inbox or contact your Station Administrator.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block px-3 py-1.5 bg-[#8fe617] text-[#062404] font-bold rounded-lg text-xs"
            >
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9eb2a6] mb-1.5 uppercase tracking-wider">
              Operator Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9eb2a6]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@siliconlabs.et"
                className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#3f4743] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] font-bold text-sm shadow-[0_0_20px_rgba(143,230,23,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <span>Request Password Reset</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
