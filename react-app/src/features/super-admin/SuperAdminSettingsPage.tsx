import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Shield, HardDrive, Key } from 'lucide-react';

export const SuperAdminSettingsPage: React.FC = () => {
  const [bucketName, setBucketName] = useState('siliconlabs');
  const [cdnDomain, setCdnDomain] = useState('https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev');
  const [hardwareLockEnforced, setHardwareLockEnforced] = useState(true);
  const [darkModeDefault, setDarkModeDefault] = useState(true);
  const [phonePrefix, setPhonePrefix] = useState('+251');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Super Admin System Parameters</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Cloudflare R2 endpoints, security locks, phone validation standards, and station rules
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          Config Revision 2.4
        </span>
      </div>

      {saved && (
        <div className="p-3 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/30 text-[#8fe617] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>System configuration parameters saved and propagated to Cloudflare edge.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 space-y-5 text-xs">
        <div>
          <h3 className="font-heading font-bold text-white text-sm mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#8fe617]" />
            <span>Cloudflare R2 Object Storage Binding</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">R2 Bucket Name</label>
              <input
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#8fe617]"
              />
            </div>

            <div>
              <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Public CDN Domain URI</label>
              <input
                type="text"
                value={cdnDomain}
                onChange={(e) => setCdnDomain(e.target.value)}
                className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#8fe617]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1e2c22]">
          <h3 className="font-heading font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8fe617]" />
            <span>Station Security & Identity Controls</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hardwareLockEnforced}
                onChange={(e) => setHardwareLockEnforced(e.target.checked)}
                className="rounded border-[#1e2c22] bg-[#070908] text-[#8fe617] focus:ring-0"
              />
              <div>
                <div className="text-white font-bold">Strict 1-Device Lock Enforcement</div>
                <div className="text-[#9eb2a6] text-[11px]">Prevent concurrent browser sessions for field sender operators</div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={darkModeDefault}
                onChange={(e) => setDarkModeDefault(e.target.checked)}
                className="rounded border-[#1e2c22] bg-[#070908] text-[#8fe617] focus:ring-0"
              />
              <div>
                <div className="text-white font-bold">Night Mode / Dark Theme by Default</div>
                <div className="text-[#9eb2a6] text-[11px]">Charcoal #202833 and Lime Green #85E510 palette</div>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1e2c22] flex justify-end">
          <button
            type="submit"
            className="py-2.5 px-6 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] font-extrabold text-xs shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
