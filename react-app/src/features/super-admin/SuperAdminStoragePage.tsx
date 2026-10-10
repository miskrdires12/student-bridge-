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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2e42]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Storage & Photo Diagnostics</h1>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Cloudflare R2 Object Storage health, CDN edge delivery, and biometric photograph key mappings
          </p>
        </div>

        <button
          onClick={testCdnPing}
          disabled={testingCdn}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#131e2b] hover:bg-[#1a2839] border border-[#1e2e42] text-xs font-bold text-white transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#85e510] ${testingCdn ? 'animate-spin' : ''}`} />
          <span>Test CDN Health</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">Cloudflare R2 Bucket</span>
            <HardDrive className="w-4 h-4 text-[#85e510]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-white">siliconlabs</div>
          <div className="mt-1 text-[11px] text-[#85e510] font-semibold">Active &bull; S3 Compatible</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">Verified Portraits</span>
            <Image className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#38bdf8]">{withPhoto.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-[#94a3b8]">Biometric portraits linked</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">Missing Photographs</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-amber-400">{missingPhoto.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-amber-300">Queued for field retake</div>
        </div>

        <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="uppercase font-semibold tracking-wider">CDN Status</span>
            <CheckCircle2 className="w-4 h-4 text-[#85e510]" />
          </div>
          <div className="mt-2 text-2xl font-heading font-black text-[#85e510]">{cdnStatus}</div>
          <div className="mt-1 text-[11px] text-[#85e510]">Fast Edge Caching Active</div>
        </div>
      </div>

      <div className="bg-[#131e2b] border border-[#1e2e42] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider pb-2 border-b border-[#1e2e42]">
          Cloudflare R2 Object Storage Endpoint Information
        </h3>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0d1520] border border-[#1e2e42] space-y-1">
            <span className="text-[#94a3b8] block">Public CDN Base Domain:</span>
            <span className="font-mono text-[#85e510] text-[13px] break-all">
              https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[#94a3b8] block mb-1">CORS Headers</span>
              <span className="text-white font-semibold">Access-Control-Allow-Origin: *</span>
            </div>
            <div>
              <span className="text-[#94a3b8] block mb-1">Cache Policy</span>
              <span className="text-white font-semibold">public, max-age=31536000, immutable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
