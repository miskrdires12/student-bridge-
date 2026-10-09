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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">StudentCore Live Sync Pipeline</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/30 uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8fe617] animate-pulse" />
              <span>3-Second Edge Ticker Active</span>
            </span>
          </div>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Real-time biometric sync stream connecting field stations to StudentCore National Registry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTickerActive(!tickerActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tickerActive ? 'bg-[#8fe617] text-[#062404]' : 'bg-white/10 text-white'
            }`}
          >
            {tickerActive ? 'Live Ticker Running' : 'Ticker Paused'}
          </button>
        </div>
      </div>

      {/* Sync Health Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Sync Latency SLA</span>
          <div className="mt-2 text-2xl font-heading font-black text-[#8fe617]">12.4 ms</div>
          <div className="text-xs text-[#9eb2a6] mt-1">Cloudflare Edge &bull; Instant Ingestion</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Sync Packet Success Rate</span>
          <div className="mt-2 text-2xl font-heading font-black text-white">100.0%</div>
          <div className="text-xs text-blue-400 mt-1">Zero dropped packets over last 24h</div>
        </div>

        <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5">
          <span className="text-xs font-semibold text-[#9eb2a6] uppercase tracking-wider">Target Endpoint</span>
          <div className="mt-2 text-sm font-mono text-purple-300">api.studentcore.gov.et</div>
          <div className="text-xs text-[#9eb2a6] mt-1">mTLS TLS 1.3 Certified</div>
        </div>
      </div>

      {/* Real-time Ticker Feed */}
      <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1e2c22] flex items-center justify-between">
          <h2 className="text-xs font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8fe617]" />
            <span>Live Transaction Stream</span>
          </h2>
          <span className="text-[11px] font-mono text-[#9eb2a6]">Polling: ~3s interval</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070908] border-b border-[#1e2c22] text-[#9eb2a6] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 pl-4">Request ID</th>
                <th className="py-3">Campus Hub</th>
                <th className="py-3">Origin Device</th>
                <th className="py-3">Student ID</th>
                <th className="py-3">Sync Event Type</th>
                <th className="py-3">Latency</th>
                <th className="py-3 text-right pr-4">Edge Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2c22]/60 font-mono">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-4 text-[#8fe617] font-semibold">{req.id}</td>
                  <td className="py-3 text-white font-sans">{req.school}</td>
                  <td className="py-3 text-[#9eb2a6]">{req.device}</td>
                  <td className="py-3 text-white">{req.studentId}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-purple-300 font-bold text-[10px]">
                      {req.type}
                    </span>
                  </td>
                  <td className="py-3 text-emerald-400 font-bold">{req.latency}</td>
                  <td className="py-3 text-right pr-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8fe617]/15 text-[#8fe617] font-bold text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{req.syncStatus}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
