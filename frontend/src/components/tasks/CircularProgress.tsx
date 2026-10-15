import { memo } from "react";
import { cn } from "@/lib/utils";

export const CircularProgress = memo(function CircularProgress({
    value,
    size = 56,
    strokeWidth = 5,
    className,
}: {
    value: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}) {
    const clamped = Math.max(0, Math.min(100, value));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    const color =
        clamped >= 100
            ? "stroke-emerald-500"
            : clamped >= 50
              ? "stroke-primary"
              : clamped > 0
                ? "stroke-amber-500"
                : "stroke-muted-foreground/30";

    return (
        <div
            className={cn("relative inline-flex items-center justify-center", className)}
            style={{ width: size, height: size }}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className="stroke-secondary"
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={cn("transition-all duration-700 fill-none", color)}
                    fill="none"
                />
            </svg>
            <span className="absolute text-xs font-bold text-foreground">
                {clamped}%
            </span>
        </div>
    );
});
