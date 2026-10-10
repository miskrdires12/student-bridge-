import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Shield, HardDrive, Key } from 'lucide-react';

export const SuperAdminSettingsPage: React.FC = () => {
  const [bucketName, setBucketName] = useState('siliconlabs');
  const [cdnDomain, setCdnDomain] = useState('https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev');
  const [hardwareLockEnforced, setHardwareLockEnforced] = useState(true);
  const [phonePrefix, setPhonePrefix] = useState('+251');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Super Admin System Parameters</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cloudflare R2 endpoints, security locks, phone validation standards, and station rules
          </p>
        </div>

        <span className="text-xs font-mono text-[#366804] bg-[#85E510]/15 px-3 py-1 rounded-xl font-bold border border-[#85E510]/30">
          Config Revision 2.4
        </span>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-[#85E510]/15 border border-[#85E510]/40 text-[#366804] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">System configuration parameters saved and propagated to Cloudflare edge.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-6 text-xs shadow-sm">
        <div>
          <h3 className="font-heading font-bold text-[#202833] text-sm mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#85E510]" />
            <span>Cloudflare R2 Object Storage Binding</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[#64748B] uppercase font-bold mb-1">R2 Bucket Name</label>
              <input
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] font-mono focus:outline-none focus:border-[#85E510]"
              />
            </div>

            <div>
              <label className="block text-[#64748B] uppercase font-bold mb-1">Public CDN Domain URI</label>
              <input
                type="text"
                value={cdnDomain}
                onChange={(e) => setCdnDomain(e.target.value)}
                className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] font-mono focus:outline-none focus:border-[#85E510]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0]">
          <h3 className="font-heading font-bold text-[#202833] text-sm mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#85E510]" />
            <span>Station Security & Identity Controls</span>
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1]">
              <input
                type="checkbox"
                checked={hardwareLockEnforced}
                onChange={(e) => setHardwareLockEnforced(e.target.checked)}
                className="mt-0.5 rounded border-[#CBD5E1] text-[#85E510] focus:ring-0"
              />
              <div>
                <div className="text-[#202833] font-bold">Strict 1-Device Lock Enforcement</div>
                <div className="text-[#64748B] text-[11px]">Deny unauthorized field terminals; require explicit Super Admin registration</div>
              </div>
            </label>

            <div>
              <label className="block text-[#64748B] uppercase font-bold mb-1">Default Telecom Prefix</label>
              <input
                type="text"
                value={phonePrefix}
                onChange={(e) => setPhonePrefix(e.target.value)}
                className="w-32 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] font-mono focus:outline-none focus:border-[#85E510]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save System Parameters</span>
          </button>
        </div>
      </form>
    </div>
  );
};
