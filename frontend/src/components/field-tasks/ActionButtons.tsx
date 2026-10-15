import { cn } from "@/lib/utils";
import { LogIn, Mail, CalendarOff, Repeat, X, Loader2 } from "lucide-react";

type ButtonState = { loading?: boolean; disabled?: boolean };

/**
 * Bottom action bar for the task detail panel.
 * Primary action (Check In) is emphasised; the rest are secondary.
 * Handlers are optional — omit one to hide that button.
 */
export function ActionButtons({
    onCheckIn,
    onEmailAdmin,
    onRequestLeave,
    onRequestReassign,
    onClose,
    checkInState,
    className,
}: {
    onCheckIn?: () => void;
    onEmailAdmin?: () => void;
    onRequestLeave?: () => void;
    onRequestReassign?: () => void;
    onClose: () => void;
    checkInState?: ButtonState;
    className?: string;
}) {
    const hasOthers = Boolean(onCheckIn || onEmailAdmin || onRequestLeave || onRequestReassign);
    return (
        <div className={cn("grid grid-cols-2 gap-2.5", className)}>
            {onCheckIn && (
                <button
                    onClick={onCheckIn}
                    disabled={checkInState?.disabled || checkInState?.loading}
                    className="col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                    {checkInState?.loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <LogIn size={16} />
                    )}
                    Check In
                </button>
            )}

            {onEmailAdmin && (
                <SecondaryButton onClick={onEmailAdmin} icon={<Mail size={15} />} label="Email Admin" />
            )}
            {onRequestLeave && (
                <SecondaryButton onClick={onRequestLeave} icon={<CalendarOff size={15} />} label="Request Leave" />
            )}
            {onRequestReassign && (
                <SecondaryButton onClick={onRequestReassign} icon={<Repeat size={15} />} label="Request Reassign" />
            )}

            <SecondaryButton
                onClick={onClose}
                icon={<X size={15} />}
                label="Close"
                className={cn(
                    "border-transparent bg-slate-100 hover:bg-slate-200 text-slate-600",
                    !hasOthers && "col-span-2",
                )}
            />
        </div>
    );
}

function SecondaryButton({
    onClick,
    icon,
    label,
    className,
}: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all",
                className,
            )}
        >
            {icon}
            {label}
        </button>
    );
}

export default ActionButtons;
