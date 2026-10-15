import React, { memo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, ShieldCheck, Layers, Activity, ExternalLink } from 'lucide-react';
import { StatCard, UsageBar, TableStatus, PlanBadge } from './components/SuperAdminAtoms';
import { Skeleton } from '@/components/ui/skeleton';

const KpiSkeleton = memo(() => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
    <Skeleton className="h-9 w-9 rounded-xl mb-4" />
    <Skeleton className="h-3 w-20 mb-2" />
    <Skeleton className="h-7 w-24" />
  </div>
));

const TableRowSkeleton = memo(() => (
  <tr>
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="py-4 px-4"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
    ))}
  </tr>
));

export default function Dashboard() {
  const { orgs, setManageOrgData, setViewOrgData, stats, statsLoading, orgsLoading }: any = useOutletContext();

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-400">

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading && !stats ? (
          <>
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={Building2} label="Total Orgs" value={stats?.stats?.totalOrgs ?? '—'} delta={stats?.stats?.growth?.totalOrgs} up />
            <StatCard icon={ShieldCheck} label="Active Subs" value={stats?.stats?.activeSubs ?? '—'} delta={stats?.stats?.growth?.activeSubs} up />
            <StatCard icon={Layers} label="Allocated" value={stats?.stats?.allocated?.toLocaleString() ?? '—'} delta={stats?.stats?.growth?.allocated} up />
            <StatCard icon={Activity} label="Utilization" value={stats?.stats?.utilization ?? '—'} delta={stats?.stats?.growth?.utilization} up />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-6">Plan Distribution</h3>
          <div className="flex flex-col items-center">
            <div className="relative w-36 h-36 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#6366f1" strokeWidth="10" strokeDasharray="160 239" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#a78bfa" strokeWidth="10" strokeDasharray="50 239" strokeDashoffset="-160" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">{stats?.stats?.activeSubs || 0}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Active</span>
              </div>
            </div>
            <div className="w-full space-y-2.5">
              {(stats?.planDistribution || []).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color || 'bg-indigo-400'}`} />
                    <span className="text-[12px] font-medium text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-[12px] font-bold text-slate-700">{item.count}</span>
                </div>
              ))}
              {(!stats?.planDistribution || stats.planDistribution.length === 0) && (
                <p className="text-center text-[12px] text-slate-400">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">License Allocation Trend</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Last 7 months</p>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 px-1 pb-4 min-h-[180px]">
            {(stats?.allocationTrend || [0, 0, 0, 0, 0, 0, 0]).map((val: number, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${i === 6 ? 'bg-indigo-500' : 'bg-indigo-100'} group-hover:brightness-110`}
                  style={{ height: `${Math.max(val, 4)}%`, minHeight: '4px' }}
                />
                <span className="text-[9px] font-semibold text-slate-400 uppercase">
                  {['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100 flex gap-8">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Capacity</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{stats?.summary?.total?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Used</p>
              <p className="text-sm font-bold text-indigo-600 mt-1">{stats?.summary?.used?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Free</p>
              <p className="text-sm font-bold text-emerald-600 mt-1">{stats?.summary?.free?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Organization License Usage</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Live allocation status per tenant</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3.5 py-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors">Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="text-left py-3 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Users</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-40">Usage</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pricing</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Expiry</th>
                <th className="text-center py-3 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgsLoading && (orgs || []).length === 0 ? (
                <>
                  <TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton /><TableRowSkeleton />
                </>
              ) : (orgs || []).length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-[13px] text-slate-400">No organizations found</td></tr>
              ) : (orgs || []).map((org: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  onClick={() => setViewOrgData(org)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {org.logo ? (
                        <img src={org.logo.startsWith('/') ? `${org.logo}` : org.logo} className="w-7 h-7 rounded-lg object-contain border border-slate-100" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-indigo-600">{org.name?.[0] || '?'}</span>
                        </div>
                      )}
                      <span className="text-[13px] font-semibold text-slate-800">{org.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4"><PlanBadge plan={org.subscriptionPlan?.name || org.plan || 'No Plan'} /></td>
                  <td className="py-4 px-4"><span className="text-[13px] text-slate-500 font-medium tabular-nums">{org.used} / {org.limit}</span></td>
                  <td className="py-4 px-4 min-w-[140px]"><UsageBar used={org.used} limit={org.limit} status={org.status} /></td>
                  <td className="py-4 px-4">
                    <span className="text-[13px] font-bold text-slate-700">₹{(org.priceOverride || org.subscriptionPlan?.price || 0).toLocaleString()}</span>
                    {org.priceOverride && <span className="block text-[10px] text-indigo-500 font-semibold">Custom</span>}
                  </td>
                  <td className="py-4 px-4"><TableStatus status={org.status} /></td>
                  <td className="py-4 px-4">
                    <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">
                      {org.endDate ? new Date(org.endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setManageOrgData(org); }}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
