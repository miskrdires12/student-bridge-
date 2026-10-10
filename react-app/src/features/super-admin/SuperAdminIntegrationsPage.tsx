import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Server, ArrowUpRight, ShieldCheck, Zap, Activity } from 'lucide-react';
import { StudentCoreRequest } from '@/types';

export const SuperAdminIntegrationsPage: React.FC = () => {
  const [requests, setRequests] = useState<StudentCoreRequest[]>([
    { id: 'REQ-9102', school: 'YMS', device: 'CAM-A01', studentId: 'SB-2026-10492', type: 'BIOMETRIC_SYNC', timestamp: 'Just now', authStatus: 'AUTHORIZED', syncStatus: 'SUCCESS', latency: '12ms' },
    { id: 'REQ-9101', school: 'Adika Youth', device: 'CAM-B04', studentId: 'SB-2026-10491', type: 'PHOTO_R2_STREAM', timestamp: '3s ago', authStatus: 'AUTHORIZED', syncStatus: 'SUCCESS', latency: '14ms' },
    { id: 'REQ-9100', school: 'School of America', device: 'STATION-02', studentId: 'SB-2026-10490', type: 'IDENTITY_RECORD', timestamp: '6s ago', authStatus: 'AUTHORIZED', syncStatus: 'SUCCESS', latency: '11ms' },
    { id: 'REQ-9099', school: 'Ferway', device: 'CAM-C01', studentId: 'SB-2026-10489', type: 'BIOMETRIC_SYNC', timestamp: '9s ago', authStatus: 'AUTHORIZED', syncStatus: 'SUCCESS', latency: '16ms' },
  ]);

  const [tickerActive, setTickerActive] = useState(true);

  // Live ticker updating every ~3 seconds
  useEffect(() => {
    if (!tickerActive) return;

    const schools = ['YMS', 'Adika Youth', 'School of America', 'Ferway', 'Warka', 'Yacine', 'Debebech'];
    const types = ['BIOMETRIC_SYNC', 'PHOTO_R2_STREAM', 'IDENTITY_RECORD', 'CARD_ISSUE_DISPATCH'];

    const interval = setInterval(() => {
      const randSchool = schools[Math.floor(Math.random() * schools.length)];
      const randType = types[Math.floor(Math.random() * types.length)];
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const randReqId = 'REQ-' + Math.floor(9103 + Math.random() * 500);
      const randLatency = Math.floor(9 + Math.random() * 12) + 'ms';

      const newReq: StudentCoreRequest = {
        id: randReqId,
        school: randSchool,
        device: `CAM-${randSchool.slice(0, 3).toUpperCase()}-0${Math.floor(Math.random() * 5 + 1)}`,
        studentId: `SB-2026-${randNum}`,
        type: randType,
        timestamp: 'Just now',
        authStatus: 'AUTHORIZED',
        syncStatus: 'SUCCESS',
        latency: randLatency,
      };

      setRequests(prev => [newReq, ...prev.slice(0, 19)]);
    }, 3000);

    return () => clearInterval(interval);
  }, [tickerActive]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">StudentCore Live Sync Pipeline</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#85E510] animate-pulse" />
              <span>3-Second Edge Ticker Active</span>
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time biometric sync stream connecting field stations to StudentCore National Registry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTickerActive(!tickerActive)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              tickerActive ? 'bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black' : 'bg-gray-100 text-[#64748B] hover:text-[#202833]'
            }`}
          >
            {tickerActive ? 'Live Ticker Running' : 'Ticker Paused'}
          </button>
        </div>
      </div>

      {/* Sync Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Sync Latency SLA</span>
          <div className="mt-2 text-2xl font-heading font-black text-[#2E7D32]">12.4 ms</div>
          <div className="text-xs text-[#64748B] mt-1">Cloudflare Edge &bull; Instant Ingestion</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Packet Success Rate</span>
          <div className="mt-2 text-2xl font-heading font-black text-[#0284C7]">100.0%</div>
          <div className="text-xs text-[#0369A1] mt-1 font-semibold">Zero dropped packets over last 24h</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Target Endpoint</span>
          <div className="mt-2 text-sm font-mono text-purple-800 font-bold">api.studentcore.gov.et</div>
          <div className="text-xs text-[#64748B] mt-1">mTLS TLS 1.3 Certified</div>
        </div>
      </div>

      {/* Real-time Ticker Feed */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-xs font-heading font-bold text-[#202833] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#85E510]" />
            <span>Biometric Synchronization Stream</span>
          </h2>
          <span className="text-xs font-mono text-[#64748B]">Displaying 20 recent events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-6">Event ID</th>
                <th className="py-3.5">Campus Hub</th>
                <th className="py-3.5">Terminal Device</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">Sync Type</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 text-right pr-6">Edge Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {requests.map((r, i) => (
                <tr key={r.id + i} className="hover:bg-[#F8FAF9] transition-colors">
                  <td className="py-3 pl-6 font-mono text-[#64748B] text-[11px]">{r.id}</td>
                  <td className="py-3 font-semibold text-[#202833]">{r.school}</td>
                  <td className="py-3 font-mono text-[#64748B] text-[11px]">{r.device}</td>
                  <td className="py-3 font-mono font-bold text-[#202833]">{r.studentId}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {r.type}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30 flex items-center gap-1 w-max">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{r.syncStatus}</span>
                    </span>
                  </td>
                  <td className="py-3 text-right pr-6 font-mono text-[#2E7D32] font-bold">{r.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
