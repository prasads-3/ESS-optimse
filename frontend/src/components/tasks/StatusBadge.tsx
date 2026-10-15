import { memo } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { Status } from "./types";

const STYLES: Record<string, string> = {
    Completed: "bg-emerald-100 text-emerald-700",
    "In Progress": "bg-primary/10 text-primary",
    Pending: "bg-secondary text-muted-foreground",
};

const ICONS: Record<string, typeof CheckCircle2> = {
    Completed: CheckCircle2,
    "In Progress": Loader2,
    Pending: Clock,
};

export const StatusBadge = memo(function StatusBadge({
    status,
    showIcon = true,
    className,
}: {
    status: Status;
    showIcon?: boolean;
    className?: string;
}) {
    const Icon = ICONS[status] || Clock;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm",
                STYLES[status] || "bg-secondary text-muted-foreground",
                className
            )}
        >
            {showIcon && <Icon size={10} className="shrink-0" />}
            {status}
        </span>
    );
});
