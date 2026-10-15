import { API_BASE_URL } from "@/config";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserLayout } from "./UserLayoutContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Calendar,
    FileText,
    Download,
    Bell,
    Mail,
    Settings,
    ChevronRight,
    Plus,
    CheckCircle2,
    AlertCircle,
    Info,
    MapPin,
    Briefcase,
    LogOut,
    ArrowUpRight,
    TrendingUp,
    ClipboardList,
    XCircle,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmployeeAvatar from "@/components/EmployeeAvatar";

const formatINR = (n: number) =>
    `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const UserDashboard = () => {
    const navigate = useNavigate();
    const { openLeaveModal, refreshTrigger } = useUserLayout();
    const { user, logout } = useAuth();

    const [userProfile, setUserProfile] = useState({
        name: "User",
        id: "EMP-0000",
        role: "Employee",
        email: "",
        avatar: "",
        department: "Operations",
        location: "Remote",
        joinDate: "Not Specified",
    });

    useEffect(() => {
        if (user) {
            setUserProfile({
                name: user.name || "User",
                id: user.id?.toString() || "EMP-0000",
                role: user.role || "Employee",
                email: user.email || "",
                avatar: user.photo || "",
                department: user.department || "Operations",
                location: user.location || "Remote",
                joinDate: user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : "Not Specified",
            });
        }
    }, [user]);

    const [leaveStats, setLeaveStats] = useState({
        total: 24,
        used: 0,
        pending: 0,
        available: 24,
        monthlyRemaining: 2,
        leavesThisMonth: 0,
        monthlyLimit: 2,
    });
    const [notifications, setNotifications] = useState<any[]>([]);
    const [recentPayslips, setRecentPayslips] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);
    const [approvals, setApprovals] = useState<any[]>([]);
    const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchApprovals = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/approvals`, { credentials: "include" });
            if (res.ok) setApprovals(await res.json());
        } catch (e) {
            console.error("Error fetching approvals:", e);
        }
    };

    const handleApprovalAction = async (item: any, action: "approve" | "reject") => {
        let note = "";
        if (action === "reject") {
            const input = window.prompt("Add a reason for rejection (optional):", "");
            if (input === null) return;
            note = input;
        }
        const key = `${item.kind}:${item.id}`;
        setBusyApprovalId(key);
        try {
            let url: string;
            let body: any;
            if (item.kind === "fund") {
                url = `${API_BASE_URL}/api/admin/money-requests/${item.id}`;
                body = { status: action === "approve" ? "Approved" : "Disabled", adminNote: note || undefined };
            } else {
                url = `${API_BASE_URL}/api/${item.kind === "leave" ? "leaves" : "expenses"}/${item.id}`;
                body = { status: action === "approve" ? "Approved" : "Rejected", note: note || undefined };
            }
            const res = await fetch(url, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (res.ok) {
                toast.success(action === "approve" ? "Request approved and forwarded" : "Request rejected");
                setApprovals((prev) => prev.filter((a) => !(a.kind === item.kind && a.id === item.id)));
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to update request");
            }
        } catch (e) {
            console.error("Approval action error:", e);
            toast.error("Failed to update request");
        } finally {
            setBusyApprovalId(null);
        }
    };

    const fetchUserStats = async () => {
        if (!user?.id && user?.id !== 0) {
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/user/stats/${user.id}`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                if (data.leaveStats) setLeaveStats(data.leaveStats);
                if (data.notifications) setNotifications(data.notifications);
                if (data.recentPayslips) setRecentPayslips(data.recentPayslips);
            }
        } catch (e) {
            console.error("Error fetching user stats:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPolicies = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/policies`, { credentials: "include" });
            if (response.ok) setPolicies(await response.json());
        } catch (e) {
            console.error("Error fetching policies:", e);
        }
    };

    useEffect(() => {
        fetchUserStats();
        fetchPolicies();
        fetchApprovals();
    }, [user?.id, refreshTrigger]);

    const handleDownload = (policy: any) => {
        if (!policy.content) {
            toast.error("No content available to download");
            return;
        }
        const link = document.createElement("a");
        link.href = policy.content;
        link.download = policy.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started");
    };

    const handleLogout = async () => {
        const redirectTo = await logout();
        toast.success("Logged out");
        navigate(redirectTo);
    };

    const usedPct = leaveStats.total ? Math.min(100, (leaveStats.used / leaveStats.total) * 100) : 0;
    const monthlyUsed = leaveStats.monthlyLimit - leaveStats.monthlyRemaining;
    const monthPct = leaveStats.monthlyLimit ? (monthlyUsed / leaveStats.monthlyLimit) * 100 : 0;

    const initials = userProfile.name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-emerald-700" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">
                            Welcome back, {userProfile.name.split(" ")[0]}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Here's what's happening in your workspace today.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate("/user/settings")}
                            className="px-3 py-2 text-sm font-medium text-foreground border border-border bg-card rounded-md hover:bg-secondary/50 transition flex items-center gap-2"
                        >
                            <Settings size={14} />
                            Profile
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 text-sm font-medium text-foreground border border-border bg-card rounded-md hover:bg-secondary/50 transition flex items-center gap-2"
                        >
                            <LogOut size={14} />
                            Sign out
                        </button>
                    </div>
                </div>

                {/* Requests awaiting this user's approval (managers see their team's requests) */}
                {approvals.length > 0 && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={14} className="text-emerald-700" />
                                <h2 className="text-sm font-semibold text-foreground">Requests awaiting your approval</h2>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{approvals.length}</span>
                            </div>
                            <button
                                onClick={() => navigate("/user/approvals")}
                                className="text-[11px] font-medium text-success hover:text-emerald-800 flex items-center gap-0.5"
                            >
                                View all <ChevronRight size={11} />
                            </button>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {approvals.slice(0, 5).map((item: any) => {
                                const key = `${item.kind}:${item.id}`;
                                const busy = busyApprovalId === key;
                                const kindLabel = item.kind === "leave" ? "Leave" : item.kind === "expense" ? "Expense" : "Fund";
                                return (
                                    <li key={key} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <EmployeeAvatar name={item.requester?.name || "?"} photo={item.requester?.photo || null} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {item.requester?.name || "Unknown"} <span className="text-muted-foreground font-normal">· {kindLabel}</span>
                                                    {item.finalStage && <span className="ml-2 text-[10px] font-bold text-blue-700">FINAL</span>}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {item.title}
                                                    {item.detail ? ` · ${item.detail}` : ""}
                                                    {item.amount != null ? ` · ₹${Number(item.amount).toLocaleString()}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleApprovalAction(item, "reject")}
                                                disabled={busy}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60 transition"
                                            >
                                                <XCircle size={12} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleApprovalAction(item, "approve")}
                                                disabled={busy}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60 transition"
                                            >
                                                {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                {item.finalStage ? "Final approve" : "Approve"}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Top grid: profile + KPIs */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Profile */}
                    <div className="lg:col-span-4 bg-card border border-border rounded-lg p-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <EmployeeAvatar
                                    name={userProfile.name}
                                    photo={userProfile.avatar || null}
                                    size="lg"
                                    className="border border-border"
                                />
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold text-foreground truncate">{userProfile.name}</h2>
                                <p className="text-xs text-muted-foreground">{userProfile.role}</p>
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5 tabular-nums">ID · {userProfile.id}</p>
                            </div>
                        </div>

                        <dl className="mt-5 pt-5 border-t border-slate-100 space-y-3">
                            <div className="flex items-center gap-3">
                                <Mail size={13} className="text-muted-foreground/70 shrink-0" />
                                <dt className="text-xs text-muted-foreground w-20 shrink-0">Email</dt>
                                <dd className="text-xs font-medium text-foreground truncate">{userProfile.email || "—"}</dd>
                            </div>
                            <div className="flex items-center gap-3">
                                <Briefcase size={13} className="text-muted-foreground/70 shrink-0" />
                                <dt className="text-xs text-muted-foreground w-20 shrink-0">Department</dt>
                                <dd className="text-xs font-medium text-foreground">{userProfile.department}</dd>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin size={13} className="text-muted-foreground/70 shrink-0" />
                                <dt className="text-xs text-muted-foreground w-20 shrink-0">Location</dt>
                                <dd className="text-xs font-medium text-foreground">{userProfile.location}</dd>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar size={13} className="text-muted-foreground/70 shrink-0" />
                                <dt className="text-xs text-muted-foreground w-20 shrink-0">Joined</dt>
                                <dd className="text-xs font-medium text-foreground">{userProfile.joinDate}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* KPI tiles */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Leave balance */}
                        <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium text-muted-foreground">Leave Balance</p>
                                <span className="text-[10px] font-medium text-muted-foreground">FY annual</span>
                            </div>
                            <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
                                {leaveStats.available}
                                <span className="text-sm text-muted-foreground/70 font-normal ml-1">/ {leaveStats.total}</span>
                            </p>
                            <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-success rounded-full transition-all"
                                    style={{ width: `${usedPct}%` }}
                                />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{leaveStats.used} used · {leaveStats.pending} pending</span>
                                <span
                                    className={cn(
                                        "font-medium",
                                        leaveStats.monthlyRemaining === 0
                                            ? "text-rose-600"
                                            : leaveStats.monthlyRemaining < leaveStats.monthlyLimit
                                                ? "text-warning"
                                                : "text-success"
                                    )}
                                >
                                    {leaveStats.monthlyRemaining}/{leaveStats.monthlyLimit} this month
                                </span>
                            </div>
                            <button
                                onClick={openLeaveModal}
                                className="mt-4 px-3 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-700/20"
                            >
                                <Plus size={14} />
                                Apply for leave
                            </button>
                        </div>

                        {/* Latest payslip */}
                        <div className="bg-card border border-border rounded-lg p-5 flex flex-col">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium text-muted-foreground">Latest Payslip</p>
                                <button
                                    onClick={() => navigate("/user/payslips")}
                                    className="text-[11px] font-medium text-success hover:text-emerald-800 flex items-center gap-0.5"
                                >
                                    View all <ArrowUpRight size={11} />
                                </button>
                            </div>
                            {recentPayslips[0] ? (
                                <>
                                    <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
                                        {formatINR(Number(recentPayslips[0].netPay) || Number(String(recentPayslips[0].amount).replace(/[^\d.]/g, "")))}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {recentPayslips[0].month} {recentPayslips[0].year || ""}
                                    </p>
                                    <div className="mt-auto pt-4 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border bg-emerald-50 text-success border-emerald-200">
                                            <CheckCircle2 size={11} />
                                            Paid
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                            Generated {new Date(recentPayslips[0].createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="mt-1.5 text-2xl font-semibold text-muted-foreground/70 tabular-nums">—</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">No payslip on file yet</p>
                                    <div className="mt-auto pt-4">
                                        <span className="text-[11px] text-muted-foreground/70">Records appear after payroll runs.</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notifications + Recent payslips */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Activity */}
                    <div className="lg:col-span-5 bg-card border border-border rounded-lg overflow-hidden">
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell size={14} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                            </div>
                            <span className="text-[11px] text-muted-foreground">{notifications.length} updates</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {notifications.length > 0 ? (
                                notifications.slice(0, 5).map((notif: any) => {
                                    const Icon =
                                        notif.type === "success"
                                            ? CheckCircle2
                                            : notif.type === "alert"
                                                ? AlertCircle
                                                : Info;
                                    const tone =
                                        notif.type === "success"
                                            ? "text-emerald-600"
                                            : notif.type === "alert"
                                                ? "text-rose-600"
                                                : "text-muted-foreground";
                                    return (
                                        <li key={notif.id} className="px-5 py-3 hover:bg-secondary/50/50 transition">
                                            <div className="flex items-start gap-3">
                                                <Icon size={14} className={cn("mt-0.5 shrink-0", tone)} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">{notif.desc}</p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="px-5 py-12 text-center">
                                    <Bell size={18} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs text-muted-foreground">No recent activity</p>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Recent payslips list */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-lg overflow-hidden">
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Recent Payslips</h2>
                            </div>
                            <button
                                onClick={() => navigate("/user/payslips")}
                                className="text-[11px] font-medium text-success hover:text-emerald-800 flex items-center gap-0.5"
                            >
                                View all <ChevronRight size={11} />
                            </button>
                        </div>
                        {recentPayslips.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {recentPayslips.slice(0, 4).map((slip: any) => (
                                    <li
                                        key={slip.id}
                                        className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-secondary/50/50 transition"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                                                <FileText size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {slip.month} {slip.year || ""}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {slip.date ||
                                                        new Date(slip.createdAt || Date.now()).toLocaleDateString("en-IN", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                                {typeof slip.amount === "string"
                                                    ? slip.amount
                                                    : formatINR(Number(slip.netPay))}
                                            </span>
                                            <button
                                                onClick={() => navigate("/user/payslips")}
                                                className="p-1.5 text-muted-foreground hover:text-success hover:bg-emerald-50 rounded transition"
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <FileText size={18} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-medium text-foreground">No payslips yet</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Payslips will appear here once payroll has been processed.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Shared documents */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-muted-foreground" />
                            <h2 className="text-sm font-semibold text-foreground">Shared Documents</h2>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{policies.length} files</span>
                    </div>
                    {policies.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                            {policies.map((doc: any) => (
                                <li
                                    key={doc.id}
                                    onClick={() => handleDownload(doc)}
                                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-secondary/50/50 transition cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                                            <FileText size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {doc.fileSize || "—"} ·{" "}
                                                {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <Download
                                        size={14}
                                        className="text-muted-foreground/70 group-hover:text-success transition shrink-0"
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <FileText size={18} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-medium text-foreground">No shared documents</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Policies and resources from your organization will appear here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
