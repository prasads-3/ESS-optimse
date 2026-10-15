import { API_BASE_URL } from "@/config";
import { useState, useEffect } from "react";
import {
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Plus,
    ChevronRight,
    Trash2,
    Clock,
    Loader2,
} from "lucide-react";
import { cn, capitalize } from "@/lib/utils";
import { leaveDays } from "@/lib/leaveDays";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLayout } from "./UserLayoutContext";
import { toast } from "sonner";

interface Leave {
    id: number;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: "Pending" | "Approved" | "Rejected";
    isHalfDay: boolean;
    createdAt: string;
    approvalHistory?: { action: string }[] | null;
}

interface LeaveStats {
    total: number;
    used: number;
    pending: number;
    available: number;
    monthlyRemaining: number;
    leavesThisMonth: number;
    monthlyLimit: number;
}

const ANNUAL_QUOTA = 24;
const MONTHLY_LIMIT = 2;

const statusBadge = (status: string) =>
    cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
        status === "Approved" && "bg-emerald-50 text-success border-emerald-200",
        status === "Pending" && "bg-amber-50 text-warning border-amber-200",
        status === "Rejected" && "bg-rose-50 text-destructive border-rose-200",
    );

const statusIcon = (status: string) =>
    status === "Approved" ? CheckCircle2 : status === "Rejected" ? XCircle : AlertCircle;

