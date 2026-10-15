import { memo } from "react";
import { cn } from "@/lib/utils";

const PALETTE = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-fuchsia-500",
    "bg-indigo-500",
];

const hashColor = (input: string) => {
    let h = 0;
    for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
};

const initials = (input: string) => {
    if (!input) return "?";
    const base = input.split("@")[0].replace(/[._-]+/g, " ").trim();
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return base.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Avatar = memo(function Avatar({
    name,
    email,
    size = 32,
    className,
    title,
}: {
    name?: string;
    email?: string;
    size?: number;
    className?: string;
    title?: string;
}) {
    const display = name || email || "?";
    const color = hashColor(display);
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center rounded-sm text-white font-bold shrink-0 select-none ring-2 ring-card",
                color,
                className
            )}
            style={{
                width: size,
                height: size,
                fontSize: Math.max(10, Math.floor(size * 0.4)),
            }}
            title={title || (name ? `${name}${email ? ` (${email})` : ""}` : email)}
        >
            {initials(display)}
        </span>
    );
});
