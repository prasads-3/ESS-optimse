import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Layers, Users, Check } from 'lucide-react';

export default function SubscriptionPlans() {
  const { setModalOpen, plans, plansLoading }: any = useOutletContext();
  const safePlans = Array.isArray(plans) ? plans : [];

  const parseFeatures = (features: any): string[] => {
    if (Array.isArray(features)) return features;
    if (typeof features === 'string') {
      try { return JSON.parse(features); } catch { return []; }
    }
    return [];
  };

  const colorMap: Record<string, { badge: string; icon: string; border: string; bg: string; accent: string }> = {
    emerald: { badge: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-500', accent: 'text-emerald-700' },
    blue: { badge: 'text-blue-700 bg-blue-50 border-blue-100', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-200', bg: 'bg-blue-500', accent: 'text-blue-700' },
    purple: { badge: 'text-violet-700 bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', border: 'border-violet-200', bg: 'bg-violet-500', accent: 'text-violet-700' },
  };

  const getColor = (plan: any) => colorMap[plan?.color] || colorMap['blue'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-slate-800">Subscription Plans</h2>
          <p className="text-[12px] text-slate-400 font-medium mt-0.5">Manage tiers and feature access</p>
        </div>
        <button
          onClick={() => setModalOpen({ type: 'createPlan' })}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors shadow-md shadow-indigo-600/20"
        >
          <Plus size={15} /> Create Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plansLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col animate-pulse">
              <div className="h-1 w-full bg-slate-100" />
              <div className="p-6 space-y-4">
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-8 w-32 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="space-y-2 pt-3">
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                  <div className="h-3 w-4/6 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : safePlans.length === 0 ? (
          <div className="col-span-3 py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <Layers className="mx-auto w-10 h-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-slate-400">No active plans</p>
            <p className="text-[12px] text-slate-300 mt-1">Create your first subscription plan</p>
          </div>
        ) : safePlans.map((plan: any, i: number) => {
          const c = getColor(plan);
          const features = parseFeatures(plan?.features);
          return (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
            >
              {/* Card top accent */}
              <div className={`h-1 w-full ${c.bg}`} />

              <div className="p-6 flex-1 flex flex-col">
                {/* Plan name + popular badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${c.badge}`}>
                    {plan?.name || 'Plan'}
                  </span>
                  {i === 1 && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[22px] font-bold text-slate-800 tracking-tight">
                    ₹{(plan?.price || 0).toLocaleString()}
                  </span>
                  <span className="text-[12px] text-slate-400 font-medium">/ month</span>
                </div>

                {/* User limit */}
                <div className="flex items-center gap-1.5 mb-5">
                  <Users size={12} className="text-slate-400" />
                  <span className="text-[12px] text-slate-400 font-medium">Up to {plan?.userLimit || 0} users</span>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 mb-5" />

                {/* Features */}
                <div className="space-y-2.5 flex-1">
                  {features.length === 0 ? (
                    <p className="text-[12px] text-slate-300 italic">No features listed</p>
                  ) : features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={9} className="text-slate-500" />
                      </div>
                      <span className="text-[12px] text-slate-600 font-medium leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => setModalOpen({ type: 'editPlan', data: { ...plan, features: parseFeatures(plan.features) } })}
                    className="flex-1 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setModalOpen({ type: 'assignPlan', plan })}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold shadow-sm shadow-indigo-600/20 transition-all"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
