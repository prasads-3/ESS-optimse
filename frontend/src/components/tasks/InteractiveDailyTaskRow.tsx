import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, MessageSquare, Loader2, X, Send } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { DailyTaskItem, Status } from "./types";

export const InteractiveDailyTaskRow = memo(function InteractiveDailyTaskRow({
    daily,
    onUpdate,
}: {
    daily: DailyTaskItem;
    onUpdate: (id: number, patch: { status?: Status; comment?: string }) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [commentOpen, setCommentOpen] = useState(false);
    const [draft, setDraft] = useState(daily.comment || "");
    const done = daily.status === "Completed";

    const toggleStatus = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const next: Status =
                daily.status === "Completed"
                    ? "Pending"
                    : daily.status === "Pending"
                      ? "In Progress"
                      : "Completed";
            await onUpdate(daily.id, { status: next });
        } finally {
            setBusy(false);
        }
    };

    const cycleStatus = async (s: Status) => {
        if (busy) return;
        setBusy(true);
        try {
            await onUpdate(daily.id, { status: s });
        } finally {
            setBusy(false);
        }
    };

    const submitComment = async () => {
        if (busy) return;
        const trimmed = draft.trim();
        if (!trimmed) return;
        setBusy(true);
        try {
            await onUpdate(daily.id, { comment: trimmed });
            setCommentOpen(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className={cn(
                "rounded-sm border border-border/40 bg-card hover:shadow-md hover:border-primary/30 transition-all",
                done && "bg-emerald-50/40"
            )}
        >
            <div className="flex items-center gap-3 p-3">
                <button
                    type="button"
                    onClick={toggleStatus}
                    disabled={busy}
                    className="shrink-0 disabled:opacity-50"
                    title="Toggle status"
                >
                    {busy ? (
                        <Loader2 size={20} className="text-primary animate-spin" />
                    ) : done ? (
                        <CheckCircle2
                            size={20}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        />
                    ) : (
                        <Circle
                            size={20}
                            className="text-muted-foreground/50 hover:text-primary transition-colors"
                        />
                    )}
                </button>

                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-14 shrink-0">
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

                <select
                    value={daily.status}
                    onChange={e => cycleStatus(e.target.value as Status)}
                    disabled={busy}
                    className="hidden sm:block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-border/60 bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    onClick={e => e.stopPropagation()}
                >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                </select>

                <StatusBadge status={daily.status} className="sm:hidden" />

                <button
                    type="button"
                    onClick={() => setCommentOpen(o => !o)}
                    className={cn(
                        "shrink-0 p-1.5 rounded-sm transition-colors",
                        daily.comment
                            ? "text-primary bg-primary/10 hover:bg-primary/20"
                            : "text-muted-foreground hover:bg-secondary/60"
                    )}
                    title={daily.comment ? "View / edit comment" : "Add comment"}
                >
                    <MessageSquare size={15} />
                </button>
            </div>

            {commentOpen && (
                <div className="border-t border-border/40 p-3 bg-secondary/10 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {daily.comment && !draft && (
                        <p className="text-xs text-muted-foreground italic px-1">
                            Previous: "{daily.comment}"
                        </p>
                    )}
                    <div className="flex items-end gap-2">
                        <textarea
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            placeholder="Add a comment or progress note…"
                            rows={2}
                            className="flex-1 px-3 py-2 text-sm bg-card border border-border/60 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                        <button
                            type="button"
                            onClick={() => setCommentOpen(false)}
                            className="p-2 hover:bg-secondary/60 rounded-sm text-muted-foreground"
                            title="Cancel"
                        >
                            <X size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={submitComment}
                            disabled={busy || !draft.trim()}
                            className="p-2 bg-primary hover:bg-primary/95 text-white rounded-sm disabled:opacity-50"
                            title="Save"
                        >
                            {busy ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});
