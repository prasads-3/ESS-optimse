import { memo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, MessageSquare } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { DailyTaskItem } from "./types";

export const DailyTaskRow = memo(function DailyTaskRow({
    daily,
    className,
}: {
    daily: DailyTaskItem;
    className?: string;
}) {
    const done = daily.status === "Completed";
    return (
        <div
            className={cn(
                "flex items-center gap-3 p-2.5 rounded-sm hover:bg-secondary/40 transition-all group",
                className
            )}
        >
            {done ? (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            ) : (
                <Circle size={18} className="text-muted-foreground/40 shrink-0" />
            )}

            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16 shrink-0">
                {daily.dayName.slice(0, 3)}
            </span>

            <div className="flex-1 min-w-0">
                <p
                    className={cn(
                        "text-sm font-semibold truncate",
                        done ? "text-muted-foreground line-through" : "text-foreground"
                    )}
                >
                    {daily.title}
                </p>
                {daily.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {daily.description}
                    </p>
                )}
            </div>

            {daily.comment && (
                <div
                    className="text-muted-foreground/70 shrink-0"
                    title={daily.comment}
                >
                    <MessageSquare size={14} />
                </div>
            )}

            <StatusBadge status={daily.status} className="shrink-0" />
        </div>
    );
});
