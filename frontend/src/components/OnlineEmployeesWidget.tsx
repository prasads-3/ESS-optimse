import { API_BASE_URL } from "@/config";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { MapPin, Monitor, Users, RefreshCw, WifiOff } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";

// ── Types — mirror the /api/dashboard/online-employees response ──────────────
interface OnlineEmployee {
    id: number | string;
    name: string;
    designation: string | null;
    avatar: string | null;
    loginTime: string | null;
    lastSeen: string | null;
    location: string | null;
    device: string | null;
    status: string; // "active" | "idle" | ...
}
interface OnlineResponse {
    totalOnline: number;
    employees: OnlineEmployee[];
}

interface OnlineEmployeesWidgetProps {
    className?: string;
    /** Auto-refresh interval in ms (default 20s). */
    refetchInterval?: number;
}

// Compact relative-time formatter ("just now", "5m ago", "2h ago", "3d ago").
const timeAgo = (iso: string | null): string => {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms)) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const clockTime = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Online Employees widget. Fully data-driven: fetches currently-online employees
 * from the backend, polls for live updates, and renders header count + rows from
 * the API response. Handles loading, empty, and error states. No hardcoded data.
 */
const OnlineEmployeesWidget = ({ className, refetchInterval = 20000 }: OnlineEmployeesWidgetProps) => {
    const { data, isLoading, isError, refetch, isFetching } = useQuery<OnlineResponse>({
        queryKey: ["online-employees"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/dashboard/online-employees`, { credentials: "include" });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            return res.json();
        },
        refetchInterval,            // live updates as people log in / out / idle
        refetchOnWindowFocus: true,
        staleTime: 0,
    });

    const total = data?.totalOnline ?? 0;
    const employees = data?.employees ?? [];

    return (
        <div className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}>
            {/* Header — count comes from live backend data */}
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", total > 0 && "animate-ping bg-emerald-400")} />
                        <span className={cn("relative inline-flex rounded-full h-2 w-2", total > 0 ? "bg-emerald-500" : "bg-slate-300")} />
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
                        Online Employees {!isLoading && !isError && <span className="text-foreground">({total})</span>}
                    </h2>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    title="Refresh"
                    className="text-muted-foreground/60 hover:text-primary transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={13} className={cn(isFetching && "animate-spin")} />
                </button>
            </div>

            {/* Body — caps at ~3 rows, then scrolls */}
            <div
                className={cn(
                    "divide-y divide-border/40",
                    !isLoading && !isError && employees.length > 3 && "max-h-[270px] overflow-y-auto"
                )}
            >
                {isLoading ? (
                    // Loading skeletons
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                            <div className="h-9 w-9 rounded-full bg-secondary shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-32 bg-secondary rounded" />
                                <div className="h-2.5 w-24 bg-secondary/70 rounded" />
                            </div>
                            <div className="h-3 w-12 bg-secondary rounded" />
                        </div>
                    ))
                ) : isError ? (
                    // Error state — graceful, with retry
                    <div className="px-5 py-10 flex flex-col items-center text-center gap-2">
                        <WifiOff size={22} className="text-muted-foreground/50" />
                        <p className="text-sm font-medium text-foreground">Couldn't load online employees</p>
                        <button onClick={() => refetch()} className="text-xs font-semibold text-primary hover:underline">
                            Try again
                        </button>
                    </div>
                ) : employees.length === 0 ? (
                    // Empty state
                    <div className="px-5 py-10 flex flex-col items-center text-center gap-2">
                        <Users size={22} className="text-muted-foreground/40" />
                        <p className="text-sm font-medium text-foreground">No employees online</p>
                        <p className="text-[11px] text-muted-foreground">They'll appear here as soon as they log in.</p>
                    </div>
                ) : (
                    // Rows — rendered from API data
                    employees.map((emp) => {
                        const idle = String(emp.status).toLowerCase() === "idle";
                        return (
                            <div key={emp.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                                <div className="relative shrink-0">
                                    <EmployeeAvatar name={emp.name} photo={emp.avatar || undefined} size="md" />
                                    <span
                                        className={cn(
                                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                                            idle ? "bg-amber-400" : "bg-emerald-500"
                                        )}
                                        title={idle ? "Idle" : "Active"}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-foreground truncate">{emp.name}</p>
                                        <span
                                            className={cn(
                                                "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                                idle ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                            )}
                                        >
                                            {idle ? "Idle" : "Active"}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">{emp.designation || "—"}</p>
                                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground/80">
                                        {emp.location && (
                                            <span className="flex items-center gap-1 truncate"><MapPin size={9} /> {emp.location}</span>
                                        )}
                                        {emp.device && (
                                            <span className="flex items-center gap-1 truncate"><Monitor size={9} /> {emp.device}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-[11px] font-semibold text-foreground tabular-nums">{clockTime(emp.loginTime)}</p>
                                    <p className="text-[10px] text-muted-foreground" title={`Last seen ${timeAgo(emp.lastSeen)}`}>
                                        {timeAgo(emp.lastSeen)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default OnlineEmployeesWidget;
