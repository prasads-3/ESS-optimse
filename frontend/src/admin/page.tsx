import { API_BASE_URL } from '@/config';
import { lazy, Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Users,
    UserCheck,
    Calendar,
    Clock,
    Plus,
    CheckCircle,
    Megaphone,
    ArrowUpRight,
    ArrowDownRight,
    Clock3,
    FileText,
    MapPin,
    RefreshCw,
    Wallet,
} from "lucide-react";
import { cn, capitalize } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import OnlineEmployeesWidget from "@/components/OnlineEmployeesWidget";

const EmployeeStatusModal = lazy(() => import("@/components/EmployeeStatusModal"));
const AddEmployeeDialog = lazy(() =>
    import("@/components/AddEmployeeDialog").then((m) => ({ default: m.AddEmployeeDialog }))
);
const LeaveAnalyticsChart = lazy(() => import("./LeaveAnalyticsChart"));

const DEFAULT_STATS = {
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingLeaves: 0,
    totalPolicies: 0,
    pendingLeavesList: [],
    activities: [],
    leaveAnalytics: [],
    trend: { total: "+0", active: "+0", leave: "+0" },
};

const STATS_KEY = ["dashboard-stats"] as const;

// Defined at module scope so its identity is stable across renders — otherwise
// React Query re-runs select on every render and hands back a fresh object,
// defeating the structural-sharing memoization that keeps children from
// rerendering when the data is unchanged.
const selectStats = (data: any) => ({
    ...DEFAULT_STATS,
    ...data,
    pendingLeavesList: data?.pendingLeavesList || [],
    activities: data?.activities || [],
    leaveAnalytics: data?.leaveAnalytics || [],
    trend: data?.trend || DEFAULT_STATS.trend,
});

