import { API_BASE_URL } from "@/config";
import { useState, useEffect, useMemo } from "react";
import {
    Receipt,
    Plus,
    Search,
    Eye,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Bus,
    Utensils,
    Box,
    ChevronRight,
    TrendingUp,
    Trash2,
    DollarSign,
    Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AddExpenseModal from "./AddExpenseModal";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import AdditionalMoneyRequestModal from "./AdditionalMoneyRequestModal";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Download, MapPin, CreditCard } from "lucide-react";

interface ExpenseItem {
    type?: string;
    description?: string;
    from?: string;
    to?: string;
    via?: string;
    price?: string | number;
    paymentMode?: string;
    receipt?: string;
}

interface Expense {
    id: number | string;
    claimDate: string;
    items?: ExpenseItem[];
    status: string;
    totalAmount: number;
    receipt?: string;
}

const formatINR = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (status: string) =>
    cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
        status === "Approved" && "bg-emerald-50 text-success border-emerald-200",
        status === "Pending" && "bg-amber-50 text-warning border-amber-200",
        status === "Rejected" && "bg-rose-50 text-destructive border-rose-200",
    );

const statusIcon = (status: string) =>
    status === "Approved" ? CheckCircle2 : status === "Rejected" ? XCircle : AlertCircle;

const typeIcon = (t?: string) => {
    const k = (t || "").toLowerCase();
    if (k === "travel") return Bus;
    if (k === "food") return Utensils;
    return Box;
};

