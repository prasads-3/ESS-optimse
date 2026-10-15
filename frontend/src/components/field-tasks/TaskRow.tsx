import { cn } from "@/lib/utils";
import { Building2, Clock, LogIn, LogOut, User2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { type FieldTask, fmtDate, fmtDuration, fmtTime } from "./types";

const coordText = (lat?: number | null, lng?: number | null) =>
    lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "—";

/**
 * Single clickable table row. Highlights with a blue left-border + tint when
 * selected; lifts subtly on hover.
 */
export function TaskRow({
    task,
    assigneeName,
    selected,
    onSelect,
}: {
    task: FieldTask;
    assigneeName?: string;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <tr
            onClick={onSelect}
            className={cn(
                "group cursor-pointer border-b border-slate-100 transition-colors",
                selected ? "bg-brand/5" : "hover:bg-slate-50",
            )}
        >
            <td className="relative px-4 py-3.5 pl-5">
                <span
                    className={cn(
                        "absolute left-0 top-0 h-full w-1 rounded-r bg-brand transition-opacity",
                        selected ? "opacity-100" : "opacity-0",
                    )}
                />
                <div className="font-semibold text-slate-800">{task.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>{fmtDate(task.date)}</span>
                    {assigneeName && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-1">
                                <User2 size={11} /> {assigneeName}
                            </span>
                        </>
                    )}
                </div>
            </td>

            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                    <Building2 size={13} className="text-slate-400" />
                    {task.clientName || "—"}
                </div>
                <div className="mt-0.5 max-w-[200px] truncate text-[11px] text-slate-400">
                    {task.address || coordText(task.latitude, task.longitude)}
                </div>
            </td>

            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                    <LogIn size={13} className="text-brand" />
                    {fmtTime(task.checkInTime)}
                </div>
            </td>

            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                    <LogOut size={13} className="text-amber-500" />
                    {fmtTime(task.checkOutTime)}
                </div>
            </td>

            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                    <Clock size={13} className="text-slate-400" />
                    {fmtDuration(task.totalDuration)}
                </div>
            </td>

            <td className="px-4 py-3.5">
                <StatusBadge status={task.status} autoCheckout={task.autoCheckout} />
            </td>
        </tr>
    );
}

export default TaskRow;
