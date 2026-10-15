import { API_BASE_URL } from "@/config";
import { useState, useEffect, useMemo } from "react";
import {
    Plus,
    X,
    Trash2,
    Loader2,
    Receipt,
    Bus,
    Box,
    MapPin,
    Info,
    Utensils,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import FileDropInput from "@/components/FileDropInput";

// When `expense` is provided the modal opens in edit mode: fields are
// pre-filled from the existing claim and saving PUTs to /api/expenses/:id.
interface EditableExpense {
    id: number | string;
    claimDate: string;
    receipt?: string;
    items?: {
        type?: string;
        from?: string;
        to?: string;
        via?: string;
        description?: string;
        price?: string | number;
        paymentMode?: string;
        receipt?: string;
    }[];
}

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    expense?: EditableExpense | null;
}

type ExpenseType = "Travel" | "Food" | "Miscellaneous";

interface ExpenseRow {
    id: string;
    type: ExpenseType;
    from?: string;
    to?: string;
    via?: string;
    description?: string;
    price: string;
    paymentMode?: string;
    receipt?: string;      // base64 data URL (new upload) or stored URL (when editing)
    receiptName?: string;  // display label for the attached receipt
}

const TRANSPORT_OPTIONS = ["Rickshaw", "Bus", "Cab", "Train", "Metro", "Other"];
// Optional per-item payment mode. "" = not specified.
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Online"];

const todayStr = () => new Date().toISOString().slice(0, 10);

const newRow = (type: ExpenseType = "Travel"): ExpenseRow => ({
    id: Math.random().toString(36).slice(2, 10),
    type,
    from: type === "Travel" ? "" : undefined,
    to: type === "Travel" ? "" : undefined,
    via: type === "Travel" ? "Bus" : undefined,
    description: type === "Travel" ? undefined : "",
    price: "",
    paymentMode: "",
    receipt: "",
    receiptName: "",
});

