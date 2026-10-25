import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Download, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { getAuthHeaders } from '@/lib/store';

// The payroll a person is paid from has to come from the row store, in the calendar the stations
// work in, and it has to prove its own arithmetic before it is shown. This page renders exactly the
// answer /api/senders/payroll gives: it does not add a browser-side counter to a server figure, and
// it never displays an estimate where a read failed.

type PayrollSender = {
  key: string;
  label: string;
  userId: string | null;
  accountFound: boolean;
  role: string | null;
  branch: string | null;
  school: string | null;
  today: number;
  week: number;
  month: number;
  rangeTotal: number;
  daily: Record<string, number>;
  namesSeen: string[];
  senderIds: string[];
  needsReview: boolean;
  reviewReasons: string[];
};

type PayrollResponse = {
  success: boolean;
  timezone?: string;
  generatedAt?: string;
  range?: { from: string; to: string };
  periods?: {
    today: string;
    week: { from: string; to: string };
    month: { from: string; to: string };
  };
  scope?: 'SELF' | 'ALL';
  senders?: PayrollSender[];
  totals?: {
    rowsInRange: number;
    bucketSum: number;
    attributedRows: number;
    unattributedRows: number;
    undatedRows: number;
    reconciles: boolean;
    senderCount: number;
  };
  note?: string;
  error?: string;
  message?: string;
};

const isoDate = (d: Date) => d.toISOString().substring(0, 10);