const MyLeaves = () => {
    const { user } = useAuth();
    const { openLeaveModal, refreshTrigger } = useUserLayout();
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [stats, setStats] = useState<LeaveStats>({
        total: ANNUAL_QUOTA,
        used: 0,
        pending: 0,
        available: ANNUAL_QUOTA,
        monthlyRemaining: MONTHLY_LIMIT,
        leavesThisMonth: 0,
        monthlyLimit: MONTHLY_LIMIT,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"All" | "Approved" | "Pending" | "Rejected">("All");

    const fetchData = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const [leavesRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/leaves?employeeId=${user.id}`, { credentials: "include" }),
                fetch(`${API_BASE_URL}/api/user/stats/${user.id}`, { credentials: "include" }),
            ]);
            if (leavesRes.ok) setLeaves(await leavesRes.json());
            if (statsRes.ok) {
                const data = await statsRes.json();
                if (data.leaveStats) setStats(data.leaveStats);
            }
        } catch (e) {
            console.error("Error fetching leaves:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.id, refreshTrigger]);

    const handleDeleteLeave = async (leaveId: number) => {
        if (!confirm("Withdraw this pending leave request?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Leave request cancelled");
                fetchData();
            } else {
                toast.error("Failed to cancel leave");
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error");
        }
    };

    const filteredLeaves = leaves.filter((l) => filter === "All" || l.status === filter);
    const counts = {
        All: leaves.length,
        Approved: leaves.filter((l) => l.status === "Approved").length,
        Pending: leaves.filter((l) => l.status === "Pending").length,
        Rejected: leaves.filter((l) => l.status === "Rejected").length,
    };
    const usedPct = stats.total ? Math.min(100, (stats.used / stats.total) * 100) : 0;
    const monthPct = stats.monthlyLimit ? ((stats.monthlyLimit - stats.monthlyRemaining) / stats.monthlyLimit) * 100 : 0;

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">My Leaves</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Track your leave balance and request history.</p>
                    </div>
                    <button
                        onClick={openLeaveModal}
                        className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 shadow-sm shadow-emerald-700/20"
                    >
                        <Plus size={14} /> Apply for leave
                    </button>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Available</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
                            {stats.available}
                            <span className="text-sm text-muted-foreground/70 font-normal ml-1">/ {ANNUAL_QUOTA}</span>
                        </p>
                        <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full transition-all" style={{ width: `${usedPct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">{stats.used} days used this year</p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">This Month</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
                            {stats.monthlyRemaining}
                            <span className="text-sm text-muted-foreground/70 font-normal ml-1">/ {MONTHLY_LIMIT}</span>
                        </p>
                        <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-slate-700 rounded-full transition-all" style={{ width: `${monthPct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">remaining this month</p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Approved</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.used}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="text-[11px] text-muted-foreground">total leaves taken</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Pending</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.pending}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <Clock size={12} className="text-amber-500" />
                            <span className="text-[11px] text-muted-foreground">awaiting approval</span>
                        </div>
                    </div>
                </div>

                {/* Inline notice */}
                {stats.monthlyRemaining === 0 && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-md">
                        <XCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-rose-800 leading-relaxed">
                            Monthly limit reached. New applications are blocked until next month.
                        </p>
                    </div>
                )}
                {stats.monthlyRemaining > 0 && stats.monthlyRemaining < MONTHLY_LIMIT && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md">
                        <AlertCircle size={14} className="text-warning mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">{stats.monthlyRemaining}</span> leave{stats.monthlyRemaining === 1 ? "" : "s"} remaining this month (max {MONTHLY_LIMIT}).
                        </p>
                    </div>
                )}

                {/* Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-semibold text-foreground">Leave History</h2>
                            <span className="text-[11px] text-muted-foreground">{leaves.length} total</span>
                        </div>
                        <div className="flex border-b border-transparent -mb-3">
                            {(["All", "Approved", "Pending", "Rejected"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition",
                                        filter === f
                                            ? "border-emerald-700 text-success"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {f}
                                    <span className={cn(
                                        "ml-1.5 text-[10px] px-1.5 py-0.5 rounded tabular-nums",
                                        filter === f ? "bg-emerald-50 text-success" : "bg-secondary text-muted-foreground"
                                    )}>
                                        {counts[f]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={20} className="text-muted-foreground/70 animate-spin mb-3" />
                            <p className="text-xs text-muted-foreground">Loading leaves…</p>
                        </div>
                    ) : filteredLeaves.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                                <Calendar size={18} className="text-muted-foreground/70" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No leave records found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {filter === "All" ? "You haven't applied for any leave yet." : `No ${filter.toLowerCase()} requests.`}
                            </p>
                            <button
                                onClick={openLeaveModal}
                                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-success hover:text-emerald-800"
                            >
                                Apply for leave <ChevronRight size={12} />
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/50/60 border-b border-border">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Type</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">From</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">To</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Days</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Reason</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Status</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLeaves.map((leave) => {
                                        const start = new Date(leave.startDate);
                                        const end = new Date(leave.endDate);
                                        const days = leaveDays(leave.startDate, leave.endDate, leave.isHalfDay);
                                        const StatusIcon = statusIcon(leave.status);
                                        return (
                                            <tr key={leave.id} className="hover:bg-secondary/50/50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <span className="text-sm font-medium text-foreground">{capitalize(leave.type)}</span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
                                                    {start.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </td>
                                                <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
                                                    {end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="text-sm font-medium text-foreground tabular-nums">{days}</span>
                                                    {leave.isHalfDay && <span className="ml-1 text-[10px] text-muted-foreground/70">½</span>}
                                                </td>
                                                <td className="px-5 py-3 max-w-[240px]">
                                                    <span className="text-sm text-muted-foreground truncate block" title={leave.reason}>
                                                        {leave.reason || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={statusBadge(leave.status)}>
                                                        <StatusIcon size={11} />
                                                        {leave.status}
                                                    </span>
                                                    {leave.status === "Pending" && (leave.approvalHistory?.length ?? 0) > 0 && (
                                                        <span className="block text-[10px] text-muted-foreground mt-1">
                                                            {leave.approvalHistory!.length} approval{leave.approvalHistory!.length > 1 ? "s" : ""} so far
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {leave.status === "Pending" ? (
                                                        <button
                                                            onClick={() => handleDeleteLeave(leave.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-rose-50 transition"
                                                            title="Withdraw"
                                                        >
                                                            <Trash2 size={12} />
                                                            Withdraw
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyLeaves;
