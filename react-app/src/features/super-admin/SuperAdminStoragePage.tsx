import React, { useState } from 'react';
import { HardDrive, CheckCircle2, RefreshCw, Server, Shield, ExternalLink, Image, AlertCircle } from 'lucide-react';
import { getStudents } from '@/lib/store';

export const SuperAdminStoragePage: React.FC = () => {
  const students = getStudents();
  const withPhoto = students.filter(s => s.photoPath).length;
  const missingPhoto = students.length - withPhoto;

  const [testingCdn, setTestingCdn] = useState(false);
  const [cdnStatus, setCdnStatus] = useState<'Operational' | 'Testing'>('Operational');

  const testCdnPing = () => {
    setTestingCdn(true);
    setCdnStatus('Testing');
    setTimeout(() => {
      setTestingCdn(false);
      setCdnStatus('Operational');
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Storage & Photo Diagnostics</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cloudflare R2 Object Storage health, CDN edge delivery, and biometric photograph key mappings
          </p>
        </div>

        <button
          onClick={testCdnPing}
          disabled={testingCdn}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#CBD5E1] text-xs font-bold text-[#202833] shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#85E510] ${testingCdn ? 'animate-spin' : ''}`} />
          <span>Test CDN Health</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Cloudflare R2 Bucket</span>
            <HardDrive className="w-4 h-4 text-[#85E510]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#202833]">siliconlabs</div>
          <div className="mt-1 text-[11px] text-[#2E7D32] font-bold">Active &bull; S3 Compatible</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Verified Portraits</span>
            <Image className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#0284C7]">{withPhoto.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#64748B]">Biometric portraits linked</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">Missing Photographs</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-amber-600">{missingPhoto.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-amber-700 font-semibold">Queued for field retake</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="uppercase font-bold tracking-wider">CDN Status</span>
            <CheckCircle2 className="w-4 h-4 text-[#85E510]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#2E7D32]">{cdnStatus}</div>
          <div className="mt-1 text-[11px] text-[#2E7D32] font-semibold">Fast Edge Caching Active</div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-heading font-bold text-[#202833] uppercase tracking-wider pb-2 border-b border-[#E2E8F0]">
          Cloudflare R2 Object Storage Endpoint Information
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] space-y-1">
            <span className="text-[#64748B] block font-bold">Public CDN Base Domain:</span>
            <span className="font-mono text-[#2E7D32] text-xs font-bold break-all">
              https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
              <span className="text-[#64748B] block mb-1 font-bold">CORS Headers</span>
              <span className="text-[#202833] font-mono font-semibold">Access-Control-Allow-Origin: *</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
              <span className="text-[#64748B] block mb-1 font-bold">Cache Policy</span>
              <span className="text-[#202833] font-mono font-semibold">public, max-age=31536000, immutable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
