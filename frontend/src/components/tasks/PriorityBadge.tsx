import { memo } from "react";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";
import type { Priority } from "./types";

const STYLES: Record<string, string> = {
    High: "bg-destructive/10 text-destructive border-destructive/20",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const PriorityBadge = memo(function PriorityBadge({
    priority,
    showIcon = true,
    className,
}: {
    priority: Priority;
    showIcon?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm border",
                STYLES[priority] || "bg-secondary text-muted-foreground border-border/40",
                className
            )}
        >
            {showIcon && <Flag size={10} className="shrink-0" />}
            {priority}
        </span>
    );
});
