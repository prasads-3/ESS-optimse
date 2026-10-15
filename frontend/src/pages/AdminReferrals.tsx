import { API_BASE_URL } from '@/config';
import React, { useState, useEffect, useMemo } from "react";
import {
    Users,
    Search,
    Eye,
    Calendar,
    ChevronRight,
    User,
    Loader2,
    CheckCircle2,
    Clock,
    XCircle,
    Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import EmployeeAvatar from "@/components/EmployeeAvatar";

const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    return cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
        (s === "hired" || s === "completed") && "bg-emerald-50 text-emerald-700 border-emerald-100",
        (s === "interviewing" || s === "contacted") && "bg-amber-50 text-amber-700 border-amber-100",
        s === "rejected" && "bg-rose-50 text-rose-700 border-rose-100",
        !["hired", "completed", "interviewing", "contacted", "rejected"].includes(s) && "bg-slate-50 text-slate-600 border-slate-100",
    );
};

const StatCard = ({ title, value, icon: Icon, color, suffix = "" }: any) => {
    const colors: any = {
        slate: "bg-slate-50 text-slate-600 border-slate-100",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        teal: "bg-teal-50 text-teal-600 border-teal-100"
    };

    return (
        <Card className="p-5 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between group hover:shadow-md transition-all duration-300">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{value}{suffix}</h3>
            </div>
            <div className={cn("p-3 rounded-xl", colors[color])}>
                <Icon size={20} className="group-hover:scale-110 transition-transform" />
            </div>
        </Card>
    );
};

const AdminReferrals = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [referrals, setReferrals] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"All" | "Pending" | "Interviewing" | "Hired" | "Rejected">("All");

    useEffect(() => {
        let isFirstLoad = true;
        const fetchReferrals = async () => {
            try {
                if (isFirstLoad) setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/referrals`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setReferrals(data.referrals || []);
                }
            } catch (error) {
                console.error("Error fetching referrals:", error);
                if (isFirstLoad) toast.error("Failed to load referral records");
            } finally {
                if (isFirstLoad) {
                    setIsLoading(false);
                    isFirstLoad = false;
                }
            }
        };

        fetchReferrals();
        const interval = setInterval(fetchReferrals, 30000);
        return () => clearInterval(interval);
    }, []);

    const filteredReferrals = useMemo(() => {
        return referrals.filter(ref => {
            const matchesSearch = 
                (ref.referredName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (ref.referredEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (ref.referrer?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const s = (ref.status || "").toLowerCase();
            if (filter === "Hired" && !["hired", "completed"].includes(s)) return false;
            if (filter === "Interviewing" && !["interviewing", "contacted"].includes(s)) return false;
            if (filter === "Rejected" && s !== "rejected") return false;
            if (filter === "Pending" && ["hired", "completed", "rejected", "interviewing", "contacted"].includes(s)) return false;
            
            return matchesSearch;
        });
    }, [referrals, searchQuery, filter]);

    const stats = useMemo(() => {
        const c = (s: string) => referrals.filter(r => (r.status || "").toLowerCase() === s).length;
        const successCount = c("hired") + c("completed");
        const interviewingCount = c("interviewing") + c("contacted");
        return {
            total: referrals.length,
            hired: successCount,
            interviewing: interviewingCount,
            pending: referrals.length - successCount - c("rejected") - interviewingCount,
            rejected: c("rejected")
        };
    }, [referrals]);

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/30 scroll-smooth p-6 font-sans">
            <div className="max-w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl blur-2xl opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2 font-sans">
                                Referral Program
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1 font-sans">Track and manage employee referrals across the organization.</p>
                        </div>
                    </div>
                </div>


                {/* Filters & Search */}
                <div className="flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by candidate name, email, or referrer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                        />
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
                        {(["All", "Pending"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                                    filter === f 
                                        ? "bg-slate-900 text-white shadow-md" 
                                        : "text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                        <p className="text-muted-foreground font-medium">Loading referral records...</p>
                    </div>
                ) : (
                    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Referrer (Source)</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Submitted</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Points Awarded</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredReferrals.map((ref) => (
                                        <tr key={ref.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{ref.referredName}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{ref.referredEmail}</span>
                                                    {ref.referredPhone && (
                                                        <span className="text-[9px] text-slate-400/80 font-medium">{ref.referredPhone}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <EmployeeAvatar 
                                                        name={ref.referrer?.name} 
                                                        photo={ref.referrer?.photo} 
                                                        size="sm" 
                                                        className="rounded-lg"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-700">{ref.referrer?.name}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{ref.referrer?.role}</span>
                                                            <span className="text-[10px] text-slate-300">•</span>
                                                            <span className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-tight">{ref.referrer?.department}</span>
                                                        </div>
                                                        {ref.referrer?.employeeId && (
                                                            <span className="text-[9px] text-slate-400 font-medium mt-0.5 italic">{ref.referrer.employeeId}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={statusBadge(ref.status)}>
                                                    {ref.status || "Pending"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                                                {new Date(ref.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className={cn(
                                                    "text-sm font-extrabold",
                                                    ref.points > 0 ? "text-emerald-600" : "text-slate-300"
                                                )}>
                                                    {ref.points > 0 ? `+${ref.points}` : "0"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredReferrals.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4">
                                                    <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                                                        <Users size={40} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-base font-bold text-slate-900">No referrals found</h3>
                                                        <p className="text-xs text-slate-500 font-medium">Try adjusting your search or filters.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AdminReferrals;
