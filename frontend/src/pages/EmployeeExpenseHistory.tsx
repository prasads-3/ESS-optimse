import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    Receipt,
    User,
    Loader2,
    ChevronDown,
    ChevronUp,
    Download,
    CheckCircle2,
    XCircle,
    Trash2,
    ClipboardX,
    MapPin,
    CreditCard,
    Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { FilePreviewModal } from "@/components/FilePreviewModal";

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

/* ─── Component ──────────────────────────────────────────────── */
const EmployeeExpenseHistory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [employee, setEmployee] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedExpense, setExpandedExpense] = useState<number | null>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const fetchData = React.useCallback(async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/expenses?employeeId=${id}`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setExpenses(data);
                if (data.length > 0) setEmployee(data[0].employee);
            }
        } catch (error) {
            console.error("Error fetching employee expenses:", error);
            if (!silent) toast.error("Failed to load records");
        } finally {
            if (!silent) setIsLoading(false);
            setIsFirstLoad(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchData();
            const interval = setInterval(() => fetchData(true), 15000); // Background poll every 15s
            return () => clearInterval(interval);
        }
    }, [id, fetchData]);

    const handleAction = async (expenseId: number, action: "Approved" | "Rejected" | "Delete") => {
        try {
            let response;
            if (action === "Delete") {
                response = await fetch(`${API_BASE_URL}/api/expenses/${expenseId}`, {
                    method: "DELETE",
                    credentials: "include",
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/expenses/${expenseId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: action }),
                    credentials: "include",
                });
            }
            if (response.ok) {
                toast.success(`Expense ${action.toLowerCase()}ed successfully`);
                fetchData();
            } else {
                const err = await response.json().catch(() => ({}));
                toast.error(err.error || `Failed to ${action.toLowerCase()} expense`);
            }
        } catch (error) {
            console.error(`Error during ${action}:`, error);
            toast.error("An error occurred");
        }
    };

    const toggleExpand = (expenseId: number) => {
        setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
    };

    /* ── Stats ── */
    const totalCount = expenses.length;
    const totalAmount = expenses.reduce((sum, ex) => sum + ex.totalAmount, 0);
    const pendingCount = expenses.filter((ex) => ex.status === "Pending").length;
    const approvedCount = expenses.filter((ex) => ex.status === "Approved").length;

    const activeExpense = expenses.find(ex => ex.id === expandedExpense);

    return (
        <div className="flex-1 overflow-y-auto bg-[#f8f9fb] min-h-screen">
            <div className="max-w-full m-5 space-y-6">

                {/* ── Back Button ── */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 text-xs font-semibold tracking-wide transition-colors group"
                >
                    <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Employee List
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
                                {employee?.name || "Employee"}'s Expense Claims
                            </h1>
                            <p className="text-sm text-zinc-400 font-medium mt-0.5">
                                {employee?.role || "Team Member"} · {employee?.department || "Operations"}
                            </p>
                        </div>
                    </div>

                    {/* Summary Pills */}
                    {!isLoading && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatPill label="Total Claims" value={totalCount} color="zinc" />
                            <StatPill label="Total Amount" value={`₹${totalAmount.toLocaleString()}`} color="emerald" />

                        </div>
                    )}
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                        <p className="text-sm text-zinc-400 font-medium">Loading history…</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-zinc-200 text-center">
                        <Receipt size={32} className="text-zinc-300" />
                        <p className="text-sm text-zinc-500 font-bold">No expense claims found</p>
                        <p className="text-xs text-zinc-400 font-medium">This employee hasn't submitted any reimbursement requests yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {expenses.map((expense) => {
                            const cfg = STATUS_CONFIG[expense.status] ?? STATUS_CONFIG["Pending"];
                            const isExpanded = expandedExpense === expense.id;

                            return (
                                <div
                                    key={expense.id}
                                    className={cn(
                                        "bg-white rounded-xl border border-zinc-200 shadow-sm transition-all duration-200 overflow-hidden",
                                        isExpanded ? "border-zinc-300 shadow-md ring-1 ring-zinc-100" : "hover:border-zinc-300"
                                    )}
                                >
                                    <div
                                        onClick={() => toggleExpand(expense.id)}
                                        className="px-5 py-4 cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4 group"
                                    >
                                        {/* Left — Icon + Content */}
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg shrink-0 mt-0.5">
                                                <Receipt size={14} className="text-zinc-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-bold text-zinc-800">
                                                        Claim #{expense.id}
                                                    </span>
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                                        cfg.pill
                                                    )}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                                                    <Calendar size={11} />
                                                    <span>Submitted on {formatDate(expense.claimDate)}</span>
                                                    <span className="mx-1">·</span>
                                                    <span>{expense.items.length} item{expense.items.length !== 1 ? "s" : ""}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle — Amount */}
                                        <div className="shrink-0 text-right hidden sm:block">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Reimbursement</p>
                                            <p className="text-sm font-black text-zinc-800">
                                                ₹{expense.totalAmount.toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Right — Actions */}
                                        <div
                                            className="flex items-center gap-2 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {expense.status === "Pending" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(expense.id, "Approved")}
                                                        className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all shadow-sm shadow-emerald-100"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(expense.id, "Rejected")}
                                                        className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 active:scale-95 text-[11px] font-bold rounded-lg transition-all"
                                                    >
                                                        <XCircle size={13} />
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setExpandedExpense(expense.id)}
                                                className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition-all"
                                                title="View Breakup"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Dialog for Detailed Breakup ── */}
                <Dialog open={expandedExpense !== null} onOpenChange={(open) => !open && setExpandedExpense(null)}>
                    <DialogContent className="sm:max-w-[600px] p-0 border-zinc-200">
                        <DialogHeader className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-sm font-bold text-zinc-800 tracking-tight">
                                    Claim #{activeExpense?.id} — Detailed Breakup
                                </DialogTitle>
                            </div>
                        </DialogHeader>
                        <div className="p-6 bg-zinc-50/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeExpense?.items.map((item: any) => (
                                    <div key={item.id} className="bg-white border border-zinc-200 px-4 py-3 rounded-xl shadow-sm space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-bold border border-zinc-200">
                                                    {item.type}
                                                </span>
                                                {item.paymentMode && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                        {item.paymentMode}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm font-black text-zinc-800">₹{item.price.toLocaleString()}</span>
                                        </div>

                                        {item.type === 'Travel' ? (
                                            <div className="flex flex-wrap gap-y-1.5 gap-x-4">
                                                <div className="flex items-center gap-1.5 min-w-[80px]">
                                                    <MapPin size={10} className="text-zinc-300" />
                                                    <span className="text-[11px] text-zinc-500 font-medium truncate">{item.from} → {item.to}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <CreditCard size={10} className="text-zinc-300" />
                                                    <span className="text-[11px] text-zinc-500 font-medium">via {item.via}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed italic">
                                                "{item.description || "No description provided"}"
                                            </p>
                                        )}

                                        {item.receipt && (
                                            <div className="pt-1">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Receipt</p>
                                                {/\.pdf(\?|$)/i.test(item.receipt) ? (
                                                    <button type="button" onClick={() => setPreviewSrc(item.receipt)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">
                                                        <Eye size={12} /> View receipt (PDF)
                                                    </button>
                                                ) : (
                                                    <button type="button" onClick={() => setPreviewSrc(item.receipt)} className="block">
                                                        <img
                                                            src={item.receipt}
                                                            alt="Receipt"
                                                            className="max-h-32 rounded-md border border-zinc-200 object-contain hover:opacity-90 transition cursor-pointer"
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── Footer ── */}
                {!isLoading && expenses.length > 0 && (
                    <p className="text-[11px] text-zinc-400 font-medium text-center pb-2">
                        Admin Expense Management · {totalCount} claims processed for {employee?.name}
                    </p>
                )}
            </div>

            <FilePreviewModal
                src={previewSrc}
                open={!!previewSrc}
                onClose={() => setPreviewSrc(null)}
                title="Receipt"
            />
        </div>
    );
};

/* ── Stat Pill Sub-component ─────────────────────────────────── */
function StatPill({ label, value, color }: { label: string; value: number | string; color: string }) {
    const colorMap: Record<string, string> = {
        zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
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

export default EmployeeExpenseHistory;

