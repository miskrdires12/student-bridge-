import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Download, RefreshCw, ShieldAlert, Users, Database, UserCheck, UserX } from 'lucide-react';
import { getAuthHeaders } from '@/lib/store';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, ToolbarButton, PrimaryButton, Chip } from '@/components/ui/PageKit';

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
    <PageShell>
      <PageHero
        icon={Activity}
        title="Sender Payroll Report"
        count={data ? `${senders.length} senders` : 'awaiting report'}
        live={data ? 'Row store' : false}
        subtitle={
          <>
            Counts read from the authoritative row store, bucketed by calendar day in {data?.timezone || 'Africa/Addis_Ababa'} and proved against the rows in the range.
            {periods && (
              <span className="font-mono">
                {' '}Week {periods.week.from} to {periods.week.to} &bull; Month {periods.month.from} to {periods.month.to}
              </span>
            )}
          </>
        }
        actions={
          <>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7C8B70]">
              <span>From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-xl border border-[#E3E9DD] bg-white px-2.5 py-1.5 font-mono text-xs text-[#0B1118] focus:border-[#85E510] focus:outline-none"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7C8B70]">
              <span>To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-xl border border-[#E3E9DD] bg-white px-2.5 py-1.5 font-mono text-xs text-[#0B1118] focus:border-[#85E510] focus:outline-none"
              />
            </label>
            <ToolbarButton icon={RefreshCw} onClick={loadPayroll} disabled={isLoading} className="mt-4">
              Reload
            </ToolbarButton>
            <PrimaryButton icon={Download} onClick={exportCsv} disabled={!data} className="mt-4">
              Export CSV
            </PrimaryButton>
          </>
        }
      >
        <FactGrid cols={4}>
          <FactCard label="Rows in Range" value={totals ? totals.rowsInRange.toLocaleString() : '—'} hint={`${from} → ${to}`} icon={Database} />
          <FactCard label="Attributed" value={totals ? totals.attributedRows.toLocaleString() : '—'} hint="carry a sender id" icon={UserCheck} />
          <FactCard label="No Sender" value={totals ? totals.unattributedRows.toLocaleString() : '—'} hint="cannot be paid out" icon={UserX} />
          <FactCard label="Senders Listed" value={totals ? totals.senderCount.toLocaleString() : '—'} hint={`${reviewCount} needing review`} icon={Users} />
        </FactGrid>
      </PageHero>

      {failure && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-950">
          <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{failure}</span>
        </div>
      )}

      {data && totals && (
        <div className={`rounded-2xl border p-4 text-xs ${
          totals.reconciles
            ? 'border-[#CDEBB4] bg-[#F3FBE8] text-[#24470A]'
            : 'border-rose-300 bg-rose-50 text-rose-950'
        }`}>
          <div className="text-sm font-black uppercase tracking-wide">
            {totals.reconciles
              ? `Reconciled: ${totals.bucketSum.toLocaleString()} records = ${totals.rowsInRange.toLocaleString()} rows in the range`
              : `Does not reconcile: buckets add to ${totals.bucketSum.toLocaleString()}, the range holds ${totals.rowsInRange.toLocaleString()} rows`}
          </div>
          <p className="mt-1 font-medium">{data.note}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono sm:grid-cols-4">
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
            <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {reviewCount} sender {reviewCount === 1 ? 'group needs review' : 'groups need review'} before these figures are paid out:
                the rows carry more than one id or spelling, or carry no sender at all.
              </span>
            </p>
          )}
        </div>
      )}

      <SectionCard
        title="Per-sender output"
        subtitle={data ? `Generated ${data.generatedAt?.replace('T', ' ').substring(0, 19) || ''}` : 'No report loaded'}
        icon={Users}
        padded={false}
        actions={<Chip tone="neutral">{senders.length} rows</Chip>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EDF4E5] bg-[#FBFDF7] text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
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
            <tbody className="divide-y divide-[#EDF4E5]">
              {senders.map((s) => {
                const days = Object.entries(s.daily)
                  .filter(([d, c]) => c > 0 && (!data?.range || (d >= data.range.from && d <= data.range.to)))
                  .sort((a, b) => b[0].localeCompare(a[0]));
                const isOpen = openSender === s.key;
                return (
                  <React.Fragment key={s.key}>
                    <tr
                      className="cursor-pointer transition-colors hover:bg-[#F8FBF4]"
                      onClick={() => setOpenSender(isOpen ? null : s.key)}
                    >
                      <td className="py-3 pl-5">
                        <div className="font-bold text-[#0B1118]">{s.label}</div>
                        <div className="font-mono text-[10px] text-[#7C8B70]">
                          {s.school || 'no school'} {s.branch ? `• ${s.branch}` : ''}
                        </div>
                      </td>
                      <td className="py-3">
                        {s.accountFound ? (
                          <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                            {s.role || 'SENDER'}
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {s.key.startsWith('unattributed') ? 'no sender id' : 'no account'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-black text-[#0B1118]">{s.today.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono font-black text-[#0B1118]">{s.week.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono font-black text-[#3F7A06]">{s.month.toLocaleString()}</td>
                      <td className="py-3 text-right font-mono font-bold text-[#5C6B51]">{s.rangeTotal.toLocaleString()}</td>
                      <td className="py-3 pr-5">
                        {s.needsReview ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Review</span>
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-[#A6B29B]">clean</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-[#FBFDF7]">
                        <td colSpan={7} className="px-5 py-3">
                          {s.needsReview && (
                            <div className="mb-2 text-[11px] font-bold text-amber-900">
                              Why this needs review: {s.reviewReasons.join('; ')}
                            </div>
                          )}
                          {s.namesSeen.length > 1 && (
                            <div className="mb-1 text-[11px] text-[#5C6B51]">
                              Spellings on the rows: {s.namesSeen.join(' / ')}
                            </div>
                          )}
                          {s.senderIds.length > 0 && (
                            <div className="mb-2 font-mono text-[11px] text-[#5C6B51]">
                              senderId values: {s.senderIds.join(' / ')}
                            </div>
                          )}
                          <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-[#7C8B70]">
                            Days worked in range ({days.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {days.length === 0 ? (
                              <span className="text-[11px] text-[#8A9680]">No dated record in this range.</span>
                            ) : (
                              days.map(([d, c]) => (
                                <span key={d} className="rounded-lg border border-[#E3E9DD] bg-white px-2 py-1 font-mono text-[11px]">
                                  {d}: <strong className="text-[#2F5E04]">{c}</strong>
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
                  <td colSpan={7} className="px-5 py-6 text-xs text-[#8A9680]">
                    The row store holds no sender record in this range. Nothing is being shown in its place.
                  </td>
                </tr>
              )}
              {isLoading && senders.length === 0 && (
                <tr>
                  <td colSpan={7} className="flex items-center gap-2 px-5 py-6 text-xs text-[#8A9680]">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Reading the row store...</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <p className="px-1 text-[11px] text-[#8A9680]">
        A week runs Monday to Sunday and a month is the calendar month, both in the station timezone;
        "In range" is the window chosen above, so it can be smaller or larger than the month column.
      </p>
    </PageShell>
  );
};

export default SenderPayrollPage;
