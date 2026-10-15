import { cn } from "@/lib/utils";

/**
 * Status pill used in the task table and the detail panel.
 * Supports the field-task lifecycle plus a generic "Pending" state.
 */
const STATUS_STYLES: Record<string, string> = {
    Assigned: "bg-slate-100 text-slate-700 ring-slate-200",
    "In Progress": "bg-blue-50 text-blue-700 ring-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "Not Visited": "bg-rose-50 text-rose-700 ring-rose-200",
    Pending: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function StatusBadge({
    status,
    autoCheckout,
    className,
}: {
    status: string;
    autoCheckout?: boolean;
    className?: string;
}) {
    const cls = STATUS_STYLES[status] || STATUS_STYLES.Pending;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                cls,
                className,
            )}
        >
            {status === "In Progress" && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            )}
            {status}
            {autoCheckout && status === "Completed" && (
                <span className="ml-0.5 text-amber-600">(auto)</span>
            )}
        </span>
    );
}

export default StatusBadge;
