import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
    ChevronDown,
    CalendarRange,
    Layers,
    ListChecks,
    Trash2,
    Building2,
    MapPin,
    Clock,
    Radius,
} from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";
import { CircularProgress } from "./CircularProgress";
import { Avatar } from "./Avatar";
import { WeekAccordion } from "./WeekAccordion";
import type { TaskItem } from "./types";

const fmtDate = (s: string) => new Date(s).toLocaleDateString();

export const TaskCard = memo(function TaskCard({
    task,
    isOpen,
    onToggle,
    onDelete,
    deleting,
    assigneeName,
}: {
    task: TaskItem;
    isOpen: boolean;
    onToggle: (id: number) => void;
    onDelete?: (id: number) => void;
    deleting?: boolean;
    assigneeName?: string;
}) {
    const totalDailies = task.weeks.reduce((s, w) => s + w.dailyTasks.length, 0);
    const completedDailies = task.weeks.reduce(
        (s, w) => s + w.dailyTasks.filter(d => d.status === "Completed").length,
        0
    );

    // Lazy-mount: only build the weeks/dailies subtree the first time this
    // card is opened. Collapsed cards stay cheap on the initial page render.
    const [contentMounted, setContentMounted] = useState(isOpen);
    useEffect(() => {
        if (isOpen) setContentMounted(true);
    }, [isOpen]);

    return (
        <div
            className={cn(
                "relative bg-card rounded-md border border-border/50 shadow-sm overflow-hidden transition-all duration-300",
                "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
                isOpen && "shadow-md border-primary/20"
            )}
        >
            {onDelete && (
                <button
                    type="button"
                    onClick={() => onDelete(task.id)}
                    disabled={deleting}
                    title="Delete project"
                    className="absolute top-3 right-3 z-10 p-2 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            )}
            <button
                onClick={() => onToggle(task.id)}
                className="w-full text-left p-5 pr-12 hover:bg-secondary/10 transition-colors"
            >
                <div className="flex items-start gap-4">
                    <Avatar
                        name={assigneeName}
                        email={task.assignedTo}
                        size={44}
                    />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-foreground text-base truncate">
                                {task.title}
                            </h3>
                            <PriorityBadge priority={task.priority} />
                            <StatusBadge status={task.status} />
                        </div>

                        {task.description && (
                            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                                {task.description}
                            </p>
                        )}

                        <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-foreground/80">
                                <span className="font-semibold">
                                    {assigneeName || task.assignedTo}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <CalendarRange size={13} />
                                <span>
                                    {fmtDate(task.startDate)} → {fmtDate(task.endDate)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Layers size={13} />
                                <span>
                                    {task.weeks.length} week
                                    {task.weeks.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <ListChecks size={13} />
                                <span>
                                    {completedDailies}/{totalDailies} tasks
                                </span>
                            </div>
                            {task.clientName && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Building2 size={13} />
                                    <span>{task.clientName}</span>
                                </div>
                            )}
                            {task.expectedDuration && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock size={13} />
                                    <span>{task.expectedDuration}</span>
                                </div>
                            )}
                            {task.address && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin size={13} />
                                    <span>{task.address}</span>
                                </div>
                            )}
                            {task.radius != null && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Radius size={13} />
                                    <span>{task.radius} m</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex flex-col items-center gap-2 shrink-0">
                        <CircularProgress value={task.overallProgress} size={56} />
                        <ChevronDown
                            size={16}
                            className={cn(
                                "text-muted-foreground transition-transform",
                                isOpen && "rotate-180"
                            )}
                        />
                    </div>
                    <ChevronDown
                        size={18}
                        className={cn(
                            "md:hidden text-muted-foreground transition-transform shrink-0 mt-2",
                            isOpen && "rotate-180"
                        )}
                    />
                </div>
            </button>

            <div
                className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-border/50 bg-gradient-to-b from-secondary/10 to-transparent p-5 space-y-3">
                        {!contentMounted ? null : task.weeks.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-3 text-center">
                                No weeks defined for this project.
                            </p>
                        ) : (
                            task.weeks.map((w, i) => (
                                <WeekAccordion key={w.id} week={w} defaultOpen={i === 0} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
