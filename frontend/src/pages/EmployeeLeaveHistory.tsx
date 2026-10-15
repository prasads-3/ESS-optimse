import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    Loader2,
    User,
    FileText,
    CheckCircle2,
    XCircle,
    Trash2,
    ClipboardX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leaveDays } from "@/lib/leaveDays";
import { toast } from "sonner";
import { LeaveDetailModal } from "@/components/LeaveDetailModal";
import EmployeeAvatar from "@/components/EmployeeAvatar";

/* ─── Status Config ─────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
    Pending: {
        label: "Pending",
        dot: "bg-amber-400",
        pill: "bg-amber-50 text-amber-600 border border-amber-200",
    },
    Approved: {
        label: "Approved",
        dot: "bg-emerald-500",
        pill: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    },
    Rejected: {
        label: "Rejected",
        dot: "bg-red-400",
        pill: "bg-red-50 text-red-500 border border-red-200",
    },
};

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function daysBetween(start: string, end: string, isHalfDay = false) {
    return leaveDays(start, end, isHalfDay);
}

/* ─── Component ──────────────────────────────────────────────── */
const EmployeeLeaveHistory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [employee, setEmployee] = useState<any>(null);
    const [selectedLeave, setSelectedLeave] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/leaves?employeeId=${id}`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setLeaves(data);
                if (data.length > 0) setEmployee(data[0].employee);
            }
        } catch (error) {
            console.error("Error fetching employee leaves:", error);
            toast.error("Failed to load records");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchData();
    }, [id, fetchData]);

    const handleAction = async (leaveId: number, action: "Approve" | "Reject" | "Delete") => {
        try {
            let response;
            if (action === "Delete") {
                response = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}`, {
                    method: "DELETE",
                    credentials: "include",
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: action === "Approve" ? "Approved" : "Rejected" }),
                    credentials: "include",
                });
            }
            if (response.ok) {
                toast.success(`Leave ${action.toLowerCase()}ed successfully`);
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await response.json().catch(() => ({}));
                toast.error(err.error || `Failed to ${action.toLowerCase()} leave`);
            }
        } catch (error) {
            console.error(`Error during ${action}:`, error);
            toast.error("An error occurred");
        }
    };

    /* ── Stats ── */
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === "Pending").length;
    const approved = leaves.filter((l) => l.status === "Approved").length;
    const rejected = leaves.filter((l) => l.status === "Rejected").length;

    return (
        <div className="flex-1 overflow-y-auto bg-[#f8f9fb] min-h-screen">
            <div className="max-w-full mx-auto px-6 py-8 space-y-6">

                {/* ── Back Button ── */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 text-xs font-semibold tracking-wide transition-colors group"
                >
                    <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Leave List
                </button>

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <EmployeeAvatar
                                name={employee?.name || "Employee"}
                                photo={employee?.photo}
                                size="md"
                                className="rounded-xl border border-zinc-200 shadow-sm"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>

                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                                {employee?.name || "Employee"}'s Leave History
                            </h1>
                            <p className="text-sm text-zinc-400 font-medium mt-0.5">
                                {employee?.role || "Team Member"} · Employee #{id}
                            </p>
                        </div>
                    </div>

                    {/* Summary Pills */}
                    {!isLoading && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatPill label="Total" value={total} color="zinc" />
                            <StatPill label="Pending" value={pending} color="amber" />
                            <StatPill label="Approved" value={approved} color="emerald" />
                            <StatPill label="Rejected" value={rejected} color="red" />
                        </div>
                    )}
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                        <p className="text-sm text-zinc-400 font-medium">Loading history…</p>
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-zinc-200">
                        <ClipboardX size={32} className="text-zinc-300" />
                        <p className="text-sm text-zinc-400 font-medium">No leave records found for this employee.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leaves.map((leave) => {
                            const cfg = STATUS_CONFIG[leave.status] ?? STATUS_CONFIG["Pending"];
                            const days = daysBetween(leave.startDate, leave.endDate, leave.isHalfDay);

                            return (
                                <div
                                    key={leave.id}
                                    onClick={() => { setSelectedLeave(leave); setIsModalOpen(true); }}
                                    className="bg-white rounded-xl border border-zinc-200 shadow-sm px-5 py-4 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all duration-200 group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                                        {/* Left — Icon + Content */}
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg shrink-0 mt-0.5">
                                                <Calendar size={14} className="text-zinc-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-bold text-zinc-800">
                                                        {leave.type || "Leave Request"}
                                                    </span>
                                                    {/* Status pill */}
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                                        cfg.pill
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                                                    <FileText size={11} />
                                                    <span className="truncate max-w-xs">
                                                        {leave.reason || "No reason provided"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle — Date Range */}
                                        <div className="shrink-0 text-right hidden sm:block">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Period</p>
                                            <p className="text-xs font-semibold text-zinc-700">
                                                {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                                            </p>
                                            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                                {days} day{days !== 1 ? "s" : ""}
                                            </p>
                                        </div>

                                        {/* Right — Actions */}
                                        <div
                                            className="flex items-center gap-2 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {leave.status === "Pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(leave.id, "Approve")}
                                                        className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm shadow-emerald-100"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(leave.id, "Reject")}
                                                        className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 active:scale-95 text-[11px] font-bold rounded-lg transition-all"
                                                    >
                                                        <XCircle size={13} />
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleAction(leave.id, "Delete")}
                                                title="Delete record"
                                                className="h-8 w-8 flex items-center justify-center text-zinc-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile — Date Row */}
                                    <div className="flex sm:hidden items-center gap-1.5 mt-2 pl-9 text-[11px] text-zinc-400 font-medium">
                                        <Calendar size={10} />
                                        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                                        <span className="mx-1">·</span>
                                        {days} day{days !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Footer ── */}
                {!isLoading && leaves.length > 0 && (
                    <p className="text-[11px] text-zinc-400 font-medium text-center pb-2">
                        {total} record{total !== 1 ? "s" : ""} · {approved} approved · {pending} pending · {rejected} rejected
                    </p>
                )}
            </div>

            <LeaveDetailModal
                leave={selectedLeave}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAction={handleAction}
            />
        </div>
    );
};

/* ── Stat Pill Sub-component ─────────────────────────────────── */
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
        red: "bg-red-50 text-red-500 border-red-200",
    };
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold",
            colorMap[color]
        )}>
            <span className="text-sm font-black">{value}</span>
            {label}
        </span>
    );
}

export default EmployeeLeaveHistory;

