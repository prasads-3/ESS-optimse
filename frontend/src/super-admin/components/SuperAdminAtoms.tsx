import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({ label, value, delta, up, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/40 pointer-events-none" />
      <div className="relative">
        <div className="flex justify-between items-start mb-5">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
            <Icon size={18} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
          </div>
          {delta !== undefined && (
            <div className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${up ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {delta}
            </div>
          )}
        </div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export function TableStatus({ status }: any) {
  const isExpiring = status === 'Expiring';
  const isExpired = status === 'Expired';
  const isActive = !isExpiring && !isExpired;

  const styles = isActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : isExpiring
    ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-rose-50 text-rose-700 border-rose-100';

  const dot = isActive ? 'bg-emerald-500' : isExpiring ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${styles}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      {status || 'Active'}
    </div>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const isPrime = plan === 'Prime' || plan === 'Premium';
  const isMedium = plan === 'Medium' || plan === 'Standard';

  const styles = isPrime
    ? 'border-violet-200 text-violet-700 bg-violet-50'
    : isMedium
    ? 'border-blue-200 text-blue-700 bg-blue-50'
    : 'border-slate-200 text-slate-600 bg-slate-50';

  return (
    <span className={`px-3 py-1 rounded-full border text-[11px] font-semibold ${styles} min-w-[72px] text-center inline-block`}>
      {plan}
    </span>
  );
}

export function UsageBar({ used, limit, status }: { used: number; limit: number; status: string }) {
  const safeLimit = limit > 0 ? limit : 1;
  const percentage = Math.min((used / safeLimit) * 100, 100);

  let barColor = 'bg-emerald-500';
  let trackColor = 'bg-emerald-100';
  if (status === 'Expired') { barColor = 'bg-rose-500'; trackColor = 'bg-rose-100'; }
  else if (status === 'Expiring' || percentage > 85) { barColor = 'bg-orange-500'; trackColor = 'bg-orange-100'; }

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={`flex-1 h-1.5 ${trackColor} rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full ${barColor} rounded-full`}
        />
      </div>
      <span className="text-[11px] font-medium text-slate-500 tabular-nums w-10 text-right">{Math.round(percentage)}%</span>
    </div>
  );
}