// One-shot "has this element scrolled into view yet" hook. Used to keep the
// recharts bundle + its layout/paint work off the initial render path.
const useInView = <T extends HTMLElement>(rootMargin = "200px") => {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [inView, rootMargin]);

    return { ref, inView };
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: stats = DEFAULT_STATS, isLoading, isFetching, refetch } = useQuery({
        queryKey: STATS_KEY,
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');
            return response.json();
        },
        // No background polling. The dashboard stats only change in response to
        // user actions (approve/reject a leave, add an employee), so we refresh
        // on-demand via queryClient.invalidateQueries(STATS_KEY) in those handlers
        // instead of burning CPU/network on a timer. staleTime (App.tsx) keeps the
        // data fresh enough across navigations without a refetch storm.
        refetchOnWindowFocus: false,
        // Normalize off the cached payload so children receive a structurally
        // stable object and don't rerender on identical refetches.
        select: selectStats,
    });

    const handleLeaveAction = useCallback(async (id: number, status: 'Approved' | 'Rejected') => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/leaves/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
                credentials: 'include'
            });

            if (response.ok) {
                toast.success(`Leave ${status.toLowerCase()} successfully`);
                queryClient.invalidateQueries({ queryKey: STATS_KEY });
            } else {
                toast.error("Failed to update leave status");
            }
        } catch (error) {
            console.error("Error updating leave:", error);
            toast.error("An error occurred");
        }
    }, [queryClient]);

    // Stable navigation handlers so the memoized ActionCards don't rerender.
    const goLeaveList = useCallback(() => navigate("/leave-list"), [navigate]);
    const goDocumentation = useCallback(() => navigate("/documentation"), [navigate]);
    const goAnnouncements = useCallback(() => navigate("/announcements"), [navigate]);
    const goExpenses = useCallback(() => navigate("/expenses-list"), [navigate]);

    // Only mount the analytics chart once its card is near the viewport.
    const { ref: chartRef, inView: chartInView } = useInView<HTMLDivElement>();

    // Employee-status modal (active / idle / inactive from login activity).
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const openStatusModal = useCallback(() => setStatusModalOpen(true), []);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 lg:p-8 space-y-10 max-w-none m-3 overflow-x-hidden">

                {/* Organization Info / Address */}
                {stats.organization?.address && (
                    <div className="bg-primary/5 bespoke-border border-primary/20 rounded-xl p-5 flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                            <MapPin className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Office Location: {stats.organization.name}</h3>
                            <p className="text-[13px] text-muted-foreground font-medium mt-1 leading-relaxed whitespace-pre-wrap">
                                {stats.organization.address}
                            </p>
                        </div>
                    </div>
                )}

                {/* KPI Section */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
                    ) : (
                        <>
                            <KpiCard
                                title="Total Workforce"
                                value={stats.totalEmployees.toLocaleString()}
                                trend={stats.trend.total}
                                trendType={stats.trend.totalType || 'up'}
                                icon={Users}
                            />
                            <KpiCard
                                title="Active Status"
                                value={stats.activeEmployees.toLocaleString()}
                                trend={stats.trend.active}
                                trendType={stats.trend.activeType || 'up'}
                                icon={UserCheck}
                                onClick={openStatusModal}
                            />
                            <KpiCard
                                title="On Leave"
                                value={stats.onLeave.toString()}
                                trend={stats.trend.leave}
                                trendType={stats.trend.leaveType || 'up'}
                                icon={Calendar}
                            />
                            <KpiCard
                                title="Pending"
                                value={stats.pendingLeaves.toString()}
                                icon={Clock}
                            />
                        </>
                    )}
                </div>

                {/* Quick Admin Actions */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-foreground/90">Quick Actions</h3>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            title="Refresh dashboard"
                            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-primary transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={cn(isFetching && "animate-spin")} />
                            Refresh
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
                        <ActionCard icon={Plus} label="New Employee" isPrimary />
                        <ActionCard icon={Wallet} label="Expense " onClick={goExpenses} />
                        <ActionCard icon={CheckCircle} label="Leave list" onClick={goLeaveList} />
                        <ActionCard icon={FileText} label="Documents" onClick={goDocumentation} />
                        <ActionCard
                            icon={Megaphone}
                            label="Announcement"
                            onClick={goAnnouncements}
                        />
                    </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-10">
                    {/* Column 1: Requests & Analytics */}
                    <div className="space-y-10">
                        {/* Leave Requests */}
                        <div className="bg-card bespoke-border bespoke-shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Leave Requests</h2>
                                <button onClick={() => navigate("/leave-list")} className="text-[10px] font-bold uppercase text-primary hover:underline tracking-widest transition-all">View All</button>
                            </div>
                            <div className="divide-y divide-border/40">
                                {stats.pendingLeavesList.length > 0 ? (
                                    stats.pendingLeavesList.slice(0, 5).map((leave: any) => (
                                        <RequestItem
                                            key={leave.id}
                                            id={leave.id}
                                            employeeId={leave.employee?.id}
                                            name={leave.employee?.name || "Unknown"}
                                            type={leave.type}
                                            startDate={leave.startDate}
                                            endDate={leave.endDate}
                                            photo={leave.employee?.photo}
                                            onAction={handleLeaveAction}
                                        />
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                                        No pending leave requests
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Leave Analytics */}
                        <div className="bg-card bespoke-border bespoke-shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Leave Analytics</h2>
                                <span className="text-[10px] font-medium text-muted-foreground/50 bg-secondary/30 px-2 py-0.5 rounded-full">Last 10 Months</span>
                            </div>
                            <div ref={chartRef} className="p-6 h-[300px] w-full">
                                {chartInView ? (
                                    <Suspense fallback={<Skeleton className="h-full w-full rounded-md" />}>
                                        <LeaveAnalyticsChart data={stats.leaveAnalytics || []} />
                                    </Suspense>
                                ) : (
                                    <Skeleton className="h-full w-full rounded-md" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column: Online employees + Recent activity */}
                    <div className="space-y-8 md:space-y-10">
                    <OnlineEmployeesWidget className="bespoke-shadow" />

                    {/* Recent Activity */}
                    <div className="bg-card bespoke-border bespoke-shadow p-6 space-y-8 h-fit">
                        <h3 className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-2">
                            <Clock3 size={14} className="text-primary" />
                            Activity log
                        </h3>
                        <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-0 before:w-px before:bg-border/60">
                            {stats.activities.length > 0 ? (
                                stats.activities.slice(0, 6).map((activity: any, i: number) => (
                                    <ActivityItem
                                        key={i}
                                        action={activity.type === 'employee' ? 'Employee Added' : 'Announcement Posted'}
                                        user={activity.type === 'employee' ? 'Admin' : 'You'}
                                        target={activity.target}
                                        time={activity.time}
                                    />
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground pl-6">No recent activity</div>
                            )}
                        </div>
                    </div>
                    </div>
                </div>

            </div>

            {statusModalOpen && (
                <Suspense fallback={null}>
                    <EmployeeStatusModal
                        open={statusModalOpen}
                        onOpenChange={setStatusModalOpen}
                        defaultTab="all"
                    />
                </Suspense>
            )}
        </div>
    );
};

/* Sub-components (memoized to avoid rerenders on dashboard data refresh) */

const KpiSkeleton = () => (
    <div className="bg-card p-6 rounded-lg bespoke-border bespoke-shadow">
        <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-8 w-24" />
    </div>
);

const KpiCard = memo(({ title, value, subValue, trend, trendType, icon: Icon, onClick }: any) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-card p-6 rounded-lg bespoke-border bespoke-shadow",
            onClick ? "cursor-pointer card-hover" : ""
        )}
    >
        <div className="flex items-center justify-between mb-6">
            <div className="p-2.5 bg-primary/5 rounded-lg text-primary">
                <Icon size={18} />
            </div>
            {trend && (
                <span className={cn(
                    "text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full",
                    trendType === 'up' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                    {trendType === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] font-semibold text-muted-foreground/60">{title}</p>
            <h3 className="text-3xl font-bold mt-2 text-foreground/90">{value}</h3>
            {subValue && <p className="text-[10px] font-medium text-muted-foreground mt-1">{subValue}</p>}
        </div>
    </div>
));
KpiCard.displayName = "KpiCard";

const ActionCard = memo(({ icon: Icon, label, isPrimary, onClick }: any) => {
    const content = (
        <div
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-5 rounded-xl border border-border/60 transition-colors duration-300 cursor-pointer text-center space-y-3.5 group relative overflow-hidden",
                isPrimary
                    ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 hover:bg-primary/95"
                    : "bg-card hover:border-primary/40 hover:bg-primary/5 bespoke-shadow hover:shadow-lg hover:shadow-primary/5"
            )}>
            {isPrimary && (
                <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-bl-3xl translate-x-4 -translate-y-4 group-hover:translate-x-3 group-hover:-translate-y-3 transition-transform" />
            )}
            <div className={cn(
                "p-3 rounded-xl transition-[transform,background-color,color] duration-500 group-hover:scale-110 group-hover:rotate-3",
                isPrimary ? "bg-white/10" : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white"
            )}>
                <Icon size={22} />
            </div>
            <span className="text-[11px] font-bold tracking-wide uppercase leading-tight">
                {label}
            </span>
        </div>
    );

    if (label === "New Employee") {
        return (
            <Suspense fallback={content}>
                <AddEmployeeDialog>{content}</AddEmployeeDialog>
            </Suspense>
        );
    }

    if (label === "Announcement") {
        return content; // Navigate is handled in the onClick pass above
    }

    return content;
});
ActionCard.displayName = "ActionCard";

const RequestItem = memo(({ id, employeeId, name, type, startDate, endDate, photo, onAction }: any) => {
    const navigate = useNavigate();
    // Format dates inside the memoized row so the (relatively expensive)
    // toLocaleDateString calls only run when this row's dates actually change —
    // not on every parent render.
    const dates = useMemo(
        () => `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
        [startDate, endDate]
    );
    // Build the per-row handlers here from the stable `onAction` prop so the row
    // can be memoized — the parent no longer creates fresh closures each render.
    const handleApprove = useCallback(() => onAction(id, 'Approved'), [onAction, id]);
    const handleReject = useCallback(() => onAction(id, 'Rejected'), [onAction, id]);
    const handleOpen = useCallback(
        () => { if (employeeId) navigate(`/admin/leave-history/${employeeId}`); },
        [navigate, employeeId]
    );
    return (
        <div className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors group">
            <div
                className="flex items-center gap-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleOpen}
            >
                <EmployeeAvatar name={name} photo={photo} size="md" className="grayscale-[20%] group-hover:grayscale-0 transition-all" />
                <div className="flex-1">
                    <p className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors">
                        {name || "Unknown User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">{capitalize(type)} • {dates}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleApprove}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm shadow-emerald-100 transition-all active:scale-95"
                >
                    Approve
                </button>
                <button
                    onClick={handleReject}
                    className="px-3 py-1.5 bg-white border border-destructive/20 text-destructive hover:bg-destructive/5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95"
                >
                    Reject
                </button>
            </div>
        </div>
    );
});
RequestItem.displayName = "RequestItem";

const ActivityItem = memo(({ action, user, target, time }: any) => {
    // Pre-format the timestamp once per row instead of on every parent render.
    const label = useMemo(
        () => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        [time]
    );
    return (
        <div className="pl-6 relative">
            <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-card border-2 border-primary/40 flex items-center justify-center z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <div>
                <p className="text-[11px] leading-snug text-slate-600">
                    <span className="font-bold text-slate-900">{user}</span> {action.toLowerCase()} <span className="font-bold text-primary">{target}</span>
                </p>
                <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                    <Clock size={10} /> {label}
                </p>
            </div>
        </div>
    );
});
ActivityItem.displayName = "ActivityItem";

export default AdminDashboard;

