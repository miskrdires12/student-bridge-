import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, XCircle } from 'lucide-react';

export const SuperAdminRolesPage: React.FC = () => {
  const roles = [
    {
      name: 'SENDER',
      desc: 'Field station operators executing student registration, biometric camera capture, and photo uploads.',
      permissions: ['Register Student', 'Live Camera Biometrics', 'View Own Submissions', 'Update Field Tasks'],
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    {
      name: 'RECEIVER',
      desc: 'Central repository analysts inspecting directory records, mistake analyzer triage, and bulk exports.',
      permissions: ['Browse Full Directory', 'Review & Quality Verification', 'Mistake Analyzer Triage', 'ZIP / Excel Exports'],
      badge: 'bg-sky-100 text-sky-800 border-sky-200'
    },
    {
      name: 'ADMIN',
      desc: 'Regional supervisors managing field sender workforce, assigning batch directives, and resetting hardware bindings.',
      permissions: ['Reset 1-Device Locks', 'Create & Delegate Tasks', 'Workforce KPIs & Velocity', 'Executive Reports'],
      badge: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      name: 'SUPER_ADMIN',
      desc: 'Global root operators governing Cloudflare edge infrastructure, school branch schemas, and audit logs.',
      permissions: ['Full Root Access', 'RBAC User Management', 'School Branch Architecture', 'StudentCore Sync & DB Room'],
      badge: 'bg-purple-100 text-purple-800 border-purple-200'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">Role-Based Access Control (RBAC)</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Operational boundary definitions and hardware enforcement rules for StudentBridge stations
          </p>
        </div>

        <span className="text-xs font-mono text-[#366804] bg-[#85E510]/15 px-3 py-1 rounded-xl font-bold border border-[#85E510]/30">
          4 Immutable Roles
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(r => (
          <div key={r.name} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${r.badge}`}>
                {r.name}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">Station Policy Active</span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">{r.desc}</p>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                Authorized Capabilities:
              </span>
              {r.permissions.map(p => (
                <div key={p} className="flex items-center gap-2 text-xs text-[#202833]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
