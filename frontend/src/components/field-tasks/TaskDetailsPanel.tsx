import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Clock,
    Radius,
    UserCircle2,
    FileText,
    ImageIcon,
    StickyNote,
    Trash2,
    MoreVertical,
    Repeat,
    Pencil,
    X,
    Building2,
    CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { LocationViewMap } from "@/components/maps/LocationPicker";
import { StatusBadge } from "./StatusBadge";
import { ActionButtons } from "./ActionButtons";
import { type FieldTask, fmtDate } from "./types";

/**
 * Slide-over detail panel. Renders nothing when `task` is null. Fades a blurred
 * overlay in, slides the panel from the right, and closes on ESC, overlay click,
 * or the close/Close buttons. On mobile it behaves as a full-width drawer.
 */
export function TaskDetailsPanel({
    task,
    proof,
    assigneeName,
    onClose,
    onDelete,
    onEdit,
    onReassign,
    onCheckIn,
    onEmailAdmin,
    onRequestLeave,
    onRequestReassign,
}: {
    task: FieldTask | null;
    proof?: string | null;
    assigneeName?: string;
    onClose: () => void;
    onDelete: (task: FieldTask) => void;
    onEdit?: (task: FieldTask) => void;
    onReassign?: (task: FieldTask) => void;
    onCheckIn?: () => void;
    onEmailAdmin?: () => void;
    onRequestLeave?: () => void;
    onRequestReassign?: () => void;
}) {
    const open = task !== null;

    // ESC to close + lock background scroll while open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    const copyCoords = () => {
        if (!task) return;
        navigator.clipboard
            ?.writeText(`${task.latitude}, ${task.longitude}`)
            .then(() => toast.success("Coordinates copied"))
            .catch(() => toast.error("Could not copy"));
    };

    return (
        <AnimatePresence>
            {open && task && (
                <div className="fixed inset-0 z-[60]">
                    {/* Blurred overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                    />

                    {/* Panel */}
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 380, damping: 38 }}
                        className="absolute right-0 top-0 flex h-full w-full max-w-[480px] flex-col bg-slate-50 shadow-2xl"
                    >
                        {/* Top section */}
                        <header className="shrink-0 border-b border-slate-200 bg-white px-6 pt-5 pb-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge status={task.status} autoCheckout={task.autoCheckout} />
                                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                            <CalendarDays size={12} /> {fmtDate(task.date)}
                                        </span>
                                    </div>
                                    <h2 className="mt-2 truncate text-xl font-bold text-slate-800">{task.title}</h2>
                                    {(task.clientName || assigneeName) && (
                                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                            <Building2 size={12} />
                                            {task.clientName || "—"}
                                            {assigneeName && <span className="text-slate-300">· {assigneeName}</span>}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5">
                                    {onEdit && (
                                        <IconButton title="Edit task" onClick={() => onEdit(task)}>
                                            <Pencil size={17} />
                                        </IconButton>
                                    )}
                                    {onReassign && (
                                        <IconButton title="Reassign task" onClick={() => onReassign(task)}>
                                            <Repeat size={17} />
                                        </IconButton>
                                    )}
                                    <IconButton title="Delete task" onClick={() => onDelete(task)} danger>
                                        <Trash2 size={17} />
                                    </IconButton>
                                    <IconButton title="Copy coordinates" onClick={copyCoords}>
                                        <MoreVertical size={17} />
                                    </IconButton>
                                    <IconButton title="Close" onClick={onClose}>
                                        <X size={18} />
                                    </IconButton>
                                </div>
                            </div>
                        </header>

                        {/* Scrollable body */}
                        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                            {/* Map */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                                <LocationViewMap task={task} height={220} />
                            </div>

                            {/* Stat cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard
                                    icon={<Clock size={15} />}
                                    label="Expected Duration"
                                    value={task.expectedDuration || "—"}
                                />
                                <StatCard
                                    icon={<Radius size={15} />}
                                    label="Allowed Radius"
                                    value={`${task.allowedRadius} m`}
                                />
                            </div>

                            {/* Assigned by */}
                            <InfoCard icon={<UserCircle2 size={15} />} label="Assigned By">
                                <p className="text-sm font-medium text-slate-700">{task.assignedBy || "—"}</p>
                            </InfoCard>

                            {/* Description */}
                            <InfoCard icon={<FileText size={15} />} label="Description">
                                <p className="text-sm leading-relaxed text-slate-600">
                                    {task.description || "No description provided."}
                                </p>
                            </InfoCard>

                            {/* Proof upload */}
                            <InfoCard icon={<ImageIcon size={15} />} label="Proof Upload">
                                {proof === undefined ? (
                                    <p className="text-xs text-slate-400">Loading proof…</p>
                                ) : proof ? (
                                    <img
                                        src={proof}
                                        alt="Task proof"
                                        className="max-h-56 w-full rounded-xl border border-slate-200 object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-7 text-center">
                                        <ImageIcon size={22} className="text-slate-300" />
                                        <p className="mt-1.5 text-xs text-slate-400">No proof photo uploaded yet.</p>
                                    </div>
                                )}
                            </InfoCard>

                            {/* Employee comment / notes */}
                            <InfoCard icon={<StickyNote size={15} />} label="Comment">
                                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                                    {task.notes || "No comment added by the employee."}
                                </p>
                            </InfoCard>
                        </div>

                        {/* Bottom action bar */}
                        <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
                            <ActionButtons
                                onClose={onClose}
                                onCheckIn={onCheckIn}
                                onEmailAdmin={onEmailAdmin}
                                onRequestLeave={onRequestLeave}
                                onRequestReassign={onRequestReassign}
                            />
                        </footer>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>
    );
}

function IconButton({
    children,
    title,
    onClick,
    danger,
}: {
    children: React.ReactNode;
    title: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            title={title}
            onClick={onClick}
            className={
                "rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 " +
                (danger ? "hover:bg-red-50 hover:text-red-600" : "hover:text-slate-700")
            }
        >
            {children}
        </button>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="text-brand">{icon}</span>
                {label}
            </div>
            <p className="mt-1.5 text-base font-bold text-slate-800">{value}</p>
        </div>
    );
}

function InfoCard({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="text-brand">{icon}</span>
                {label}
            </div>
            {children}
        </div>
    );
}

export default TaskDetailsPanel;
