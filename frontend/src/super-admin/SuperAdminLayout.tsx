import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

const fetchJson = async (path: string) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};
import { SuperAdminSidebar } from '../components/SuperAdminSidebar';
import { SuperAdminNotificationDropdown } from '../components/SuperAdminNotificationDropdown';
import { toast } from 'sonner';
import { Plus, X, Edit, Trash2, Users, ChevronDown, Check, KeyRound, Copy as CopyIcon } from 'lucide-react';
import { AssignPlanModal } from './components/Modals/AssignPlanModal';
import { TableStatus, PlanBadge, UsageBar } from './components/SuperAdminAtoms';

const STANDARD_FEATURES = ['payslip', 'attendance', 'payroll', 'workforce', 'expenses-list', 'leave-list', 'tracking', 'announcement', 'documentation', 'expense'];

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState<any | null>(null);
  const orgsQuery = useQuery<any[]>({ queryKey: ['super-admin', 'orgs'], queryFn: () => fetchJson('/api/organizations') });
  const statsQuery = useQuery<any>({ queryKey: ['super-admin', 'stats'], queryFn: () => fetchJson('/api/super-admin/stats') });
  const activitiesQuery = useQuery<any[]>({ queryKey: ['super-admin', 'activity'], queryFn: () => fetchJson('/api/super-admin/activity') });
  const plansQuery = useQuery<any[]>({ queryKey: ['super-admin', 'plans'], queryFn: () => fetchJson('/api/super-admin/plans') });

  const orgs = orgsQuery.data ?? [];
  const stats = statsQuery.data;
  const activities = activitiesQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const plansLoading = plansQuery.isLoading;
  const orgsLoading = orgsQuery.isLoading;
  const statsLoading = statsQuery.isLoading;
  const activitiesLoading = activitiesQuery.isLoading;

  const fetchOrgs = () => orgsQuery.refetch();
  const fetchStats = () => statsQuery.refetch();
  const fetchActivities = () => activitiesQuery.refetch();
  const fetchPlans = () => plansQuery.refetch();

  const [manageOrgData, setManageOrgData] = useState<any | null>(null);
  const [viewOrgData, setViewOrgData] = useState<any | null>(null);
  // Freshly reset admin password, revealed once (kept per-org so it clears when
  // a different org's view panel is opened).
  const [resetPwd, setResetPwd] = useState<{ orgId: number; password: string } | null>(null);
  const [resettingPwd, setResettingPwd] = useState(false);

  const handleResetAdminPassword = async () => {
    if (!viewOrgData?.id) return;
    if (!confirm("Generate a new password for this organization's admin? The current password will stop working.")) return;
    setResettingPwd(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/organizations/${viewOrgData.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reset password');
      }
      const data = await res.json();
      setResetPwd({ orgId: viewOrgData.id, password: data.tempPassword });
      toast.success('New admin password generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to reset password');
    } finally {
      setResettingPwd(false);
    }
  };

  const [createFeatOpen, setCreateFeatOpen] = useState(false);
  const [editFeatOpen, setEditFeatOpen] = useState(false);
  const [createdOrgCreds, setCreatedOrgCreds] = useState<{
    orgName: string; slug: string; adminEmail: string; tempPassword: string;
  } | null>(null);
  const [showCredsPassword, setShowCredsPassword] = useState(false);

  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    industry: 'Technology',
    admin: '',
    adminName: '',
    password: '',
    logo: '',
    planId: '',
    address: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });

  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    price: '',
    userLimit: '',
    pricePerUser: 150,
    color: 'emerald',
    features: [''],
    organizationId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    duration: '',
  });

  useEffect(() => {
    if (!modalOpen) {
      setCreateFeatOpen(false);
      setEditFeatOpen(false);
    }
  }, [modalOpen]);

  const handleCreateOrg = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrgForm),
        credentials: 'include'
      });

      if (res.ok) {
        const created = await res.json();
        toast.success("Organization created successfully");

        // Build credentials — prefer server values, fall back to what the form sent
        const slug = created.slug ?? created._credentials?.slug
          ?? created.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const adminEmail = created._credentials?.adminEmail ?? newOrgForm.admin;
        const tempPassword = created._credentials?.tempPassword ?? newOrgForm.password ?? 'admin123';

        // Show credentials BEFORE resetting the form
        setCreatedOrgCreds({
          orgName: created.name,
          slug,
          adminEmail,
          tempPassword,
        });
        setShowCredsPassword(false);

        setModalOpen(null);
        setNewOrgForm({
          name: '',
          industry: 'Technology',
          admin: '',
          adminName: '',
          password: '',
          logo: '',
          planId: '',
          address: '',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: '',
        });
        fetchOrgs();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create organization');
      }
    } catch (e) { console.error(e); toast.error("Network error"); }
  };

  const handleCreatePlan = async () => {
    try {
      const { organizationId, startDate, endDate, pricePerUser, duration, ...planPayload } = newPlanForm;
      const res = await fetch(`${API_BASE_URL}/api/super-admin/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planPayload,
          features: planPayload.features.filter(f => f.trim() !== '')
        }),
        credentials: 'include'
      });

      if (res.ok) {
        const createdPlan = await res.json();
        if (organizationId) {
          await fetch(`${API_BASE_URL}/api/organizations/${organizationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: createdPlan.id,
              startDate: startDate || null,
              endDate: endDate || null,
            }),
            credentials: 'include'
          });
        }
        toast.success(organizationId ? 'Plan created and assigned!' : 'Plan created successfully');
        setModalOpen(null);
        setNewPlanForm({
          name: '', price: '', userLimit: '', pricePerUser: 150, color: 'emerald', features: [''],
          organizationId: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', duration: '',
        });
        fetchPlans();
        fetchOrgs();
        refreshUser();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create plan');
      }
    } catch (e) { console.error(e); toast.error("Network error"); }
  };

  const handleUpdateOrg = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/organizations/${manageOrgData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manageOrgData),
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Organization updated successfully");
        setManageOrgData(null);
        fetchOrgs();
        refreshUser();
      } else {
        toast.error("Failed to update organization");
      }
    } catch { toast.error("Network error"); }
  };

  const handleDeleteOrg = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/organizations/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success("Organization deleted successfully");
        setManageOrgData(null);
        fetchOrgs();
        refreshUser();
      } else {
        toast.error("Failed to delete organization");
      }
    } catch { toast.error("Network error"); }
  };

  const getTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return { title: 'License Dashboard', sub: 'Real-time subscription & employee license overview' };
    if (path.includes('organizations')) return { title: 'Organizations', sub: 'All tenant organizations' };
    if (path.includes('plans')) return { title: 'Subscription Plans', sub: 'Manage subscription tiers & feature access' };
    if (path.includes('lifecycle')) return { title: 'Lifecycle Management', sub: 'Subscription state machine & expiry actions' };
    if (path.includes('audit')) return { title: 'Security Audit Log', sub: 'All system changes with timestamps' };
    if (path.includes('organization-email')) return { title: 'Organization Email', sub: 'Broadcast a message to an organization via its admin email' };
    return { title: 'Super Admin Portal', sub: 'System Management' };
  };

  const header = getTitle();

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-700" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}} />

      <SuperAdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 h-16 bg-white border-b border-slate-100 sticky top-0 z-40 flex items-center justify-between shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
          <div className="flex flex-col justify-center">
            <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight">{header.title}</h1>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">{header.sub}</p>
          </div>
          <div className="flex items-center gap-2">
            <SuperAdminNotificationDropdown />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <span className="text-white text-[11px] font-bold">SA</span>
            </div>
          </div>
        </header>

        <main className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <Outlet context={{
              orgs, plans, plansLoading, stats, activities,
              orgsLoading, statsLoading, activitiesLoading,
              setModalOpen, setManageOrgData, setViewOrgData,
              fetchOrgs, fetchPlans, fetchStats, fetchActivities
            }} />
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalOpen?.type === 'org' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(null)}>
            <motion.div initial={{ scale: 0.97, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add Organization</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">Create a new tenant organization</p>
                </div>
                <button onClick={() => setModalOpen(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><X size={15} /></button>
              </div>
              <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500">Organization Name</label>
                  <input value={newOrgForm.name} onChange={(e) => setNewOrgForm({ ...newOrgForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" placeholder="Company name" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[11px] font-semibold text-slate-500">Organization Logo</label>
                    <span className="text-[10px] text-indigo-500/80">To fit perfectly into the sidebar header, the ideal logo size is 140 pixels wide by 40 pixels high</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {newOrgForm.logo ? (
                      <div className="relative w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2 group shrink-0">
                        <img src={newOrgForm.logo.startsWith('/') ? `${API_BASE_URL}${newOrgForm.logo}` : newOrgForm.logo} className="max-w-full max-h-full object-contain" alt="Preview" />
                        <button onClick={() => setNewOrgForm({ ...newOrgForm, logo: '' })} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 items-center shrink-0">
                        <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group shrink-0">
                          <Plus size={16} className="text-slate-300 group-hover:text-indigo-500" />
                          <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => {
                            const file = e.target.files?.[0];
                            const input = e.target;
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) { toast.error("Max size: 2MB"); input.value = ""; return; }
                            const reader = new FileReader();
                            reader.onload = () => {
                              setNewOrgForm({ ...newOrgForm, logo: reader.result as string });
                              toast.success("Logo added");
                              input.value = "";
                            };
                            reader.onerror = () => { toast.error("Failed to read image"); input.value = ""; };
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        <span className="text-[9px] font-bold text-slate-400 tracking-tight block">PNG/JPG, max 2 MB</span>
                      </div>
                    )}
                    <input value={newOrgForm.logo} onChange={(e) => setNewOrgForm({ ...newOrgForm, logo: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" placeholder="Or paste image URL..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Industry</label>
                    <select value={newOrgForm.industry} onChange={(e) => setNewOrgForm({ ...newOrgForm, industry: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer">
                      <option>Technology</option><option>Healthcare</option><option>Finance</option><option>Retail</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Admin Email</label>
                    <input value={newOrgForm.admin} onChange={(e) => setNewOrgForm({ ...newOrgForm, admin: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" placeholder="admin@company.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Admin Name</label>
                    <input value={newOrgForm.adminName} onChange={(e) => setNewOrgForm({ ...newOrgForm, adminName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" placeholder="Full Name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Admin Password</label>
                    <input type="password" value={newOrgForm.password} onChange={(e) => setNewOrgForm({ ...newOrgForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" placeholder="••••••••" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500">Subscription Plan <span className="text-slate-400 font-normal">(optional)</span></label>
                  <select value={newOrgForm.planId} onChange={(e) => setNewOrgForm({ ...newOrgForm, planId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer">
                    <option value="">— No Plan (assign later) —</option>
                    {plans.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} — ₹{(p.price || 0).toLocaleString()}/mo ({p.userLimit || 0} users)</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Subscription Start</label>
                    <input type="date" value={newOrgForm.startDate} onChange={(e) => setNewOrgForm({ ...newOrgForm, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500">Subscription Expiry</label>
                    <input type="date" value={newOrgForm.endDate} onChange={(e) => setNewOrgForm({ ...newOrgForm, endDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500">Address of Office</label>
                  <textarea value={newOrgForm.address} onChange={(e) => setNewOrgForm({ ...newOrgForm, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none h-20" placeholder="Full office address..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-7 pb-7 pt-4 border-t border-slate-100 shrink-0">
                <button onClick={() => setModalOpen(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleCreateOrg} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold shadow-lg shadow-indigo-600/20 transition-colors">Create Organization</button>
              </div>
            </motion.div>
          </div>
        )}

        {modalOpen?.type === 'createPlan' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-10 pt-10 pb-6 border-b border-slate-100 flex items-start justify-between">
                <div><h2 className="text-2xl font-bold text-slate-900">Create Subscription Plan</h2></div>
                <button onClick={() => setModalOpen(null)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><X size={16} /></button>
              </div>
              <div className="px-10 py-8 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Plan Name</label>
                    <input value={newPlanForm.name} onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px]" placeholder="e.g. Basic..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rate Per User (₹)</label>
                    <input type="number" value={newPlanForm.pricePerUser} onChange={(e) => {
                      const rate = e.target.value;
                      const price = (parseInt(newPlanForm.userLimit) || 0) * (parseFloat(rate) || 0);
                      setNewPlanForm({ ...newPlanForm, pricePerUser: rate as any, price: price.toString() });
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">User Count</label>
                    <input type="number" value={newPlanForm.userLimit} onChange={(e) => {
                      const count = e.target.value;
                      const price = (parseInt(count) || 0) * (parseFloat(newPlanForm.pricePerUser as any) || 0);
                      setNewPlanForm({ ...newPlanForm, userLimit: count, price: price.toString() });
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Calculated Price</label>
                    <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3.5 text-emerald-600 font-black">₹ {(parseFloat(newPlanForm.price) || 0).toLocaleString()}</div>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Standard Plan Features
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCreateFeatOpen(v => !v)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px] font-medium hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                      <span className={newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f)).length === 0 ? 'text-slate-400' : 'text-slate-700'}>
                        {newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f)).length === 0
                          ? 'Select features...'
                          : `${newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f)).length} feature(s) selected`}
                      </span>
                      <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${createFeatOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {createFeatOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setCreateFeatOpen(false)} />
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                          {STANDARD_FEATURES.map(f => {
                            const isSelected = newPlanForm.features.includes(f);
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => {
                                  const current = newPlanForm.features;
                                  setNewPlanForm({ ...newPlanForm, features: isSelected ? current.filter(x => x !== f) : [...current, f] });
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-slate-50 transition-colors text-left"
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <span className={isSelected ? 'text-indigo-600 font-semibold' : 'text-slate-700'}>
                                  {f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, ' ')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f)).map(f => (
                        <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[11px] font-bold border border-indigo-100">
                          {f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, ' ')}
                          <button type="button" onClick={() => setNewPlanForm({ ...newPlanForm, features: newPlanForm.features.filter(x => x !== f) })} className="text-indigo-400 hover:text-indigo-700 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                      Additional Custom Features
                      <button
                        type="button"
                        onClick={() => setNewPlanForm({ ...newPlanForm, features: [...newPlanForm.features, ''] })}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 normal-case text-[11px]"
                      >
                        <Plus size={12} /> Add Custom
                      </button>
                    </label>
                    <div className="space-y-2">
                      {newPlanForm.features.filter(f => !STANDARD_FEATURES.includes(f)).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            value={feature}
                            onChange={(e) => {
                              const custom = newPlanForm.features.filter(f => !STANDARD_FEATURES.includes(f));
                              const standard = newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f));
                              custom[idx] = e.target.value;
                              setNewPlanForm({ ...newPlanForm, features: [...standard, ...custom] });
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[12px] font-medium"
                            placeholder="Custom feature..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const custom = newPlanForm.features.filter(f => !STANDARD_FEATURES.includes(f)).filter((_, i) => i !== idx);
                              const standard = newPlanForm.features.filter(f => STANDARD_FEATURES.includes(f));
                              setNewPlanForm({ ...newPlanForm, features: [...standard, ...custom] });
                            }}
                            className="w-10 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
              <div className="px-10 pb-10 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setModalOpen(null)} className="px-7 py-3 rounded-xl border font-bold">Cancel</button>
                <button onClick={handleCreatePlan} className="px-7 py-3 rounded-xl bg-slate-900 text-white font-bold">Create Plan</button>
              </div>
            </motion.div>
          </div>
        )}

        {modalOpen?.type === 'editPlan' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-10 pt-10 pb-6 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div><h2 className="text-2xl font-bold text-slate-900">Edit Subscription Plan</h2></div>
                  <button onClick={() => setModalOpen(null)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><X size={16} /></button>
                </div>
              </div>
              <div className="px-10 py-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Plan Name</label>
                  <input value={modalOpen.data.name} onChange={(e) => setModalOpen({ ...modalOpen, data: { ...modalOpen.data, name: e.target.value } })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[14px] font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rate Per User (₹)</label>
                    <input type="number" value={modalOpen.data._ratePerUser ?? (modalOpen.data.userLimit ? Math.round((modalOpen.data.price || 0) / modalOpen.data.userLimit) : 150)} onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const price = (modalOpen.data.userLimit || 0) * rate;
                      setModalOpen({ ...modalOpen, data: { ...modalOpen.data, _ratePerUser: rate, price } });
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[14px] font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">User Count</label>
                    <input type="number" value={modalOpen.data.userLimit} onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      const rate = modalOpen.data._ratePerUser ?? 150;
                      setModalOpen({ ...modalOpen, data: { ...modalOpen.data, userLimit: count, price: count * rate } });
                    }} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-center" />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4">
                  <span className="text-2xl font-black text-emerald-600">₹{(modalOpen.data.price || 0).toLocaleString()}</span>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Standard Plan Features
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setEditFeatOpen(v => !v)}
                      className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[13px] font-medium hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <span className={(modalOpen.data.features || []).filter((f: string) => STANDARD_FEATURES.includes(f)).length === 0 ? 'text-slate-400' : 'text-slate-700'}>
                        {(modalOpen.data.features || []).filter((f: string) => STANDARD_FEATURES.includes(f)).length === 0
                          ? 'Select features...'
                          : `${(modalOpen.data.features || []).filter((f: string) => STANDARD_FEATURES.includes(f)).length} feature(s) selected`}
                      </span>
                      <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${editFeatOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {editFeatOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setEditFeatOpen(false)} />
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                          {STANDARD_FEATURES.map(f => {
                            const isSelected = (modalOpen.data.features || []).includes(f);
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => {
                                  const current = modalOpen.data.features || [];
                                  setModalOpen({ ...modalOpen, data: { ...modalOpen.data, features: isSelected ? current.filter((x: string) => x !== f) : [...current, f] } });
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-slate-50 transition-colors text-left"
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                  {isSelected && <Check size={10} className="text-white" />}
                                </div>
                                <span className={isSelected ? 'text-blue-600 font-semibold' : 'text-slate-700'}>
                                  {f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, ' ')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {(modalOpen.data.features || []).filter((f: string) => STANDARD_FEATURES.includes(f)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(modalOpen.data.features || []).filter((f: string) => STANDARD_FEATURES.includes(f)).map((f: string) => (
                        <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[11px] font-bold border border-blue-100">
                          {f.charAt(0).toUpperCase() + f.slice(1).replace(/-/g, ' ')}
                          <button type="button" onClick={() => setModalOpen({ ...modalOpen, data: { ...modalOpen.data, features: (modalOpen.data.features || []).filter((x: string) => x !== f) } })} className="text-blue-400 hover:text-blue-700 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Additional Features (Any non-standard) */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                      Additional Custom Features
                      <button
                        onClick={() => {
                          const current = modalOpen.data.features || [];
                          setModalOpen({ ...modalOpen, data: { ...modalOpen.data, features: [...current, ''] } });
                        }}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1 normal-case text-[11px]"
                      >
                        <Plus size={12} /> Add Custom
                      </button>
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {(modalOpen.data.features || [])
                        .filter((f: string) => !STANDARD_FEATURES.includes(f))
                        .map((feature: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              value={feature}
                              onChange={(e) => {
                                const allFeats = modalOpen.data.features || [];
                                const custom = allFeats.filter((f: string) => !STANDARD_FEATURES.includes(f));
                                const standard = allFeats.filter((f: string) => STANDARD_FEATURES.includes(f));
                                custom[idx] = e.target.value;
                                setModalOpen({ ...modalOpen, data: { ...modalOpen.data, features: [...standard, ...custom] } });
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[12px] font-medium"
                              placeholder="Custom feature..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const allFeats = modalOpen.data.features || [];
                                const custom = allFeats.filter((f: string) => !STANDARD_FEATURES.includes(f)).filter((_: any, i: number) => i !== idx);
                                const standard = allFeats.filter((f: string) => STANDARD_FEATURES.includes(f));
                                setModalOpen({ ...modalOpen, data: { ...modalOpen.data, features: [...standard, ...custom] } });
                              }}
                              className="w-10 h-10 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-10 pb-10 flex items-center justify-between gap-3">
                <button
                  onClick={async () => {
                    if (!window.confirm(`Delete the "${modalOpen.data.name}" plan?`)) return;
                    try {
                      await fetch(`${API_BASE_URL}/api/super-admin/plans/${modalOpen.data.id}`, { method: 'DELETE', credentials: 'include' });
                      toast.success("Plan deleted");
                      setModalOpen(null);
                      fetchPlans();
                    } catch { toast.error("Error deleting plan"); }
                  }}
                  className="flex items-center gap-2 text-rose-500 font-bold px-4 py-3 rounded-xl hover:bg-rose-50"
                >
                  <Trash2 size={15} /> Delete Plan
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setModalOpen(null)} className="px-6 py-3 rounded-xl border font-bold">Cancel</button>
                  <button onClick={async () => {
                    try {
                      const { id, _ratePerUser, ...data } = modalOpen.data;
                      await fetch(`${API_BASE_URL}/api/super-admin/plans/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
                      toast.success("Plan updated");
                      setModalOpen(null);
                      fetchPlans();
                    } catch { toast.error("Error updating plan"); }
                  }} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {manageOrgData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setManageOrgData(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] w-full max-w-lg p-10 shadow-2xl border border-slate-200 relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setManageOrgData(null)} className="absolute top-8 right-8"><X size={20} className="rounded-full bg-slate-100 p-1" /></button>
              <div className="mb-8"><h2 className="text-2xl font-bold text-slate-900">Manage Organization</h2></div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Organization Logo</label>
                    <span className="text-[10px] text-indigo-500/80">To fit perfectly into the sidebar header, the ideal logo size is 140 pixels wide by 40 pixels high</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Preview Area */}
                    <div className="relative w-16 h-16 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2 shrink-0 group shadow-sm">
                      {manageOrgData.logo ? (
                        <>
                          <img
                            src={manageOrgData.logo.startsWith('/') ? `${API_BASE_URL}${manageOrgData.logo}` : manageOrgData.logo}
                            className="max-w-full max-h-full object-contain"
                            alt="Logo"
                          />
                          <button
                            onClick={() => setManageOrgData({ ...manageOrgData, logo: '' })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full bg-indigo-50 flex items-center justify-center">
                          <span className="text-xl font-black text-indigo-500">{manageOrgData.name?.[0] || '?'}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Area */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-xl px-4 py-2 text-[12px] font-bold cursor-pointer transition-all active:scale-95">
                          <Plus size={14} />
                          {manageOrgData.logo ? 'Change Logo' : 'Upload Logo'}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/png,image/jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              const input = e.target;
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) { toast.error("Max size: 2MB"); input.value = ""; return; }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setManageOrgData({ ...manageOrgData, logo: reader.result as string });
                                toast.success("Logo added");
                                input.value = "";
                              };
                              reader.onerror = () => { toast.error("Failed to read image"); input.value = ""; };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                      <input
                        value={manageOrgData.logo || ''}
                        onChange={(e) => setManageOrgData({ ...manageOrgData, logo: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                        placeholder="Or paste URL..."
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Company Name</label>
                    <input value={manageOrgData.name} onChange={(e) => setManageOrgData({ ...manageOrgData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Industry</label>
                    <select value={manageOrgData.industry} onChange={(e) => setManageOrgData({ ...manageOrgData, industry: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] font-bold transition-all appearance-none cursor-pointer">
                      <option value="Technology">Technology</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance</option>
                      <option value="Retail">Retail</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Admin Email</label>
                  <input
                    type="email"
                    value={manageOrgData.admin || ''}
                    onChange={(e) => setManageOrgData({ ...manageOrgData, admin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    placeholder="admin@company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subscription Start</label>
                    <input type="date" value={manageOrgData.startDate ? new Date(manageOrgData.startDate).toISOString().split('T')[0] : ''} onChange={(e) => setManageOrgData({ ...manageOrgData, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subscription Expiry</label>
                    <input type="date" value={manageOrgData.endDate ? new Date(manageOrgData.endDate).toISOString().split('T')[0] : ''} onChange={(e) => setManageOrgData({ ...manageOrgData, endDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px]" />
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl flex items-center justify-between group/plan transition-all hover:bg-indigo-50 hover:border-indigo-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Active Subscription</label>
                    <div className="flex items-center gap-3">
                      <PlanBadge plan={manageOrgData.subscriptionPlan?.name || manageOrgData.plan || 'No Plan'} />
                      <div className="h-4 w-[1px] bg-indigo-200" />
                      <span className="text-[13px] font-bold text-slate-700">
                        {manageOrgData.used || 0} / {manageOrgData.subscriptionPlan?.userLimit || manageOrgData.limit || 0} <span className="text-[11px] text-slate-400 font-medium ml-1">Licenses Used</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModalOpen({ type: 'assignPlan', initialOrgId: manageOrgData.id.toString(), plan: manageOrgData.subscriptionPlan });
                      setManageOrgData(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    Change Plan
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Address of Office</label>
                  <textarea value={manageOrgData.address || ''} onChange={(e) => setManageOrgData({ ...manageOrgData, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] font-bold h-20 resize-none" />
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <button onClick={() => handleDeleteOrg(manageOrgData.id)} className="flex items-center gap-2 text-rose-500 font-bold px-4 py-3 rounded-xl hover:bg-rose-50 transition-all"><Trash2 size={16} /> Delete Org</button>
                  <button onClick={handleUpdateOrg} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-[13px] font-bold shadow-lg shadow-blue-600/20 transition-all"><Edit size={16} /> Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {viewOrgData && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end" onClick={() => { setResetPwd(null); setViewOrgData(null); }}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-xl bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
                <div><h2 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Details</h2></div>
                <button onClick={() => { setResetPwd(null); setViewOrgData(null); }} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"><X size={16} /></button>
              </div>
              <div className="p-8 space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Organization Name</label>
                    <p className="text-[15px] font-bold text-slate-900">{viewOrgData.name || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Industry</label>
                      <p className="text-[14px] font-bold text-slate-800">{viewOrgData.industry || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Status</label>
                      <div className="mt-1"><TableStatus status={viewOrgData.status || 'Active'} /></div>
                    </div>
                  </div>
                  {viewOrgData.address && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Address</label>
                      <p className="text-[14px] font-medium text-slate-700 whitespace-pre-wrap">{viewOrgData.address}</p>
                    </div>
                  )}
                </div>
                {(viewOrgData.planId || viewOrgData.subscriptionPlan) && (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Plan & Subscription</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Plan</label>
                        <PlanBadge plan={viewOrgData.subscriptionPlan?.name || viewOrgData.plan || 'Basic'} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">User Allocation</label>
                        <p className="text-[15px] font-black text-slate-900">{viewOrgData.used || 0} / {viewOrgData.subscriptionPlan?.userLimit || viewOrgData.limit || 0}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 block">License Usage</label>
                      <UsageBar used={viewOrgData.used || 0} limit={viewOrgData.subscriptionPlan?.userLimit || viewOrgData.limit || 0} status={viewOrgData.status || 'Active'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Started Date</label>
                        <p className="text-[13px] font-bold text-slate-700">
                          {viewOrgData.startDate ? new Date(viewOrgData.startDate).toLocaleDateString('en-GB') : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Expiry Date</label>
                        <p className="text-[13px] font-bold text-slate-700">
                          {viewOrgData.endDate ? new Date(viewOrgData.endDate).toLocaleDateString('en-GB') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {viewOrgData.admin && (
                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                    <h3 className="text-[12px] font-bold text-blue-500 uppercase tracking-widest">Administrator</h3>
                    <div className="flex items-center gap-3 pb-3 border-b border-blue-100">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><Users size={18} className="text-blue-600" /></div>
                      <div><p className="text-[14px] font-bold text-slate-800">{viewOrgData.admin}</p><p className="text-[11px] text-slate-500 font-medium">Organization Admin Email</p></div>
                    </div>
                    {resetPwd && resetPwd.orgId === viewOrgData.id ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-mono font-bold text-slate-800 break-all">{resetPwd.password}</p>
                          <p className="text-[11px] text-emerald-600 font-semibold">New password — copy &amp; share it now, it won't be shown again.</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(resetPwd.password);
                            toast.success("Password copied to clipboard");
                          }}
                          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          <CopyIcon size={13} /> Copy
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-mono font-bold text-slate-400 tracking-widest">••••••••</p>
                          <p className="text-[11px] text-slate-500 font-medium">Admin Password (encrypted — can't be shown)</p>
                        </div>
                        <button
                          onClick={handleResetAdminPassword}
                          disabled={resettingPwd}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-bold transition-all"
                        >
                          <KeyRound size={13} /> {resettingPwd ? "Resetting…" : "Reset Password"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setResetPwd(null);
                      setViewOrgData(null);
                      setManageOrgData(viewOrgData);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[13px] font-bold shadow-lg shadow-blue-600/20 transition-all font-inter"
                  >
                    <Edit size={16} /> Edit Organization
                  </button>
                  <button onClick={() => { setResetPwd(null); setViewOrgData(null); }} className="px-8 py-3 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-bold hover:bg-slate-100 transition-all">Close</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {modalOpen?.type === 'assignPlan' && (
          <AssignPlanModal
            plan={modalOpen.plan}
            initialOrgId={modalOpen.initialOrgId}
            orgs={orgs}
            plans={plans}
            onClose={() => setModalOpen(null)}
            onSuccess={() => { setModalOpen(null); fetchOrgs(); refreshUser(); }}
          />
        )}

        {/* credentials modal moved below AnimatePresence */}
      </AnimatePresence>

      {/* ── Org Created — Login Credentials Modal (outside AnimatePresence) ── */}
      {createdOrgCreds && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-10 pt-10 pb-8 text-white">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black tracking-tight">Organization Created!</h2>
                <p className="text-emerald-100 text-[13px] mt-1 font-medium">
                  Save these credentials — the password won't be shown again.
                </p>
              </div>

              {/* Body */}
              <div className="px-10 py-8 space-y-4">
                {/* Org name + slug */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Organization</p>
                    <p className="text-[14px] font-bold text-slate-800">{createdOrgCreds.orgName}</p>
                    <p className="text-[12px] text-slate-400 font-medium">/{createdOrgCreds.slug}</p>
                  </div>
                </div>

                {/* Credentials */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin Credentials</p>
                  {/* Email row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Email</p>
                      <p className="text-[13px] font-semibold text-slate-800">{createdOrgCreds.adminEmail}</p>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(createdOrgCreds.adminEmail); toast.success('Email copied!'); }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="h-px bg-slate-200" />
                  {/* Password row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Temporary Password</p>
                      <p className="text-[13px] font-semibold text-slate-800 font-mono tracking-wide">
                        {showCredsPassword ? createdOrgCreds.tempPassword : '••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCredsPassword(v => !v)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        {showCredsPassword ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(createdOrgCreds.tempPassword); toast.success('Password copied!'); }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <svg className="shrink-0 mt-0.5 text-amber-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    The admin will be prompted to change this temporary password on first login. Copy and share these details securely.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-10 pb-10 pt-2 flex gap-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(`Organization: ${createdOrgCreds.orgName}\nEmail: ${createdOrgCreds.adminEmail}\nPassword: ${createdOrgCreds.tempPassword}`); toast.success('All credentials copied!'); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Copy All
                </button>
                <button
                  onClick={() => setCreatedOrgCreds(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
}
