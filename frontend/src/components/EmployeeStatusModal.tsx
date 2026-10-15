import { API_BASE_URL } from "@/config";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { MapPin, Monitor, Users, WifiOff, Clock } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── Types — mirror the /api/dashboard/employee-status response ───────────────
type Status = "active" | "idle" | "inactive";

interface StatusEmployee {
    id: number | string;
    name: string;
    designation: string | null;
    avatar: string | null;
    loginTime: string | null;
    lastSeen: string | null;
    location: string | null;
    device: string | null;
    status: Status;
}
interface StatusResponse {
    counts: { active: number; idle: number; inactive: number; total: number };
    employees: StatusEmployee[];
}

interface EmployeeStatusModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Tab to show first when the modal opens. */
    defaultTab?: "all" | Status;
}

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

const STATUS_META: Record<Status, { label: string; dot: string; badge: string }> = {
    active: {
        label: "Active",
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    idle: {
        label: "Idle",
        dot: "bg-amber-400",
        badge: "bg-amber-50 text-amber-600 border-amber-200",
    },
    inactive: {
        label: "Inactive",
        dot: "bg-slate-300",
        badge: "bg-slate-100 text-slate-500 border-slate-200",
    },
};

const EmployeeStatusModal = ({ open, onOpenChange, defaultTab = "all" }: EmployeeStatusModalProps) => {
    const { data, isLoading, isError, refetch } = useQuery<StatusResponse>({
        queryKey: ["employee-status"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/dashboard/employee-status`, { credentials: "include" });
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
            return res.json();
        },
        enabled: open,                 // only fetch while the modal is open
        refetchInterval: open ? 30000 : false,
        refetchOnWindowFocus: true,
        staleTime: 0,
    });

    const counts = data?.counts ?? { active: 0, idle: 0, inactive: 0, total: 0 };
    const employees = data?.employees ?? [];

    // A single employee row.
    const Row = (emp: StatusEmployee) => {
        const meta = STATUS_META[emp.status];
        return (
            <div
                key={emp.id}
                className="px-1 py-3 flex items-center gap-3 border-b border-border/40 last:border-0"
            >
                <div className="relative shrink-0">
                    <EmployeeAvatar name={emp.name} photo={emp.avatar || undefined} size="md" />
                    <span
                        className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                            meta.dot
                        )}
                        title={meta.label}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{emp.name}</p>
                        <span
                            className={cn(
                                "shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                meta.badge
                            )}
                        >
                            {meta.label}
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
                    {emp.status === "inactive" ? (
                        <p className="text-[11px] font-medium text-muted-foreground">Not logged in</p>
                    ) : (
                        <>
                            <p className="text-[11px] font-semibold text-foreground tabular-nums flex items-center justify-end gap-1">
                                <Clock size={10} /> {clockTime(emp.loginTime)}
                            </p>
                            <p className="text-[10px] text-muted-foreground" title={`Last seen ${timeAgo(emp.lastSeen)}`}>
                                {emp.status === "idle" ? `idle · ${timeAgo(emp.lastSeen)}` : timeAgo(emp.lastSeen)}
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    };

    // Loading / error wrappers shared by both views.
    const loadingOrError = () => {
        if (isLoading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-1 py-3 flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-secondary shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-secondary rounded" />
                        <div className="h-2.5 w-24 bg-secondary/70 rounded" />
                    </div>
                </div>
            ));
        }
        if (isError) {
            return (
                <div className="py-12 flex flex-col items-center text-center gap-2">
                    <WifiOff size={22} className="text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">Couldn't load employee status</p>
                    <button onClick={() => refetch()} className="text-xs font-semibold text-primary hover:underline">
                        Try again
                    </button>
                </div>
            );
        }
        return null;
    };

    // Flat list for a single-status tab.
    const renderList = (list: StatusEmployee[]) => {
        const fallback = loadingOrError();
        if (fallback) return fallback;
        if (list.length === 0) {
            return (
                <div className="py-12 flex flex-col items-center text-center gap-2">
                    <Users size={22} className="text-muted-foreground/40" />
                    <p className="text-sm font-medium text-foreground">No employees in this category</p>
                </div>
            );
        }
        return list.map(Row);
    };

    // Grouped view for the "All" tab — every status shown as its own section so
    // active, idle and inactive employees are all visible at once.
    const renderGrouped = () => {
        const fallback = loadingOrError();
        if (fallback) return fallback;
        const order: Status[] = ["active", "idle", "inactive"];
        return order.map((status) => {
            const list = employees.filter((e) => e.status === status);
            const meta = STATUS_META[status];
            return (
                <div key={status} className="mb-2">
                    <div className="sticky top-0 z-10 bg-background flex items-center gap-2 py-2">
                        <span className={cn("w-2 h-2 rounded-full", meta.dot)} />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {meta.label}
                        </h4>
                        <span className="text-[11px] font-semibold text-muted-foreground/70">({list.length})</span>
                    </div>
                    {list.length > 0 ? (
                        list.map(Row)
                    ) : (
                        <p className="text-[11px] text-muted-foreground/70 italic px-1 pb-2">No {meta.label.toLowerCase()} employees</p>
                    )}
                </div>
            );
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
                    <DialogTitle className="text-base font-bold">Employee Status</DialogTitle>
                    <DialogDescription className="text-xs">
                        Live status from today's login activity. A logged-in employee turns
                        <span className="font-semibold text-amber-600"> Idle</span> after 5 minutes of inactivity.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="w-full">
                    <div className="px-6 pt-4">
                        <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="all" className="text-xs">All ({counts.total})</TabsTrigger>
                            <TabsTrigger value="active" className="text-xs">Active ({counts.active})</TabsTrigger>
                            <TabsTrigger value="idle" className="text-xs">Idle ({counts.idle})</TabsTrigger>
                            <TabsTrigger value="inactive" className="text-xs">Inactive ({counts.inactive})</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="px-6 py-2 max-h-[55vh] overflow-y-auto">
                        <TabsContent value="all" className="mt-0">{renderGrouped()}</TabsContent>
                        <TabsContent value="active" className="mt-0">{renderList(employees.filter((e) => e.status === "active"))}</TabsContent>
                        <TabsContent value="idle" className="mt-0">{renderList(employees.filter((e) => e.status === "idle"))}</TabsContent>
                        <TabsContent value="inactive" className="mt-0">{renderList(employees.filter((e) => e.status === "inactive"))}</TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeStatusModal;
