import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { DailyTaskRow } from "./DailyTaskRow";
import type { WeekItem } from "./types";

const fmtDate = (s: string) => new Date(s).toLocaleDateString();

export const WeekAccordion = memo(function WeekAccordion({
    week,
    defaultOpen = false,
}: {
    week: WeekItem;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const completed = week.dailyTasks.filter(d => d.status === "Completed").length;
    const total = week.dailyTasks.length;

    // Lazy-mount the daily-task rows on first open.
    const [rowsMounted, setRowsMounted] = useState(defaultOpen);
    useEffect(() => {
        if (open) setRowsMounted(true);
    }, [open]);

    return (
        <div className="bg-card border border-border/40 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors text-left"
            >
                <div className="w-1 h-10 bg-primary shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">
                            Week {week.weekNumber}
                        </h4>
                        <StatusBadge status={week.status} />
                        <span className="text-xs text-muted-foreground font-medium">
                            {fmtDate(week.startDate)} → {fmtDate(week.endDate)}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 max-w-xs">
                            <ProgressBar
                                value={week.progress}
                                size="sm"
                                showLabel={false}
                            />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                            {completed}/{total} done
                        </span>
                    </div>
                </div>
                <ChevronDown
                    size={18}
                    className={cn(
                        "text-muted-foreground transition-transform shrink-0",
                        open && "rotate-180"
                    )}
                />
            </button>

            <div
                className={cn(
                    "grid transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-border/40 p-3 space-y-1 bg-secondary/10">
                        {!rowsMounted ? null : total === 0 ? (
                            <p className="text-sm text-muted-foreground py-3 text-center">
                                No daily tasks yet.
                            </p>
                        ) : (
                            week.dailyTasks.map(d => (
                                <DailyTaskRow key={d.id} daily={d} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
