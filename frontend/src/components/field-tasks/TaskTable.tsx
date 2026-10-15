import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskRow } from "./TaskRow";
import { type FieldTask, fmtDate } from "./types";

const COLUMNS = ["Task", "Client / Location", "Check In", "Check Out", "Duration", "Status"];

/**
 * Paginated task table. Clicking a row calls onSelect; the selected row stays
 * highlighted while the detail panel is open.
 */
export function TaskTable({
    tasks,
    selectedId,
    onSelect,
    nameFor,
    pageSize = 8,
    groupByDate = false,
}: {
    tasks: FieldTask[];
    selectedId: number | null;
    onSelect: (task: FieldTask) => void;
    nameFor?: (email: string) => string | undefined;
    pageSize?: number;
    // When true, render tasks grouped under collapsible date headers (no paging).
    groupByDate?: boolean;
}) {
    const [page, setPage] = useState(1);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));

    // Clamp page when the underlying list shrinks (e.g. after a search/filter).
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageTasks = useMemo(
        () => tasks.slice((page - 1) * pageSize, page * pageSize),
        [tasks, page, pageSize],
    );

    // Tasks grouped by calendar day, preserving the incoming order within each
    // day and listing the most recent day first.
    const groups = useMemo(() => {
        const map = new Map<string, FieldTask[]>();
        for (const t of tasks) {
            const key = new Date(t.date).toDateString();
            (map.get(key) ?? map.set(key, []).get(key)!).push(t);
        }
        return Array.from(map.entries()).sort(
            (a, b) => +new Date(b[1][0].date) - +new Date(a[1][0].date),
        );
    }, [tasks]);

    const from = tasks.length === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, tasks.length);

    if (tasks.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                <div className="mb-4 inline-flex rounded-2xl bg-brand/10 p-4">
                    <MapPin size={30} className="text-brand" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">No tasks to show</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Assign a field task or adjust your search to see results here.
                </p>
            </div>
        );
    }

    // Date-grouped, collapsible view (no pagination) — used on the employee side.
    if (groupByDate) {
        const toggle = (key: string) =>
            setCollapsed(prev => {
                const next = new Set(prev);
                next.has(key) ? next.delete(key) : next.add(key);
                return next;
            });
        return (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {COLUMNS.map(c => (
                                    <th key={c} className="px-4 py-3 text-left first:pl-5">
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        {groups.map(([key, dayTasks]) => {
                            const isCollapsed = collapsed.has(key);
                            return (
                                <tbody key={key}>
                                    <tr
                                        className="cursor-pointer border-b border-slate-200 bg-slate-50/40 hover:bg-slate-100/60"
                                        onClick={() => toggle(key)}
                                    >
                                        <td colSpan={COLUMNS.length} className="px-5 py-2.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                <ChevronDown
                                                    size={15}
                                                    className={cn(
                                                        "text-slate-400 transition-transform",
                                                        isCollapsed && "-rotate-90",
                                                    )}
                                                />
                                                <CalendarDays size={14} className="text-brand" />
                                                {fmtDate(dayTasks[0].date)}
                                                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                                                    {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    {!isCollapsed &&
                                        dayTasks.map(t => (
                                            <TaskRow
                                                key={t.id}
                                                task={t}
                                                assigneeName={nameFor?.(t.assignedTo)}
                                                selected={selectedId === t.id}
                                                onSelect={() => onSelect(t)}
                                            />
                                        ))}
                                </tbody>
                            );
                        })}
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {COLUMNS.map(c => (
                                <th key={c} className="px-4 py-3 text-left first:pl-5">
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageTasks.map(t => (
                            <TaskRow
                                key={t.id}
                                task={t}
                                assigneeName={nameFor?.(t.assignedTo)}
                                selected={selectedId === t.id}
                                onSelect={() => onSelect(t)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3">
                <p className="text-xs font-medium text-slate-500">
                    Showing <span className="font-bold text-slate-700">{from}–{to}</span> of{" "}
                    <span className="font-bold text-slate-700">{tasks.length}</span>
                </p>
                <div className="flex items-center gap-1">
                    <PagerButton disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft size={16} />
                    </PagerButton>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                        <button
                            key={n}
                            onClick={() => setPage(n)}
                            className={cn(
                                "h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors",
                                n === page
                                    ? "bg-brand text-white shadow-sm shadow-brand/20"
                                    : "text-slate-600 hover:bg-slate-100",
                            )}
                        >
                            {n}
                        </button>
                    ))}
                    <PagerButton disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        <ChevronRight size={16} />
                    </PagerButton>
                </div>
            </div>
        </div>
    );
}

function PagerButton({
    children,
    disabled,
    onClick,
}: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
        >
            {children}
        </button>
    );
}

export default TaskTable;
