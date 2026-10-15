import { API_BASE_URL } from "@/config";
import { useState, useEffect, useMemo, memo } from "react";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    UserMinus,
    CalendarDays,
    Loader2,
    Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NoAccessBlock from "@/components/NoAccessBlock";

const STATUS_META: Record<string, { label: string; cell: string; chip: string; dot: string; Icon: any; iconClass: string }> = {
    P: { label: "Present", cell: "bg-success/10", chip: "text-success", dot: "bg-success", Icon: CheckCircle2, iconClass: "text-emerald-600" },
    A: { label: "Absent", cell: "bg-destructive/10", chip: "text-destructive", dot: "bg-destructive", Icon: XCircle, iconClass: "text-destructive" },
    L: { label: "On Leave", cell: "bg-warning/10", chip: "text-warning", dot: "bg-warning", Icon: UserMinus, iconClass: "text-warning" },
    H: { label: "Holiday", cell: "bg-primary/10", chip: "text-primary", dot: "bg-primary", Icon: CalendarDays, iconClass: "text-primary" },
    W: { label: "Weekend", cell: "bg-secondary/50", chip: "text-muted-foreground", dot: "bg-slate-300", Icon: () => null, iconClass: "" },
};

const DayCell = memo(({ status }: { status: string }) => {
    const meta = STATUS_META[status];
    if (!meta) return <div className="w-full h-full" />;
    const { Icon, iconClass, cell, label } = meta;
    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("flex items-center justify-center w-full h-full", cell)}>
                        {status !== "W" && Icon ? <Icon className={cn("w-3.5 h-3.5", iconClass)} /> : (
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
DayCell.displayName = "DayCell";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const MyAttendance = () => {
    const { user, hasFeature } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [holidays, setHolidays] = useState<any[]>([]);
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const fetchMyAttendance = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const [attRes, holRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/attendance?month=${month}&year=${year}&userId=${user.id}`, { credentials: "include" }),
                fetch(`${API_BASE_URL}/api/holidays`, { credentials: "include" })
            ]);

            if (attRes.ok) {
                setAttendanceData(await attRes.json());
            } else {
                toast.error("Failed to load attendance");
            }

            if (holRes.ok) {
                setHolidays(await holRes.json());
            }
        } catch (e) {
            console.error(e);
            toast.error("Network error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMyAttendance();
    }, [month, year, user]);

    const myRecord = attendanceData?.attendance?.[0];
    const daysInMonth: number = attendanceData?.daysInMonth || new Date(year, month, 0).getDate();

    const dayHeaders = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(year, month - 1, i + 1);
            return {
                num: (i + 1).toString().padStart(2, "0"),
                weekday: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
                // Only Sunday is a weekend; Saturday is a working day.
                isWeekend: d.getDay() === 0,
                isToday:
                    d.toDateString() === new Date().toDateString(),
            };
        });
    }, [daysInMonth, year, month]);

    const augmentedDays = useMemo(() => {
        const days = { ...(myRecord?.days || {}) };

        dayHeaders.forEach(d => {
            if (d.isWeekend && !days[d.num]) {
                days[d.num] = "W";
            }
        });

        holidays.forEach(holiday => {
            if (!holiday.date) return;
            const [y, m, d] = holiday.date.split('T')[0].split('-');
            if (parseInt(y) === year && parseInt(m) === month) {
                const dNum = d.padStart(2, "0");
                if (!days[dNum] || days[dNum] === "W" || days[dNum] === "A") {
                    days[dNum] = "H";
                }
            }
        });

        return days;
    }, [myRecord, holidays, month, year, dayHeaders]);

    const stats = useMemo(() => {
        const counts = { P: 0, A: 0, L: 0, H: 0, W: 0 };
        for (let i = 1; i <= daysInMonth; i++) {
            const k = i.toString().padStart(2, "0");
            const s = augmentedDays[k];
            if (s && s in counts) (counts as any)[s]++;
        }
        // Prefer the backend's dynamic working-day figure (total days - Sundays -
        // holidays) so the UI matches the enforced policy exactly; fall back to a
        // local computation if the API hasn't returned it yet.
        const working = attendanceData?.workingDays?.workingDays ?? (daysInMonth - counts.W - counts.H);
        const attendancePct = working > 0 ? Math.round((counts.P / working) * 100) : 0;
        return { ...counts, working, attendancePct };
    }, [augmentedDays, daysInMonth, attendanceData]);

    const goPrev = () => {
        if (month === 1) {
            setMonth(12);
            setYear((y) => y - 1);
        } else setMonth((m) => m - 1);
    };
    const goNext = () => {
        if (month === 12) {
            setMonth(1);
            setYear((y) => y + 1);
        } else setMonth((m) => m + 1);
    };

    if (!hasFeature("attendance")) {
        return <NoAccessBlock feature="Attendance" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">My Attendance</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Track your daily presence and monthly attendance summary.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Month picker */}
                        <div className="flex items-center bg-card border border-border rounded-md">
                            <button
                                onClick={goPrev}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-l-md transition"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <div className="px-3 py-1.5 text-sm font-medium text-foreground min-w-[140px] text-center tabular-nums">
                                {MONTHS[month - 1]} {year}
                            </div>
                            <button
                                onClick={goNext}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-r-md transition"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                    </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Working Days</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.working}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <Briefcase size={12} className="text-primary" />
                            <span className="text-[11px] text-muted-foreground">Mon–Sat, excl. Sundays</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Attendance</p>
                        <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">{stats.attendancePct}%</p>
                        <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-success rounded-full transition-all"
                                style={{ width: `${stats.attendancePct}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">{stats.P} of {stats.working} working days</p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Present</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.P}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="text-[11px] text-muted-foreground">days present</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Absent</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.A}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <XCircle size={12} className="text-destructive" />
                            <span className="text-[11px] text-muted-foreground">days absent</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">On Leave</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.L}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <UserMinus size={12} className="text-warning" />
                            <span className="text-[11px] text-muted-foreground">approved leaves</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Holidays</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{stats.H}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-primary" />
                            <span className="text-[11px] text-muted-foreground">company holidays</span>
                        </div>
                    </div>
                </div>

                {/* Matrix */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-muted-foreground" />
                            <h2 className="text-sm font-semibold text-foreground">Daily Log</h2>
                            <span className="text-[11px] text-muted-foreground">{MONTHS[month - 1]} {year}</span>
                        </div>
                        {user?.name && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Briefcase size={11} />
                                <span className="font-medium text-foreground">{user.name}</span>
                                {(user as any).employeeId && <span className="text-muted-foreground/70">· {(user as any).employeeId}</span>}
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={20} className="text-muted-foreground/70 animate-spin mb-3" />
                            <p className="text-xs text-muted-foreground">Loading attendance…</p>
                        </div>
                    ) : Object.keys(augmentedDays).length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                                <Calendar size={18} className="text-muted-foreground/70" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No attendance data</p>
                            <p className="text-xs text-muted-foreground mt-1">No records were found for {MONTHS[month - 1]} {year}.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="border-separate border-spacing-0 w-full">
                                <thead>
                                    <tr>
                                        <th className="sticky left-0 z-10 bg-secondary/50/80 border-b border-r border-border px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground min-w-[180px]">
                                            Day
                                        </th>
                                        {dayHeaders.map((d) => (
                                            <th
                                                key={d.num}
                                                className={cn(
                                                    "border-b border-r border-border px-0 py-1 text-center text-[10px] font-medium tabular-nums w-9 min-w-[36px]",
                                                    d.isWeekend ? "bg-secondary/50 text-muted-foreground/70" : "bg-secondary/50/60 text-muted-foreground",
                                                    d.isToday && "bg-emerald-50 text-success"
                                                )}
                                            >
                                                <div>{d.num}</div>
                                                <div className="text-[9px] font-normal text-muted-foreground/70">{d.weekday}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-4 py-2.5 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-foreground font-medium">Status</span>
                                                <span className="text-[11px] text-muted-foreground">P · A · L · H · W</span>
                                            </div>
                                        </td>
                                        {dayHeaders.map((d) => {
                                            const status = augmentedDays[d.num];
                                            return (
                                                <td
                                                    key={d.num}
                                                    className={cn(
                                                        "border-b border-r border-border p-0 h-10 text-center w-9 min-w-[36px]",
                                                        d.isToday && "ring-1 ring-primary/40 ring-inset"
                                                    )}
                                                >
                                                    <DayCell status={status} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="px-5 py-3 border-t border-border bg-background flex flex-wrap gap-x-5 gap-y-2 items-center">
                        <span className="text-[11px] font-medium text-muted-foreground mr-1">Legend</span>
                        {Object.entries(STATUS_META).map(([key, meta]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full", meta.dot)} />
                                <span className="text-[11px] text-muted-foreground">
                                    {meta.label} <span className="text-muted-foreground/70">({key})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyAttendance;
