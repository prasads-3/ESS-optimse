import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import {
    ClipboardList,
    Search,
    Loader2,
    Layers,
    ListChecks,
    CalendarRange,
    Flame,
    TrendingUp,
    CheckCircle2,
    Clock,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    PriorityBadge,
    StatusBadge,
    ProgressBar,
    CircularProgress,
    InteractiveDailyTaskRow,
    type TaskItem,
    type Status,
} from "@/components/tasks";
import { useTaskSocket } from "@/hooks/useTaskSocket";

const extractError = async (res: Response, fallback: string): Promise<string> => {
    try {
        const text = await res.text();
        if (!text) return `${fallback} (HTTP ${res.status})`;
        try {
            const j = JSON.parse(text);
            return j.error || j.message || `${fallback} (HTTP ${res.status})`;
        } catch {
            return text.slice(0, 200);
        }
    } catch {
        return `${fallback} (HTTP ${res.status})`;
    }
};

const fmtDate = (s: string) => new Date(s).toLocaleDateString();

type Filter = "all" | "active" | "completed";

const MyTasks = () => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [activeWeekId, setActiveWeekId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/employee/my`, {
                credentials: "include",
            });
            if (!res.ok) {
                toast.error(await extractError(res, "Failed to load tasks"));
                return;
            }
            const data: TaskItem[] = await res.json();
            setTasks(data);
            setSelectedId(prev => {
                if (prev && data.some(t => t.id === prev)) return prev;
                return data[0]?.id ?? null;
            });
        } catch (err) {
            console.error(err);
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Realtime: any task event triggers a debounced refetch
    const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleRefetch = useCallback(() => {
        if (refetchTimer.current) clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => fetchTasks(), 250);
    }, [fetchTasks]);
    useTaskSocket(scheduleRefetch);

    useEffect(() => () => {
        if (refetchTimer.current) clearTimeout(refetchTimer.current);
    }, []);

    const updateDaily = useCallback(
        async (dailyId: number, patch: { status?: Status; comment?: string }) => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/tasks/employee/daily/${dailyId}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(patch),
                    }
                );
                if (!res.ok) {
                    throw new Error(await extractError(res, "Update failed"));
                }
                toast.success(patch.status ? `Marked as ${patch.status}` : "Comment saved");
                await fetchTasks();
            } catch (err: any) {
                console.error(err);
                toast.error(err?.message || "Update failed");
            }
        },
        [fetchTasks]
    );

    /* ---------- derived state ---------- */
    const selectedTask = useMemo(
        () => tasks.find(t => t.id === selectedId) || null,
        [tasks, selectedId]
    );

    // pick a sensible default week when task changes
    useEffect(() => {
        if (!selectedTask) {
            setActiveWeekId(null);
            return;
        }
        const inProgress = selectedTask.weeks.find(w => w.status === "In Progress");
        const firstUnfinished = selectedTask.weeks.find(w => w.progress < 100);
        const next = inProgress || firstUnfinished || selectedTask.weeks[0];
        setActiveWeekId(next?.id ?? null);
    }, [selectedTask?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeWeek = useMemo(
        () => selectedTask?.weeks.find(w => w.id === activeWeekId) || null,
        [selectedTask, activeWeekId]
    );

    const filteredTasks = useMemo(() => {
        const q = search.toLowerCase().trim();
        return tasks.filter(t => {
            if (filter === "active" && t.status === "Completed") return false;
            if (filter === "completed" && t.status !== "Completed") return false;
            if (!q) return true;
            return (
                t.title.toLowerCase().includes(q) ||
                (t.description || "").toLowerCase().includes(q)
            );
        });
    }, [tasks, search, filter]);

    /* ---------- top stats ---------- */
    const stats = useMemo(() => {
        let totalDailies = 0;
        let completedDailies = 0;
        let inProgress = 0;
        let completed = 0;
        for (const t of tasks) {
            if (t.status === "Completed") completed++;
            else if (t.status === "In Progress") inProgress++;
            for (const w of t.weeks) {
                for (const d of w.dailyTasks) {
                    totalDailies++;
                    if (d.status === "Completed") completedDailies++;
                }
            }
        }
        return {
            projects: tasks.length,
            inProgress,
            completed,
            totalDailies,
            completedDailies,
        };
    }, [tasks]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F8F9FA]">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading your tasks…
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-none m-3 mx-auto overflow-x-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-md">
                            <ClipboardList size={28} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Track your projects, weeks, and daily progress.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Layers}
                        label="Projects"
                        value={stats.projects}
                        color="bg-primary/10 text-primary"
                    />
                    <StatCard
                        icon={Flame}
                        label="In Progress"
                        value={stats.inProgress}
                        color="bg-amber-100 text-amber-700"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Completed"
                        value={stats.completed}
                        color="bg-emerald-100 text-emerald-700"
                    />
                    <StatCard
                        icon={ListChecks}
                        label="Daily Tasks"
                        value={`${stats.completedDailies}/${stats.totalDailies}`}
                        color="bg-violet-100 text-violet-700"
                    />
                </div>

                {/* Empty state */}
                {tasks.length === 0 ? (
                    <div className="bg-card rounded-md border border-border/50 shadow-sm p-16 text-center">
                        <div className="inline-flex p-4 bg-primary/10 rounded-md mb-4">
                            <ClipboardList size={32} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            No tasks assigned yet
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            When your admin assigns a project, it will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Project list (left rail on desktop) */}
                        <div className="lg:col-span-4 xl:col-span-3 space-y-3">
                            <div className="bg-card p-3 rounded-md border border-border/50 shadow-sm space-y-3">
                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search projects…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-border/60 rounded-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="flex bg-secondary/50 p-1 rounded-sm">
                                    {(["all", "active", "completed"] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={cn(
                                                "flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                                                filter === f
                                                    ? "bg-white text-primary shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
                                {filteredTasks.length === 0 ? (
                                    <div className="text-center text-sm text-muted-foreground py-8">
                                        No matching projects.
                                    </div>
                                ) : (
                                    filteredTasks.map(t => (
                                        <ProjectListItem
                                            key={t.id}
                                            task={t}
                                            selected={t.id === selectedId}
                                            onClick={() => setSelectedId(t.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Detail pane */}
                        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                            {selectedTask ? (
                                <>
                                    {/* Project header */}
                                    <div className="bg-card rounded-md border border-border/50 shadow-sm p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row md:items-start gap-6">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h2 className="text-xl font-bold text-foreground">
                                                        {selectedTask.title}
                                                    </h2>
                                                    <PriorityBadge priority={selectedTask.priority} />
                                                    <StatusBadge status={selectedTask.status} />
                                                </div>
                                                {selectedTask.description && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        {selectedTask.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 mt-4 text-xs font-medium">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <CalendarRange size={13} />
                                                        <span>
                                                            {fmtDate(selectedTask.startDate)} →{" "}
                                                            {fmtDate(selectedTask.endDate)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Layers size={13} />
                                                        <span>
                                                            {selectedTask.weeks.length} week
                                                            {selectedTask.weeks.length !== 1 ? "s" : ""}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <TrendingUp size={13} />
                                                        <span>Assigned by {selectedTask.assignedBy}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <CircularProgress
                                                value={selectedTask.overallProgress}
                                                size={80}
                                                strokeWidth={7}
                                            />
                                        </div>

                                        {/* Week tab strip / calendar */}
                                        {selectedTask.weeks.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-border/40">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                                    Weekly progress
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                                    {selectedTask.weeks.map(w => {
                                                        const active = w.id === activeWeekId;
                                                        const done = w.progress === 100;
                                                        return (
                                                            <button
                                                                key={w.id}
                                                                onClick={() => setActiveWeekId(w.id)}
                                                                className={cn(
                                                                    "p-3 rounded-md border text-left transition-all",
                                                                    active
                                                                        ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                                                                        : done
                                                                          ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                                                                          : "border-border/40 bg-card hover:border-primary/30 hover:shadow-sm"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span
                                                                        className={cn(
                                                                            "text-[10px] font-bold uppercase tracking-wider",
                                                                            active
                                                                                ? "text-primary"
                                                                                : "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        Week {w.weekNumber}
                                                                    </span>
                                                                    {done && (
                                                                        <CheckCircle2
                                                                            size={14}
                                                                            className="text-emerald-500"
                                                                        />
                                                                    )}
                                                                </div>
                                                                <div className="text-sm font-bold text-foreground">
                                                                    {w.progress}%
                                                                </div>
                                                                <ProgressBar
                                                                    value={w.progress}
                                                                    size="sm"
                                                                    showLabel={false}
                                                                    className="mt-2"
                                                                />
                                                                <div className="text-[10px] text-muted-foreground mt-2 font-medium">
                                                                    {fmtDate(w.startDate)} →{" "}
                                                                    {fmtDate(w.endDate)}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Active week's daily tasks */}
                                    {activeWeek ? (
                                        <div className="bg-card rounded-md border border-border/50 shadow-sm p-6 md:p-8">
                                            <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-4 border-b border-border/40">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-sm">
                                                        <Clock size={18} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-foreground">
                                                            Week {activeWeek.weekNumber} — Daily Tasks
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground font-medium">
                                                            {fmtDate(activeWeek.startDate)} →{" "}
                                                            {fmtDate(activeWeek.endDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={activeWeek.status} />
                                            </div>

                                            {activeWeek.dailyTasks.length === 0 ? (
                                                <div className="text-center text-sm text-muted-foreground py-8">
                                                    No daily tasks in this week.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {activeWeek.dailyTasks.map(d => (
                                                        <InteractiveDailyTaskRow
                                                            key={d.id}
                                                            daily={d}
                                                            onUpdate={updateDaily}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-card rounded-md border border-border/50 shadow-sm p-8 text-center text-sm text-muted-foreground">
                                            Select a week to view daily tasks.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="bg-card rounded-md border border-border/50 shadow-sm p-16 text-center text-sm text-muted-foreground">
                                    Select a project from the left to view its tasks.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ----------------------------- Sub-components ----------------------------- */

function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: any;
    label: string;
    value: number | string;
    color: string;
}) {
    return (
        <div className="bg-card rounded-md border border-border/50 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className={cn("p-2.5 rounded-sm", color)}>
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                </p>
                <p className="text-xl font-bold text-foreground truncate">{value}</p>
            </div>
        </div>
    );
}

function ProjectListItem({
    task,
    selected,
    onClick,
}: {
    task: TaskItem;
    selected: boolean;
    onClick: () => void;
}) {
    const total = task.weeks.reduce((s, w) => s + w.dailyTasks.length, 0);
    const done = task.weeks.reduce(
        (s, w) => s + w.dailyTasks.filter(d => d.status === "Completed").length,
        0
    );
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left p-4 rounded-md border transition-all",
                selected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/10"
                    : "border-border/50 bg-card hover:border-primary/30 hover:shadow-sm"
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-bold text-sm text-foreground truncate flex-1">
                    {task.title}
                </h4>
                <ChevronDown
                    size={16}
                    className={cn(
                        "text-muted-foreground shrink-0 transition-transform -rotate-90",
                        selected && "text-primary"
                    )}
                />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <PriorityBadge priority={task.priority} showIcon={false} />
                <StatusBadge status={task.status} showIcon={false} />
            </div>
            <ProgressBar value={task.overallProgress} size="sm" showLabel={false} />
            <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                <span>{task.overallProgress}%</span>
                <span>
                    {done}/{total} tasks
                </span>
            </div>
        </button>
    );
}

export default MyTasks;