const MyExpenses = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<"All" | "Approved" | "Pending" | "Rejected">("All");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isMoneyRequestOpen, setIsMoneyRequestOpen] = useState(false);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const refresh = () => setRefreshTrigger((prev) => prev + 1);

    useEffect(() => {
        const fetchExpenses = async () => {
            if (!user?.id) return;
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/expenses?employeeId=${user.id}`, {
                    credentials: "include",
                });
                if (response.ok) setExpenses(await response.json());
            } catch (error) {
                console.error("Error fetching expenses:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchExpenses();
    }, [user?.id, refreshTrigger]);
    
    const handleDelete = async (id: number | string) => {
        if (!confirm("Are you sure you want to delete this expense claim?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (response.ok) {
                refresh();
            } else {
                alert("Failed to delete expense");
            }
        } catch (error) {
            console.error("Error deleting expense:", error);
            alert("An error occurred while deleting");
        }
    };

    const totals = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const approved = expenses.filter((e) => e.status === "Approved").reduce((s, e) => s + (e.totalAmount || 0), 0);
        const pending = expenses.filter((e) => e.status === "Pending").reduce((s, e) => s + (e.totalAmount || 0), 0);
        const ytd = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
        
        const thisMonth = expenses
            .filter((e) => {
                const d = new Date(e.claimDate);
                return d >= startOfMonth && e.status !== "Rejected";
            })
            .reduce((s, e) => s + (e.totalAmount || 0), 0);

        return { approved, pending, ytd, thisMonth, count: expenses.length };
    }, [expenses]);

    const counts = useMemo(
        () => ({
            All: expenses.length,
            Approved: expenses.filter((e) => e.status === "Approved").length,
            Pending: expenses.filter((e) => e.status === "Pending").length,
            Rejected: expenses.filter((e) => e.status === "Rejected").length,
        }),
        [expenses]
    );

    const filteredExpenses = expenses.filter((exp) => {
        if (filter !== "All" && exp.status !== filter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        if (exp.claimDate && new Date(exp.claimDate).toLocaleDateString().toLowerCase().includes(q)) return true;
        return exp.items?.some(
            (item) =>
                (item.type && item.type.toLowerCase().includes(q)) ||
                (item.description && item.description.toLowerCase().includes(q))
        );
    });

    const { data: myFundRequests = [], refetch: refetchMyFundRequests } = useQuery({
        queryKey: ['my-fund-requests'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/money-request`, { credentials: 'include' });
            if (!res.ok) return [];
            return res.json();
        },
        refetchInterval: 10000,
    });

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">My Expenses</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Submit and track your reimbursement claims.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMoneyRequestOpen(true)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                        >
                            <DollarSign size={14} className="text-emerald-600" /> Request Funds
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 shadow-sm shadow-emerald-700/20"
                        >
                            <Plus size={14} /> New claim
                        </button>
                    </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Total YTD</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{formatINR(totals.ytd)}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">{totals.count} {totals.count === 1 ? "claim" : "claims"}</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Approved</p>
                        <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">{formatINR(totals.approved)}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="text-[11px] text-muted-foreground">{counts.Approved} reimbursed</span>
                        </div>
                    </div>



                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Monthly Balance</p>
                        <p className={cn(
                            "mt-1.5 text-2xl font-semibold tabular-nums",
                            user?.expenseLimit > 0 && (user.expenseLimit - totals.thisMonth) <= 0 ? "text-destructive" : "text-foreground"
                        )}>
                            {user?.expenseLimit > 0 ? formatINR(Math.max(0, user.expenseLimit - totals.thisMonth)) : "∞"}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <Box size={12} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">
                                {user?.expenseLimit > 0 ? `Monthly Limit: ${formatINR(user.expenseLimit)}` : "No limit set"}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Rejected</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{counts.Rejected}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <XCircle size={12} className="text-destructive" />
                            <span className="text-[11px] text-muted-foreground">claims rejected</span>
                        </div>
                    </div>
                </div>

                {/* Fund Request History - Fetching from DB */}
                {myFundRequests.length > 0 && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="px-5 py-3 border-b border-border bg-emerald-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-600" />
                                <h2 className="text-sm font-semibold text-foreground">Fund Request History</h2>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-tight">
                                {myFundRequests.length} {myFundRequests.length === 1 ? 'Request' : 'Requests'}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/40 border-b border-border">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</th>
                                        <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Urgency</th>
                                        <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Submitted</th>
                                        <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                                        <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {myFundRequests.map((req: any) => (
                                        <tr key={req.id} className="hover:bg-secondary/20 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="text-sm font-bold text-foreground/80">{req.reason}</p>
                                                {req.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]" title={req.description}>{req.description}</p>}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                    req.urgency === 'High' ? "bg-red-50 text-red-600 border-red-100" :
                                                    req.urgency === 'Medium' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                    "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                )}>
                                                    {req.urgency}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
                                                {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-5 py-3 text-right text-sm font-black text-foreground tabular-nums">
                                                ₹{req.amount.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5",
                                                    req.status === 'Approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                    req.status === 'Disabled' ? "bg-slate-100 text-slate-500 border-slate-200" :
                                                    "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full animate-pulse",
                                                        req.status === 'Approved' ? "bg-emerald-500" :
                                                        req.status === 'Disabled' ? "bg-slate-400" : "bg-amber-500"
                                                    )} />
                                                    {req.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Toolbar */}
                    <div className="px-5 py-3 border-b border-border flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-semibold text-foreground">Claim History</h2>
                                <span className="text-[11px] text-muted-foreground">{expenses.length} total</span>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                <input
                                    type="text"
                                    placeholder="Search by date, type or item…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground placeholder:text-muted-foreground/70"
                                />
                            </div>
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
                            <p className="text-xs text-muted-foreground">Loading claims…</p>
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                                <Receipt size={18} className="text-muted-foreground/70" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No claims found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {searchQuery
                                    ? "Try a different search term."
                                    : filter === "All"
                                        ? "You haven't submitted any claims yet."
                                        : `No ${filter.toLowerCase()} claims.`}
                            </p>
                            {searchQuery ? (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-success hover:text-emerald-800"
                                >
                                    Clear search
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-success hover:text-emerald-800"
                                >
                                    Submit a claim <ChevronRight size={12} />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/50/60 border-b border-border">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Date</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Items</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Categories</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Status</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Amount</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredExpenses.map((exp) => {
                                        const StatusIcon = statusIcon(exp.status);
                                        const types = Array.from(new Set((exp.items || []).map((i) => i.type).filter(Boolean) as string[]));
                                        const itemCount = exp.items?.length || 0;
                                        return (
                                            <tr key={exp.id} className="hover:bg-secondary/50/50 transition-colors">
                                                <td className="px-5 py-3 whitespace-nowrap">
                                                    <span className="text-sm text-foreground tabular-nums">
                                                        {new Date(exp.claimDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {itemCount} {itemCount === 1 ? "item" : "items"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {types.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground/70">—</span>
                                                        ) : (
                                                            types.map((t) => {
                                                                const Icon = typeIcon(t);
                                                                return (
                                                                    <span
                                                                        key={t}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border bg-secondary/50 text-[11px] font-medium text-foreground"
                                                                    >
                                                                        <Icon size={11} />
                                                                        {t}
                                                                    </span>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={statusBadge(exp.status)}>
                                                        <StatusIcon size={11} />
                                                        {exp.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="text-sm font-semibold text-foreground tabular-nums">
                                                        {formatINR(exp.totalAmount)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <button
                                                        onClick={() => setSelectedExpense(exp as Expense)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-success hover:bg-emerald-50 transition"
                                                        title="View details"
                                                    >
                                                        <Eye size={12} />
                                                        View
                                                    </button>
                                                    {exp.status === "Pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingExpense(exp as Expense);
                                                                    setIsAddModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-success hover:bg-emerald-50 transition"
                                                                title="Edit claim"
                                                            >
                                                                <Pencil size={12} />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(exp.id)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-destructive hover:bg-rose-50 transition"
                                                                title="Delete claim"
                                                            >
                                                                <Trash2 size={12} />
                                                                Delete
                                                            </button>
                                                        </>
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

            <AddExpenseModal
                isOpen={isAddModalOpen}
                expense={editingExpense}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingExpense(null);
                }}
                onSuccess={refresh}
            />

            <AdditionalMoneyRequestModal
                isOpen={isMoneyRequestOpen}
                onClose={() => setIsMoneyRequestOpen(false)}
                onSuccess={refetchMyFundRequests}
            />

            <Dialog open={selectedExpense !== null} onOpenChange={(open) => !open && setSelectedExpense(null)}>
                <DialogContent className="sm:max-w-[600px] p-0 border-border">
                    <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/30">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-sm font-bold text-foreground tracking-tight">
                                Claim Detailed Breakup
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="p-6 bg-card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedExpense?.items?.map((item: any, idx: number) => (
                                <div key={idx} className="bg-white border border-border px-4 py-3 rounded-xl shadow-sm space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-bold border border-border">
                                                {item.type}
                                            </span>
                                            {item.paymentMode && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                    {item.paymentMode}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-black text-foreground">₹{Number(item.price).toLocaleString()}</span>
                                    </div>

                                    {item.type === 'Travel' ? (
                                        <div className="flex flex-wrap gap-y-1.5 gap-x-4">
                                            <div className="flex items-center gap-1.5 min-w-[80px]">
                                                <MapPin size={10} className="text-muted-foreground/70" />
                                                <span className="text-[11px] text-muted-foreground font-medium truncate">{item.from} → {item.to}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard size={10} className="text-muted-foreground/70" />
                                                <span className="text-[11px] text-muted-foreground font-medium">via {item.via}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic">
                                            "{item.description || "No description provided"}"
                                        </p>
                                    )}

                                    {item.receipt && (
                                        <div className="pt-1">
                                            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Receipt</p>
                                            {/\.pdf(\?|$)/i.test(item.receipt) ? (
                                                <button type="button" onClick={() => setPreviewSrc(item.receipt!)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">
                                                    <Eye size={12} /> View receipt (PDF)
                                                </button>
                                            ) : (
                                                <button type="button" onClick={() => setPreviewSrc(item.receipt!)} className="block">
                                                    <img
                                                        src={item.receipt}
                                                        alt="Receipt"
                                                        className="max-h-32 rounded-md border border-border object-contain hover:opacity-90 transition cursor-pointer"
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

            <FilePreviewModal
                src={previewSrc}
                open={!!previewSrc}
                onClose={() => setPreviewSrc(null)}
                title="Receipt"
            />
        </div>
    );
};

export default MyExpenses;
