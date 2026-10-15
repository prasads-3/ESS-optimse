import { memo } from "react";
import { cn } from "@/lib/utils";

export const ProgressBar = memo(function ProgressBar({
    value,
    label,
    size = "md",
    showLabel = true,
    className,
}: {
    value: number;
    label?: string;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string;
}) {
    const clamped = Math.max(0, Math.min(100, value));
    const heightCls =
        size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

    const color =
        clamped >= 100
            ? "bg-emerald-500"
            : clamped >= 50
              ? "bg-primary"
              : clamped > 0
                ? "bg-amber-500"
                : "bg-muted-foreground/30";

    return (
        <div className={cn("w-full", className)}>
            {showLabel && (
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {label || "Progress"}
                    </span>
                    <span className="text-sm font-bold text-foreground">{clamped}%</span>
                </div>
            )}
            <div
                className={cn(
                    "w-full bg-secondary rounded-none overflow-hidden",
                    heightCls
                )}
            >
                <div
                    className={cn("h-full rounded-none transition-all duration-500", color)}
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    );
});
