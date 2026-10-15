import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../config';
import { PlanBadge, TableStatus } from '../SuperAdminAtoms';

export function AssignPlanModal({ plan, initialOrgId, orgs, plans, onClose, onSuccess }: any) {
  const [selectedOrg, setSelectedOrg] = useState(initialOrgId || '');
  const [selectedPlan, setSelectedPlan] = useState(plan?.id?.toString() || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset selected plan when organization changes
  useEffect(() => {
    if (selectedOrg) {
      const org = (orgs || []).find((o: any) => o.id.toString() === selectedOrg);
      if (org?.subscriptionPlan?.id) {
        setSelectedPlan(org.subscriptionPlan.id.toString());
      } else if (plan?.id) {
        setSelectedPlan(plan.id.toString());
      }
    }
  }, [selectedOrg]);

  const handleAssign = async () => {
    if (!selectedOrg) {
      toast.error('Please select an organization');
      return;
    }
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/organizations/${selectedOrg}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: parseInt(selectedPlan),
          startDate: startDate || null,
          endDate: endDate || null,
        }),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success('Plan assigned to organization successfully!');
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to assign plan');
      }
    } catch (e) {
      console.error(e);
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const parseFeatures = (features: any): string[] => {
    if (Array.isArray(features)) return features;
    if (typeof features === 'string') {
      try { return JSON.parse(features); } catch { return []; }
    }
    return [];
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Assign Plan to Organization</h2>
              <p className="text-slate-400 text-[13px] mt-1">Select which organization will receive this plan</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all flex-shrink-0">
              <X size={16} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="px-10 py-8 space-y-6 overflow-y-auto flex-1">

          {/* Organization Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Select Organization <span className="text-rose-500">*</span></label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer"
            >
              <option value="">— Choose an organization —</option>
              {(orgs || []).map((org: any) => (
                <option key={org.id} value={org.id}>
                  {org.name} {org.plan ? `(${org.plan})` : '(No plan)'}
                </option>
              ))}
            </select>
          </div>

          {/* Organization Preview */}
          {selectedOrg && (() => {
            const org = (orgs || []).find((o: any) => o.id.toString() === selectedOrg);
            if (!org) return null;

            return (
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Organization Preview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Name</label>
                    <p className="text-[13px] font-bold text-slate-800">{org.name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Current Plan</label>
                    <PlanBadge plan={org.plan || 'None'} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Users</label>
                    <p className="text-[13px] font-bold text-slate-800">{org.used || 0} / {org.limit || 0}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Status</label>
                    <TableStatus status={org.status || 'Active'} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Plan Selection */}
          {selectedOrg && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Select Plan to Assign <span className="text-rose-500">*</span></label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="">— Choose a plan —</option>
                {(plans || []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₹{(p.price || 0).toLocaleString()}/mo ({p.userLimit || 0} users)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Plan Preview */}
          {selectedPlan && (() => {
            const selectedPlanData = (plans || []).find((p: any) => p.id.toString() === selectedPlan);
            if (!selectedPlanData) return null;

            return (
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-[10px] font-bold tracking-widest mb-2 uppercase ${selectedPlanData?.color === 'emerald' ? 'text-emerald-500' : selectedPlanData?.color === 'blue' ? 'text-blue-500' : 'text-slate-500'}`}>
                      {selectedPlanData?.name || 'Unnamed Plan'}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-800">₹{(selectedPlanData?.price || 0).toLocaleString()}</span>
                      <span className="text-slate-500 text-[13px]">/ mo</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1 font-medium">Up to {selectedPlanData?.userLimit || 0} users included</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parseFeatures(selectedPlanData?.features).slice(0, 3).map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium bg-white px-2 py-1 rounded-lg border border-blue-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">End Date <span className="normal-case text-slate-400 font-medium">(optional)</span></label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px] font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {startDate && endDate && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
              <span className="text-[12px] font-bold text-blue-600">
                Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 pb-10 pt-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-7 py-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-50 transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedOrg || !selectedPlan || loading}
            className="px-7 py-3 rounded-xl bg-blue-600 text-white text-[13px] font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : 'Assign Plan'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
