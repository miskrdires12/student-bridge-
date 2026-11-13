import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Shared light + lime chrome for every station page.
 * Mirrors the Provision Operators hero so all sections read as one product.
 */

export const PageShell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`space-y-5 pb-12 ${className}`}>{children}</div>
);

type Tone = 'lime' | 'neutral' | 'danger' | 'amber' | 'sky';

const toneChip: Record<Tone, string> = {
  lime: 'bg-[#EAF7DA] text-[#2F5E04] border-[#CDEBB4]',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200'
};

export const Chip: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'lime',
  children,
  className = ''
}) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${toneChip[tone]} ${className}`}>
    {children}
  </span>
);

export const LiveDot: React.FC<{ label?: string; tone?: string }> = ({ label = 'Live', tone = 'bg-[#6FBF0A]' }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF7DA] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#366804]">
    <span className="relative flex h-1.5 w-1.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${tone}`} />
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone}`} />
    </span>
    {label}
  </span>
);

export const PageHero: React.FC<{
  icon: LucideIcon;
  title: string;
  count?: string;
  live?: string | false;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  chips?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, count, live = 'Live fleet', subtitle, actions, chips, children }) => (
  <div className="relative overflow-hidden rounded-3xl border border-[#DBEDC9] bg-gradient-to-br from-white via-[#F8FDEF] to-[#ECF9DA] p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0B1118] shadow-sm">
          <Icon className="h-6 w-6 text-[#9EE617]" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-black tracking-tight text-[#0B1118]">{title}</h1>
            {count && (
              <span className="rounded-full border border-[#CDEBB4] bg-white/80 px-2.5 py-0.5 text-[11px] font-black text-[#2F5E04]">
                {count}
              </span>
            )}
            {live && <LiveDot label={live} />}
            {chips}
          </div>
          {subtitle && <p className="mt-1 max-w-2xl text-xs font-medium text-[#5C6B51]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

export const FactCard: React.FC<{ label: string; value: string | number; hint?: string; icon: LucideIcon }> = ({
  label,
  value,
  hint,
  icon: Icon
}) => (
  <div className="rounded-2xl border border-[#E3EFD7] bg-white/75 px-3.5 py-2.5 backdrop-blur-sm">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7C8B70]">{label}</span>
      <Icon className="h-3.5 w-3.5 text-[#6FBF0A]" />
    </div>
    <div className="mt-1 text-xl font-black tabular-nums tracking-tight text-[#0B1118]">{value}</div>
    {hint && <div className="text-[10px] font-medium text-[#8A9680]">{hint}</div>}
  </div>
);

export const FactGrid: React.FC<{ children: React.ReactNode; cols?: 3 | 4 | 5 | 6 }> = ({ children, cols = 5 }) => {
  const lgCols = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }[cols];
  return <div className={`mt-4 grid grid-cols-2 gap-2 sm:gap-3 ${lgCols}`}>{children}</div>;
};

export const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }> = ({
  icon: Icon,
  children,
  className = '',
  ...rest
}) => (
  <button
    type="button"
    {...rest}
    className={`inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E3E9DD] bg-white px-3 text-[11px] font-bold text-[#4B5B42] transition-colors hover:border-[#85E510] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {Icon && <Icon className="h-3.5 w-3.5 text-[#5C6B51]" />}
    {children}
  </button>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }> = ({
  icon: Icon,
  children,
  className = '',
  ...rest
}) => (
  <button
    type="button"
    {...rest}
    className={`inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#85E510] px-3.5 text-[11px] font-black text-[#062404] shadow-sm transition-colors hover:bg-[#76CF0C] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {children}
  </button>
);

export const SectionCard: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}> = ({ title, subtitle, icon: Icon, actions, children, className = '', padded = true }) => (
  <div className={`overflow-hidden rounded-2xl border border-[#E3EFD7] bg-white shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF4E5] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-[#6FBF0A]" />}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black tracking-tight text-[#0B1118]">{title}</h2>
            {subtitle && <p className="truncate text-[11px] font-medium text-[#7C8B70]">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={padded ? 'p-3.5' : ''}>{children}</div>
  </div>
);

export const StatusPill: React.FC<{ tone?: Tone; children: React.ReactNode; dot?: string }> = ({
  tone = 'neutral',
  children,
  dot
}) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneChip[tone]}`}>
    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
    {children}
  </span>
);

export const EmptyState: React.FC<{ icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon: Icon,
  title,
  hint,
  action
}) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#DBEDC9] bg-[#FBFDF7] px-4 py-10 text-center">
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF7DA]">
      <Icon className="h-5 w-5 text-[#3F7A06]" />
    </div>
    <p className="text-sm font-bold text-[#0B1118]">{title}</p>
    {hint && <p className="max-w-sm text-[11px] font-medium text-[#7C8B70]">{hint}</p>}
    {action}
  </div>
);
