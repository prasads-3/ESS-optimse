import { API_BASE_URL } from "@/config";
import { useState } from "react";
import {
    DollarSign,
    Loader2,
    CheckCircle2,
    XCircle,
    Search,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const formatINR = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const URGENCY_COLORS: Record<string, string> = {
    Normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    High: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
    Pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
    Approved: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Approved" },
    Disabled: { color: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle, label: "Disabled" },
};

type FilterType = "All" | "Pending" | "Approved" | "Disabled";

// Reusable admin panel: review and action employee additional money requests.
// Rendered standalone on the Fund Requests page and as the "Fund Requests" tab
// on the Expenses page.
const FundRequestsPanel = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterType>("All");
    const [loadingId, setLoadingId] = useState<number | null>(null);

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ["admin-money-requests"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/admin/money-requests`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        refetchInterval: 5000,   // poll every 5 s — feels real-time
        refetchIntervalInBackground: true,  // keep polling even when tab is unfocused
    });

    const handleAction = async (id: number, status: "Approved" | "Disabled") => {
        setLoadingId(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/money-requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                toast.success(`Request ${status === "Approved" ? "approved" : "disabled"} successfully`);
                queryClient.invalidateQueries({ queryKey: ["admin-money-requests"] });
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to update request");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setLoadingId(null);
        }
    };

    const counts = {
        All: requests.length,
        Pending: requests.filter((r: any) => r.status === "Pending").length,
        Approved: requests.filter((r: any) => r.status === "Approved").length,
        Disabled: requests.filter((r: any) => r.status === "Disabled").length,
    };

    const filtered = requests.filter((r: any) => {
        if (filter !== "All" && r.status !== filter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.employee?.name?.toLowerCase().includes(q) ||
            r.reason?.toLowerCase().includes(q) ||
            r.employee?.department?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {(["All", "Pending", "Approved", "Disabled"] as FilterType[]).map((key) => {
                    const cfg = key === "All"
                        ? { color: "text-primary", bg: "bg-primary/5" }
                        : key === "Pending"
                        ? { color: "text-amber-600", bg: "bg-amber-50" }
                        : key === "Approved"
                        ? { color: "text-emerald-600", bg: "bg-emerald-50" }
                        : { color: "text-slate-500", bg: "bg-slate-100" };
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={cn(
                                "bg-card border border-border rounded-lg p-5 text-left transition-all hover:shadow-sm",
                                filter === key && "ring-2 ring-primary/30 border-primary/40"
                            )}
                        >
                            <p className="text-[11px] font-medium text-muted-foreground">{key}</p>
                            <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums", cfg.color)}>
                                {counts[key]}
                            </p>
                            <div className={cn("mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold", cfg.bg, cfg.color)}>
                                {key} requests
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Table Card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Toolbar */}
                <div className="px-5 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign size={15} className="text-emerald-600" />
                        <h2 className="text-sm font-semibold text-foreground">All Requests</h2>
                        <span className="text-[11px] text-muted-foreground">{filtered.length} results</span>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                        <input
                            type="text"
                            placeholder="Search by name, reason, department…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                        />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-5 flex border-b border-border">
                    {(["All", "Pending", "Approved", "Disabled"] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition",
                                filter === f
                                    ? "border-emerald-700 text-emerald-700"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f}
                            <span className={cn(
                                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded tabular-nums",
                                filter === f ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"
                            )}>
                                {counts[f]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Body */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 size={20} className="text-muted-foreground/70 animate-spin mb-3" />
                        <p className="text-xs text-muted-foreground">Loading requests…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                            <DollarSign size={18} className="text-muted-foreground/70" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No requests found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {search ? "Try a different search term." : `No ${filter !== "All" ? filter.toLowerCase() + " " : ""}requests yet.`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-secondary/40 border-b border-border">
                                <tr>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Employee</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Reason</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Urgency</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Date</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Status</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Amount</th>
                                    <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {filtered.map((req: any) => {
                                    const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.Pending;
                                    const StatusIcon = statusCfg.icon;
                                    const isPending = req.status === "Pending";
                                    const isProcessing = loadingId === req.id;
                                    return (
                                        <tr key={req.id} className="hover:bg-secondary/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                                                        {(req.employee?.name || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">{req.employee?.name || "Unknown"}</p>
                                                        <p className="text-[11px] text-muted-foreground">{req.employee?.department || req.employee?.title || "—"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 max-w-[180px]">
                                                <p className="text-sm text-foreground font-medium truncate" title={req.reason}>{req.reason}</p>
                                                {req.description && (
                                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={req.description}>{req.description}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border", URGENCY_COLORS[req.urgency] || URGENCY_COLORS.Normal)}>
                                                    {req.urgency}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border", statusCfg.color)}>
                                                    <StatusIcon size={11} />
                                                    {statusCfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="text-sm font-bold text-foreground tabular-nums">{formatINR(req.amount)}</span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {isPending ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            disabled={isProcessing}
                                                            onClick={() => handleAction(req.id, "Approved")}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                                                        >
                                                            {isProcessing ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={isProcessing}
                                                            onClick={() => handleAction(req.id, "Disabled")}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                                                        >
                                                            <XCircle size={11} />
                                                            Disable
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground italic">No action</span>
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
    );
};

export default FundRequestsPanel;
