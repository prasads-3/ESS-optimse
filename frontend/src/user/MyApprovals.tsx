import { API_BASE_URL } from "@/config";
import { useState, useEffect, useCallback } from "react";
import {
    CheckCircle2,
    XCircle,
    Loader2,
    CalendarDays,
    Wallet,
    Coins,
    Inbox,
    ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { toast } from "sonner";

type Kind = "leave" | "expense" | "fund";

interface ApprovalItem {
    kind: Kind;
    id: number;
    requester: { id: number; name: string; photo?: string | null; department?: string | null } | null;
    title: string;
    detail: string;
    reason: string | null;
    amount: number | null;
    createdAt: string;
    finalStage: boolean;
    approvalHistory: { approverName?: string; action: string; note?: string | null; at?: string }[];
}

const KIND_META: Record<Kind, { label: string; icon: any; tint: string }> = {
    leave: { label: "Leave", icon: CalendarDays, tint: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    expense: { label: "Expense", icon: Wallet, tint: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    fund: { label: "Fund", icon: Coins, tint: "bg-amber-50 text-amber-700 border-amber-200" },
};

// Endpoint + status payload for an approve/reject on each request type.
const actOn = async (item: ApprovalItem, action: "approve" | "reject", note: string) => {
    if (item.kind === "fund") {
        return fetch(`${API_BASE_URL}/api/admin/money-requests/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: action === "approve" ? "Approved" : "Disabled", adminNote: note || undefined }),
        });
    }
    const path = item.kind === "leave" ? "leaves" : "expenses";
    return fetch(`${API_BASE_URL}/api/${path}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: action === "approve" ? "Approved" : "Rejected", note: note || undefined }),
    });
};

const MyApprovals = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<ApprovalItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"All" | Kind>("All");
    const [busyId, setBusyId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/approvals`, { credentials: "include" });
            if (res.ok) setItems(await res.json());
        } catch (e) {
            console.error("Error fetching approvals:", e);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (item: ApprovalItem, action: "approve" | "reject") => {
        let note = "";
        if (action === "reject") {
            const input = window.prompt("Add a reason for rejection (optional):", "");
            if (input === null) return; // cancelled
            note = input;
        }
        const key = `${item.kind}:${item.id}`;
        setBusyId(key);
        try {
            const res = await actOn(item, action, note);
            if (res.ok) {
                toast.success(action === "approve" ? "Request approved and forwarded" : "Request rejected");
                setItems((prev) => prev.filter((i) => !(i.kind === item.kind && i.id === item.id)));
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to update request");
            }
        } catch (e) {
            console.error("Approval action error:", e);
            toast.error("Failed to update request");
        } finally {
            setBusyId(null);
        }
    };

    const filtered = items.filter((i) => filter === "All" || i.kind === filter);
    const counts = {
        All: items.length,
        leave: items.filter((i) => i.kind === "leave").length,
        expense: items.filter((i) => i.kind === "expense").length,
        fund: items.filter((i) => i.kind === "fund").length,
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">Approvals</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Requests from your team awaiting your decision. Approving forwards a request up the reporting chain; rejecting ends it.
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    {(["All", "leave", "expense", "fund"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors capitalize",
                                filter === f
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                            )}
                        >
                            {f === "All" ? "All" : KIND_META[f].label} ({counts[f]})
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="py-20 flex items-center justify-center text-muted-foreground">
                        <Loader2 className="animate-spin" size={18} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground">
                        <Inbox size={32} className="mb-3 opacity-40" />
                        <p className="text-sm font-medium">No requests awaiting your approval.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((item) => {
                            const meta = KIND_META[item.kind];
                            const Icon = meta.icon;
                            const key = `${item.kind}:${item.id}`;
                            const busy = busyId === key;
                            return (
                                <div
                                    key={key}
                                    className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <EmployeeAvatar name={item.requester?.name || "?"} photo={item.requester?.photo || undefined} size="md" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-foreground truncate">{item.requester?.name || "Unknown"}</span>
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border", meta.tint)}>
                                                    <Icon size={11} /> {meta.label}
                                                </span>
                                                {item.finalStage && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                                        <ShieldCheck size={11} /> Final approval
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {item.title}
                                                {item.detail ? ` · ${item.detail}` : ""}
                                                {item.amount != null ? ` · ₹${Number(item.amount).toLocaleString()}` : ""}
                                            </p>
                                            {item.reason && (
                                                <p className="text-xs text-foreground/70 mt-1 line-clamp-2">"{item.reason}"</p>
                                            )}
                                            {item.approvalHistory?.length > 0 && (
                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                    {item.approvalHistory.length} prior approval{item.approvalHistory.length > 1 ? "s" : ""} in chain
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleAction(item, "reject")}
                                            disabled={busy}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60 transition-colors"
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(item, "approve")}
                                            disabled={busy}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                                        >
                                            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            {item.finalStage ? "Final approve" : "Approve"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyApprovals;