const AddExpenseModal = ({ isOpen, onClose, onSuccess, expense }: AddExpenseModalProps) => {
    const { user } = useAuth();
    const isEdit = !!expense;

    const [date, setDate] = useState("");
    const [rows, setRows] = useState<ExpenseRow[]>([newRow("Travel")]);
    const [isLoading, setIsLoading] = useState(false);
    // Admin-set monthly expense limit + this month's usage (fetched on open).
    // limit === 0 means the admin hasn't granted an allowance yet.
    const [limit, setLimit] = useState(0);
    const [usedThisMonth, setUsedThisMonth] = useState(0);

    useEffect(() => {
        if (!isOpen || !user?.id) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/stats/${user.id}`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setLimit(data?.expenseStats?.limit ?? 0);
                    setUsedThisMonth(data?.expenseStats?.usedThisMonth ?? 0);
                }
            } catch (e) {
                console.error("Failed to load expense limit", e);
            }
        })();
    }, [isOpen, user?.id]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    // Seed the form when opening: pre-fill from the claim being edited,
    // or reset to a blank draft for a new claim.
    useEffect(() => {
        if (!isOpen) return;
        if (expense) {
            setDate(expense.claimDate ? new Date(expense.claimDate).toISOString().slice(0, 10) : "");
            const seeded = (expense.items || []).map((item) => {
                const type: ExpenseType = item.type === "Travel" || item.type === "Food" ? item.type : "Miscellaneous";
                return {
                    id: Math.random().toString(36).slice(2, 10),
                    type,
                    from: type === "Travel" ? item.from || "" : undefined,
                    to: type === "Travel" ? item.to || "" : undefined,
                    via: type === "Travel" ? item.via || "Bus" : undefined,
                    description: type === "Travel" ? undefined : item.description || "",
                    price: item.price != null ? String(item.price) : "",
                    paymentMode: item.paymentMode || "",
                    receipt: item.receipt || "",
                    receiptName: item.receipt ? "Receipt attached" : "",
                };
            });
            setRows(seeded.length > 0 ? seeded : [newRow("Travel")]);
        } else {
            setDate("");
            setRows([newRow("Travel")]);
        }
    }, [isOpen, expense]);

    const totals = useMemo(() => {
        const sumOf = (t: ExpenseType) =>
            rows.filter((r) => r.type === t).reduce((s, r) => s + (parseFloat(r.price) || 0), 0);
        const total = rows.reduce((s, r) => s + (parseFloat(r.price) || 0), 0);
        return {
            total,
            travel: sumOf("Travel"),
            food: sumOf("Food"),
            misc: sumOf("Miscellaneous"),
        };
    }, [rows]);

    // Admin limit is monthly. Exclude the claim being edited from "used" so an
    // edit isn't double-counted against the month's total.
    const editingOriginalTotal = useMemo(
        () => (expense?.items || []).reduce((s, i) => s + (parseFloat(String(i.price)) || 0), 0),
        [expense]
    );
    const noLimit = limit <= 0;
    const projectedMonthTotal = Math.max(0, usedThisMonth - editingOriginalTotal) + totals.total;
    const exceedsLimit = !noLimit && projectedMonthTotal > limit;
    const remaining = Math.max(0, limit - projectedMonthTotal);
    const limitPct = limit > 0 ? Math.min(100, (projectedMonthTotal / limit) * 100) : 0;

    if (!isOpen) return null;

    const addRow = () => setRows([...rows, newRow("Travel")]);
    const removeRow = (id: string) => rows.length > 1 && setRows(rows.filter((r) => r.id !== id));
    const updateRow = (id: string, field: keyof ExpenseRow, value: any) => {
        setRows(rows.map((r) => {
            if (r.id !== id) return r;
            if (field === "type") return { ...newRow(value as ExpenseType), id };
            return { ...r, [field]: value };
        }));
    };

    // Per-item receipt: read the chosen file as base64 and store it on that row.
    const handleRowFile = (id: string, file: File | undefined) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = (e.target?.result as string) || "";
            setRows((prev) => prev.map((r) => (r.id === id ? { ...r, receipt: base64, receiptName: file.name } : r)));
        };
        reader.readAsDataURL(file);
    };

    const clearRowFile = (id: string) =>
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, receipt: "", receiptName: "" } : r)));

    const handleSubmit = async () => {
        if (!date) return toast.error("Please select a claim date");
        const incomplete = rows.some((r) =>
            r.type === "Travel" ? !r.from || !r.to || !r.price : !r.description || !r.price
        );
        if (incomplete) return toast.error("Please fill all fields for every item");
        if (noLimit) {
            return toast.error("Your admin has not set an expense limit yet. Please contact your admin.");
        }
        if (exceedsLimit) {
            return toast.error(`This claim exceeds your remaining monthly limit of ₹${remaining.toLocaleString("en-IN")}.`);
        }
        if (!user?.id) return toast.error("Authentication error. Please log in again.");

        setIsLoading(true);
        try {
            const res = await fetch(
                isEdit ? `${API_BASE_URL}/api/expenses/${expense.id}` : `${API_BASE_URL}/api/expenses`,
                {
                    method: isEdit ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ date, rows, employeeId: user.id }),
                }
            );
            if (res.ok) {
                toast.success(isEdit ? "Expense claim updated" : "Expense report submitted");
                setDate("");
                setRows([newRow("Travel")]);
                onClose();
                if (onSuccess) onSuccess();
            } else {
                // Tolerate non-JSON bodies (e.g. the SPA fallback's HTML when a
                // stale server doesn't know this route yet).
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || err.error || (isEdit ? "Failed to update expense claim" : "Failed to submit expense report"));
            }
        } catch (e) {
            console.error(e);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl bg-card rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[92vh] border border-border">
                {/* Header */}
                <div className="flex items-start justify-between px-7 py-5 border-b border-border">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-foreground">{isEdit ? "Edit Expense Claim" : "New Expense Claim"}</h2>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded">{isEdit ? "EDITING" : "DRAFT"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isEdit
                                ? "Correct anything you missed — the claim stays pending for approval."
                                : noLimit
                                    ? "Your admin has not set an expense limit yet."
                                    : `Submit travel, food and miscellaneous expenses within your ₹${limit.toLocaleString("en-IN")} monthly admin limit.`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-secondary rounded-md transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Form */}
                        <div className="lg:col-span-8 p-7 space-y-6 lg:border-r lg:border-border">
                            {/* Date */}
                            <div className="space-y-2 max-w-xs">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">Claim date</label>
                                    <span className="text-[11px] text-muted-foreground/70">Required</span>
                                </div>
                                <input
                                    type="date"
                                    value={date}
                                    max={todayStr()}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground"
                                />
                            </div>

                            {/* Items */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">
                                        Line items
                                        <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                                            ({rows.length} {rows.length === 1 ? "item" : "items"})
                                        </span>
                                    </label>
                                </div>

                                <div className="space-y-2.5">
                                    {rows.map((row, idx) => (
                                        <div key={row.id} className="border border-border rounded-md bg-card">
                                            {/* Row header */}
                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-secondary/50/60">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[11px] font-semibold text-muted-foreground">#{idx + 1}</span>
                                                    <div className="flex items-center gap-1 p-0.5 bg-card border border-border rounded">
                                                        {([
                                                            { value: "Travel", label: "Travel", Icon: Bus },
                                                            { value: "Food", label: "Food", Icon: Utensils },
                                                            { value: "Miscellaneous", label: "Misc", Icon: Box },
                                                        ] as { value: ExpenseType; label: string; Icon: any }[]).map(({ value, label, Icon }) => (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                onClick={() => updateRow(row.id, "type", value)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition",
                                                                    row.type === value
                                                                        ? "bg-emerald-700 text-white"
                                                                        : "text-muted-foreground hover:bg-secondary"
                                                                )}
                                                            >
                                                                <Icon size={11} />
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(row.id)}
                                                    disabled={rows.length === 1}
                                                    className={cn(
                                                        "p-1.5 rounded transition",
                                                        rows.length === 1
                                                            ? "text-slate-200 cursor-not-allowed"
                                                            : "text-muted-foreground/70 hover:text-rose-600 hover:bg-rose-50"
                                                    )}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Row body */}
                                            <div className="p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                    {row.type === "Travel" ? (
                                                        <>
                                                            <div className="sm:col-span-3 space-y-1">
                                                                <label className="text-[11px] font-medium text-muted-foreground">From</label>
                                                                <div className="relative">
                                                                    <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                                                    <input
                                                                        value={row.from}
                                                                        onChange={(e) => updateRow(row.id, "from", e.target.value)}
                                                                        placeholder="Origin"
                                                                        className="w-full bg-card border border-border rounded-md pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground placeholder:text-muted-foreground/70"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="sm:col-span-2 space-y-1">
                                                                <label className="text-[11px] font-medium text-muted-foreground">To</label>
                                                                <div className="relative">
                                                                    <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                                                    <input
                                                                        value={row.to}
                                                                        onChange={(e) => updateRow(row.id, "to", e.target.value)}
                                                                        placeholder="Destination"
                                                                        className="w-full bg-card border border-border rounded-md pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground placeholder:text-muted-foreground/70"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="sm:col-span-2 space-y-1">
                                                                <label className="text-[11px] font-medium text-muted-foreground">Mode</label>
                                                                <select
                                                                    value={row.via}
                                                                    onChange={(e) => updateRow(row.id, "via", e.target.value)}
                                                                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground cursor-pointer"
                                                                >
                                                                    {TRANSPORT_OPTIONS.map((opt) => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="sm:col-span-7 space-y-1">
                                                            <label className="text-[11px] font-medium text-muted-foreground">Description</label>
                                                            <div className="relative">
                                                                {row.type === "Food" ? (
                                                                    <Utensils size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                                                ) : (
                                                                    <Box size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                                                )}
                                                                <input
                                                                    value={row.description}
                                                                    onChange={(e) => updateRow(row.id, "description", e.target.value)}
                                                                    placeholder={row.type === "Food" ? "Meal or restaurant name" : "Describe the expense"}
                                                                    className="w-full bg-card border border-border rounded-md pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground placeholder:text-muted-foreground/70"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="sm:col-span-2 space-y-1">
                                                        <label className="text-[11px] font-medium text-muted-foreground">Payment</label>
                                                        <select
                                                            value={row.paymentMode || ""}
                                                            onChange={(e) => updateRow(row.id, "paymentMode", e.target.value)}
                                                            className="w-full bg-card border border-border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground cursor-pointer"
                                                        >
                                                            <option value="">—</option>
                                                            {PAYMENT_MODES.map((opt) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="sm:col-span-3 space-y-1">
                                                        <label className="text-[11px] font-medium text-muted-foreground">Amount (₹)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                                                            <input
                                                                type="number"
                                                                inputMode="decimal"
                                                                min="0"
                                                                step="0.01"
                                                                value={row.price}
                                                                onChange={(e) => updateRow(row.id, "price", e.target.value)}
                                                                placeholder="0.00"
                                                                className="w-full bg-card border border-border rounded-md pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition font-semibold text-foreground placeholder:text-muted-foreground/70 tabular-nums"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Per-item receipt (optional, any payment mode) */}
                                                <div className="mt-3">
                                                    <FileDropInput
                                                        compact
                                                        value={row.receipt}
                                                        fileName={row.receiptName}
                                                        accept=".jpg,.jpeg,.png,.pdf"
                                                        title="Attach receipt"
                                                        hint="JPG, PNG, PDF · 5MB"
                                                        onFile={(file) => handleRowFile(row.id, file)}
                                                        onClear={() => clearRowFile(row.id)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="w-full py-2.5 border border-dashed border-slate-300 rounded-md flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-success hover:border-emerald-500 hover:bg-emerald-50/40 transition"
                                >
                                    <Plus size={14} />
                                    Add line item
                                </button>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 bg-secondary/50/50 p-7 space-y-5">
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Claim Summary</p>
                                <dl className="space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Date</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right">
                                            {date ? new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Travel</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right tabular-nums">
                                            ₹ {totals.travel.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Food</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right tabular-nums">
                                            ₹ {totals.food.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Miscellaneous</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right tabular-nums">
                                            ₹ {totals.misc.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Items</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right">{rows.length}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="border-t border-border pt-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Reimbursement</p>
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {noLimit ? "No admin limit set" : `Admin limit ₹${limit.toLocaleString("en-IN")}`}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={cn(
                                        "text-2xl font-semibold tabular-nums",
                                        exceedsLimit ? "text-rose-600" : "text-success"
                                    )}>
                                        ₹ {totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            exceedsLimit ? "bg-destructive" : "bg-success"
                                        )}
                                        style={{ width: `${limitPct}%` }}
                                    />
                                </div>
                                {noLimit ? (
                                    <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                                        <AlertCircle size={13} className="text-warning mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-800 leading-relaxed">
                                            Your admin hasn't set an expense limit yet. You can't submit claims until they do.
                                        </p>
                                    </div>
                                ) : exceedsLimit ? (
                                    <div className="flex items-start gap-2 mt-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-md">
                                        <AlertCircle size={13} className="text-rose-600 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-rose-800 leading-relaxed">
                                            This claim exceeds your remaining monthly limit of ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground mt-2">
                                        ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining this month
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-border pt-5">
                                <div className="flex items-start gap-2.5">
                                    <Info size={14} className="text-muted-foreground/70 mt-0.5 shrink-0" />
                                    <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
                                        <p>{noLimit
                                            ? "Your admin hasn't set your expense limit yet."
                                            : <>Your monthly expense limit is <span className="font-semibold text-foreground">₹{limit.toLocaleString("en-IN")}</span> (set by admin).</>}</p>
                                        <p>Travel over <span className="font-semibold text-foreground">₹500</span> requires a receipt.</p>
                                        <p>Food and miscellaneous claims need a <span className="font-semibold text-foreground">clear photo</span> of the receipt.</p>
                                        <p>Claims can be edited while they are <span className="font-semibold text-foreground">Pending</span>; approved or rejected claims are locked.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Receipt size={12} className="text-muted-foreground/70" />
                        <span className="text-muted-foreground">Total</span>
                        <span className={cn("font-semibold tabular-nums", exceedsLimit ? "text-rose-600" : "text-foreground")}>
                            ₹ {totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-muted-foreground/70">{noLimit ? "/ no admin limit" : `/ ₹${limit.toLocaleString("en-IN")} admin limit`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-foreground rounded-md hover:bg-secondary transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading || exceedsLimit || noLimit}
                            className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-700/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> {isEdit ? "Saving" : "Submitting"}
                                </>
                            ) : (
                                isEdit ? "Save changes" : "Submit claim"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddExpenseModal;
