import React, { useState } from "react";
import { Check, CreditCard, Shield, Star, Plus, Layers, Zap } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminSubscription() {
    const { refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('preset');
    const [customForm, setCustomForm] = useState({
        users: '',
        duration: 'monthly',
        features: '',
        specialReq: ''
    });

    const handleCustomPlanRequest = 
    
    
    async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customForm.users) {
            toast.error("Please enter required user count.");
            return;
        }

        const loadingToast = toast.loading("Submitting request...");
        try {
            const res = await fetch(`${API_BASE_URL}/api/custom-plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customForm),
                credentials: 'include'
            });

            if (res.ok) {
                toast.success("Custom plan request submitted! Our enterprise team will contact you shortly.", { id: loadingToast });
                setCustomForm({ users: '', duration: 'monthly', features: '', specialReq: '' });
                setActiveTab('preset'); // Optional: switch back to plans after success
            } else {
                const err = await res.json();
                toast.error(err.error || "Submission failed", { id: loadingToast });
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Network error during submission", { id: loadingToast });
        }
    };

    const handleUpgrade = async (plan: any) => {
        if (!currentOrg?.id) {
            toast.error("Organization context not found.");
            return;
        }

        const confirmUpgrade = window.confirm(`Are you sure you want to switch to the ${plan.name} plan?`);
        if (!confirmUpgrade) return;

        const loadingToast = toast.loading(`Upgrading to ${plan.name}...`);
        try {
            const res = await fetch(`${API_BASE_URL}/api/organizations/${currentOrg.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: plan.id,
                    startDate: new Date().toISOString()
                }),
                credentials: 'include'
            });

            if (res.ok) {
                toast.success(`Successfully upgraded to ${plan.name}!`, { id: loadingToast });
                await fetchData(); // Refresh local page state
            } else {
                const err = await res.json();
                toast.error(err.error || "Upgrade failed", { id: loadingToast });
            }
        } catch (error) {
            console.error("Upgrade error:", error);
            toast.error("Network error during upgrade", { id: loadingToast });
        }
    };

    const [plans, setPlans] = useState<any[]>([]);
    const [currentOrg, setCurrentOrg] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Run all API calls concurrently
            const [_, plansRes, statsRes] = await Promise.all([
                refreshUser(),
                fetch(`${API_BASE_URL}/api/plans`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/api/subscription/usage`, { credentials: 'include' })
            ]);
            
            if (plansRes.ok) {
                const plansData = await plansRes.json();
                setPlans(plansData);
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setCurrentOrg({
                    ...statsData.organization,
                    usedCount: statsData.totalEmployees
                });
            }
        } catch (err) {
            console.error("Failed to fetch subscription data", err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="m-5 max-w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Shield className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Hub</h1>
                            <p className="text-slate-500 text-sm font-medium">Upgrade or safely modify your workspace limits</p>
                        </div>
                    </div>
                </div>

                {/* Tab Selection */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl relative z-10 whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('preset')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'preset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Standard Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('custom')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Custom Enterprise
                    </button>
                </div>
            </div>

            {/* Active Subscription Status */}
            {currentOrg && (
                <div className="bg-white border border-slate-200 rounded-[32px] p-2 flex items-center gap-2 pr-6">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-[26px] flex items-center gap-3">
                        <CreditCard size={20} className="text-emerald-400" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Plan</span>
                            <span className="text-sm font-black tracking-tight leading-none">{currentOrg.subscriptionPlan?.name || currentOrg.plan || 'Basic'}</span>
                        </div>
                    </div>
                    <div className="flex-1 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">License Usage</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-black text-slate-900">{currentOrg.usedCount || 0}</span>
                                    <span className="text-[11px] font-bold text-slate-400">/ {currentOrg.limit || currentOrg.subscriptionPlan?.userLimit || 35}</span>
                                </div>
                            </div>
                            <div className="h-10 w-[1px] bg-slate-100 hidden md:block" />
                            <div className="hidden md:block">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Billing Cycle</p>
                                <p className="text-sm font-bold text-slate-700">{currentOrg.billingCycle || 'Monthly'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden lg:block">
                                <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${Math.min(100, ((currentOrg.usedCount || 0) / (currentOrg.limit || currentOrg.subscriptionPlan?.userLimit || 35)) * 100)}%` }}
                                />
                             </div>
                             {(currentOrg.usedCount || 0) >= (currentOrg.limit || currentOrg.subscriptionPlan?.userLimit || 35) && (
                                <span className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-rose-100">At Capacity</span>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {isLoading && activeTab === 'preset' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-8 h-[450px] flex flex-col gap-6 animate-pulse">
                            <div className="w-14 h-14 bg-slate-200 rounded-2xl" />
                            <div className="h-6 w-32 bg-slate-200 rounded-lg" />
                            <div className="h-10 w-24 bg-slate-200 rounded-lg" />
                            <div className="mt-8 space-y-4 flex-1">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="flex gap-3 items-center">
                                        <div className="w-5 h-5 bg-slate-200 rounded-full" />
                                        <div className="h-4 bg-slate-200 rounded-md w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && activeTab === 'preset' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                    {(plans || []).map((plan, i) => {
                        return (
                            <div key={i} className="relative flex flex-col bg-white rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-xl border border-slate-200">
                                <div className="p-8 bg-slate-50 border-b border-slate-100">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-white">
                                        {i === 0 ? <Layers size={28} className="text-slate-500" /> :
                                            i === 1 ? <Zap size={28} className="text-emerald-500" /> :
                                                <Star size={28} className="text-amber-500" />}
                                    </div>
                                    <h3 className="text-xl font-bold tracking-tight mb-2 text-slate-900">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900">₹{(plan.price || 0).toLocaleString()}</span>
                                        <span className="text-sm font-bold text-slate-500">/mo</span>
                                    </div>
                                    <p className="text-sm font-semibold mt-2 text-slate-500">Up to {plan.userLimit} users</p>
                                </div>

                                <div className="p-8 flex-1 flex flex-col bg-white">
                                    <div className="flex-1 space-y-4 mb-8">
                                        {(() => {
                                            let featuresList = [];
                                            try {
                                                featuresList = typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : plan.features;
                                            } catch { featuresList = []; }
                                            return (featuresList || []).map((feat: string, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-50">
                                                        <Check size={12} className="text-emerald-500" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{feat}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {activeTab === 'custom' && (
                <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-500 grid grid-cols-1 lg:grid-cols-5">
                    <div className="lg:col-span-2 bg-slate-900 p-8 flex flex-col justify-between relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                        <div className="relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center mb-8">
                                <Plus size={28} className="text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-emerald-500 tracking-tight mb-4 leading-tight">Need a custom<br />tailored solution?</h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                Enterprise organizations have unique requirements. Build your own plan with customized features and support.
                            </p>
                            <div className="space-y-4 text-sm font-semibold text-slate-300">
                                <div className="flex items-center gap-3"><Check size={16} className="text-emerald-400" /> Volume Discounts</div>
                                <div className="flex items-center gap-3"><Check size={16} className="text-emerald-400" /> Dedicated Deployment</div>
                                <div className="flex items-center gap-3"><Check size={16} className="text-emerald-400" /> Custom Invoicing</div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-3 p-8 bg-slate-50/50">
                        <form onSubmit={handleCustomPlanRequest} className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Create Plan Request</h3>
                                <p className="text-sm text-slate-500 mb-8 font-medium">Fill out the requirements and our team will prepare a custom quote.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Expected Users</label>
                                    <input
                                        type="number" required
                                        value={customForm.users}
                                        onChange={e => setCustomForm({ ...customForm, users: e.target.value })}
                                        placeholder="e.g. 500+"
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Preferred Duration</label>
                                    <select
                                        value={customForm.duration}
                                        onChange={e => setCustomForm({ ...customForm, duration: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="annual">Annually (Save 20%)</option>
                                        <option value="multi-year">Multi-year Contract</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Required Features</label>
                                <textarea
                                    value={customForm.features}
                                    onChange={e => setCustomForm({ ...customForm, features: e.target.value })}
                                    placeholder="What modules do you need?"
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Special Requirements</label>
                                <textarea
                                    value={customForm.specialReq}
                                    onChange={e => setCustomForm({ ...customForm, specialReq: e.target.value })}
                                    placeholder="Compliance, SSO, etc."
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] resize-none"
                                />
                            </div>

                            <button type="submit" className="w-full py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                Submit Custom Request <Check size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
