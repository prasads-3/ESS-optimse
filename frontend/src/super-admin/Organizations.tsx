import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import { TableStatus, UsageBar, PlanBadge } from './components/SuperAdminAtoms';
import { API_BASE_URL } from '../config';

export default function Organizations() {
  const { setModalOpen, orgs, setManageOrgData, setViewOrgData }: any = useOutletContext();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">All Organizations</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Tenant management & subscription overview</p>
          </div>
          <button
            onClick={() => setModalOpen({ type: 'org' })}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors shadow-md shadow-indigo-600/20"
          >
            <Plus size={15} /> Add Organization
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="text-left py-3 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Users</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-40">Usage</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Expiry</th>
                <th className="text-center py-3 px-6 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(orgs || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Building2 className="mx-auto w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-[13px] font-semibold text-slate-400">No organizations yet</p>
                    <p className="text-[11px] text-slate-300 mt-1">Click "Add Organization" to get started</p>
                  </td>
                </tr>
              ) : (orgs || []).map((org: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                  onClick={() => setViewOrgData(org)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      {org.logo ? (
                        <img
                          src={org.logo.startsWith('/') ? `${API_BASE_URL}${org.logo}` : org.logo}
                          className="w-7 h-7 rounded-lg object-contain border border-slate-100 bg-white"
                          alt=""
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-indigo-500">{org.name?.[0] || '?'}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[13px] font-semibold text-slate-800">{org.name}</span>
                        {org.industry && <p className="text-[10px] text-slate-400 font-medium">{org.industry}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <PlanBadge plan={org.subscriptionPlan?.name || org.plan || 'No Plan'} />
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[13px] text-slate-500 font-medium tabular-nums">{org.used} / {org.limit}</span>
                  </td>
                  <td className="py-4 px-4 min-w-[140px]">
                    <UsageBar used={org.used} limit={org.limit} status={org.status} />
                  </td>
                  <td className="py-4 px-4">
                    <TableStatus status={org.status} />
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">
                      {org.endDate
                        ? new Date(org.endDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
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