export const SenderPayrollPage: React.FC = () => {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [data, setData] = useState<PayrollResponse | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openSender, setOpenSender] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    setIsLoading(true);
    setFailure(null);
    try {
      const res = await fetch(`/api/senders/payroll?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: { ...getAuthHeaders() }
      });
      const body: PayrollResponse = await res.json();
      if (!res.ok || !body.success) {
        setData(null);
        setFailure(body.message || body.error || `The payroll report did not answer (HTTP ${res.status}). No figure is being substituted.`);
        return;
      }
      setData(body);
    } catch (err) {
      setData(null);
      setFailure('The payroll report could not be reached. Nothing here is estimated - check the connection and reload.');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const senders = data?.senders || [];
  const totals = data?.totals || null;
  const periods = data?.periods;

  const reviewCount = useMemo(() => senders.filter(s => s.needsReview).length, [senders]);

  const exportCsv = () => {
    if (!data) return;
    const head = ['Sender', 'Account id', 'Role', 'Branch', 'School', 'Today', 'This week', 'This month', `Range ${data.range?.from}..${data.range?.to}`, 'Needs review', 'Review reasons', 'Spelling variants', 'Sender ids on the rows'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(',')];
    for (const s of senders) {
      lines.push([
        s.label, s.userId || '', s.role || '', s.branch || '', s.school || '',
        s.today, s.week, s.month, s.rangeTotal,
        s.needsReview ? 'YES' : '', s.reviewReasons.join('; '),
        s.namesSeen.join(' / '), s.senderIds.join(' / ')
      ].map(esc).join(','));
    }
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studentbridge-payroll-${data.range?.from || ''}_${data.range?.to || ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#0B1118] tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#4D8A07]" />
            <span>Sender Payroll Report</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Counts read from the authoritative row store, bucketed by calendar day in {data?.timezone || 'Africa/Addis_Ababa'}.
            {periods && (
              <span className="font-mono">
                {' '}Week {periods.week.from} to {periods.week.to} &bull; Month {periods.month.from} to {periods.month.to}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-[10px] font-black text-[#64748B] uppercase tracking-wider">
            <span>From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="block mt-1 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-mono"
            />
          </label>
          <label className="text-[10px] font-black text-[#64748B] uppercase tracking-wider">
            <span>To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="block mt-1 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs font-mono"
            />
          </label>
          <button
            type="button"
            onClick={loadPayroll}
            disabled={isLoading}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1118] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="py-2 px-3.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] disabled:opacity-50 text-[#062404] text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {failure && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs font-bold flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{failure}</span>
        </div>
      )}

      {data && totals && (
        <div className={`p-4 rounded-2xl border-2 text-xs ${totals.reconciles
          ? 'bg-emerald-50 border-[#9EE617] text-[#1F3A05]'
          : 'bg-rose-50 border-rose-400 text-rose-950'}`}>
          <div className="font-heading font-black text-sm uppercase tracking-wide">
            {totals.reconciles
              ? `Reconciled: ${totals.bucketSum} records = ${totals.rowsInRange} rows in the range`
              : `Does not reconcile: buckets add to ${totals.bucketSum}, the range holds ${totals.rowsInRange} rows`}
          </div>
          <p className="mt-1 font-medium">{data.note}</p>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            <span>Attributed: <strong>{totals.attributedRows.toLocaleString()}</strong></span>
            <span>No sender on row: <strong>{totals.unattributedRows.toLocaleString()}</strong></span>
            <span>Undated rows: <strong>{totals.undatedRows.toLocaleString()}</strong></span>
            <span>Senders listed: <strong>{totals.senderCount.toLocaleString()}</strong></span>
          </div>
          {data.scope === 'SELF' && (
            <p className="mt-2 text-[11px] font-bold">
              This station is signed in as a sender, so the report shows only its own records.
            </p>
          )}
          {reviewCount > 0 && (
            <p className="mt-2 text-[11px] font-bold flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {reviewCount} sender {reviewCount === 1 ? 'group needs review' : 'groups need review'} before these figures are paid out:
                the rows carry more than one id or spelling, or carry no sender at all.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-heading font-black text-[#0B1118] uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-[#4D8A07]" />
            <span>Per-sender output</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            {data ? `Generated ${data.generatedAt?.replace('T', ' ').substring(0, 19) || ''}` : 'No report loaded'}
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-black">
            <tr>
              <th className="py-3 pl-5">Sender</th>
              <th className="py-3">Account</th>
              <th className="py-3 text-right">Today</th>
              <th className="py-3 text-right">This week</th>
              <th className="py-3 text-right">This month</th>
              <th className="py-3 text-right">In range</th>
              <th className="py-3 pr-5">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {senders.map((s) => {
              const days = Object.entries(s.daily)
                .filter(([d, c]) => c > 0 && (!data?.range || (d >= data.range.from && d <= data.range.to)))
                .sort((a, b) => b[0].localeCompare(a[0]));
              const isOpen = openSender === s.key;
              return (
                <React.Fragment key={s.key}>
                  <tr
                    className="hover:bg-[#F8FAF9] cursor-pointer transition-colors"
                    onClick={() => setOpenSender(isOpen ? null : s.key)}
                  >
                    <td className="py-3 pl-5">
                      <div className="font-bold text-[#0B1118]">{s.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {s.school || 'no school'} {s.branch ? `• ${s.branch}` : ''}
                      </div>
                    </td>
                    <td className="py-3">
                      {s.accountFound ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/15 text-[#366804] border border-[#85E510]/30">
                          {s.role || 'SENDER'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-300">
                          {s.key.startsWith('unattributed') ? 'no sender id' : 'no account'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono font-black text-[#202833]">{s.today.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono font-black text-[#202833]">{s.week.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono font-black text-[#4D8A07]">{s.month.toLocaleString()}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-600">{s.rangeTotal.toLocaleString()}</td>
                    <td className="py-3 pr-5">
                      {s.needsReview ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Review</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">clean</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-[#F8FAF9]">
                      <td colSpan={7} className="px-5 py-3">
                        {s.needsReview && (
                          <div className="text-[11px] font-bold text-amber-900 mb-2">
                            Why this needs review: {s.reviewReasons.join('; ')}
                          </div>
                        )}
                        {s.namesSeen.length > 1 && (
                          <div className="text-[11px] text-slate-600 mb-1">
                            Spellings on the rows: {s.namesSeen.join(' / ')}
                          </div>
                        )}
                        {s.senderIds.length > 0 && (
                          <div className="text-[11px] text-slate-600 mb-2 font-mono">
                            senderId values: {s.senderIds.join(' / ')}
                          </div>
                        )}
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                          Days worked in range ({days.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {days.length === 0 ? (
                            <span className="text-[11px] text-slate-500">No dated record in this range.</span>
                          ) : (
                            days.map(([d, c]) => (
                              <span key={d} className="px-2 py-1 rounded-lg bg-white border border-[#CBD5E1] font-mono text-[11px]">
                                {d}: <strong className="text-[#256002]">{c}</strong>
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!isLoading && senders.length === 0 && !failure && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-xs text-slate-500">
                  The row store holds no sender record in this range. Nothing is being shown in its place.
                </td>
              </tr>
            )}
            {isLoading && senders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Reading the row store...</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500 px-1">
        A week runs Monday to Sunday and a month is the calendar month, both in the station timezone;
        "In range" is the window chosen above, so it can be smaller or larger than the month column.
      </p>
    </div>
  );
};

export default SenderPayrollPage;
