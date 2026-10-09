import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, XCircle } from 'lucide-react';

export const SuperAdminRolesPage: React.FC = () => {
  const roles = [
    {
      name: 'SENDER',
      desc: 'Field station operators executing student registration, biometric camera capture, and photo uploads.',
      permissions: ['Register Student', 'Live Camera Biometrics', 'View Own Submissions', 'Update Field Tasks'],
      badge: 'bg-[#8fe617]/20 text-[#8fe617]'
    },
    {
      name: 'RECEIVER',
      desc: 'Central repository analysts inspecting directory records, mistake analyzer triage, and bulk exports.',
      permissions: ['Browse Full Directory', 'Review & Quality Verification', 'Mistake Analyzer Triage', 'ZIP / Excel Exports'],
      badge: 'bg-blue-500/20 text-blue-300'
    },
    {
      name: 'ADMIN',
      desc: 'Regional supervisors managing field sender workforce, assigning batch directives, and resetting hardware bindings.',
      permissions: ['Reset 1-Device Locks', 'Create & Delegate Tasks', 'Workforce KPIs & Velocity', 'Executive Reports'],
      badge: 'bg-amber-500/20 text-amber-300'
    },
    {
      name: 'SUPER_ADMIN',
      desc: 'Global root operators governing Cloudflare edge infrastructure, school branch schemas, and audit logs.',
      permissions: ['Full Root Access', 'RBAC User Management', 'School Branch Architecture', 'StudentCore Sync & DB Room'],
      badge: 'bg-purple-500/20 text-purple-300'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">Role-Based Access Control (RBAC)</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Operational boundary definitions and hardware enforcement rules for StudentBridge stations
          </p>
        </div>

        <span className="text-xs font-mono text-[#8fe617] bg-[#8fe617]/10 px-3 py-1 rounded-xl">
          4 Immutable Roles
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(r => (
          <div key={r.name} className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2c22]">
              <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${r.badge}`}>
                {r.name}
              </span>
              <span className="text-[10px] text-[#9eb2a6] font-mono">Station Policy Active</span>
            </div>

            <p className="text-xs text-[#9eb2a6] leading-relaxed">{r.desc}</p>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-[#9eb2a6] tracking-wider block">
                Authorized Capabilities:
              </span>
              {r.permissions.map(p => (
                <div key={p} className="flex items-center gap-2 text-xs text-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8fe617]" />
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
