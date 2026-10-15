import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import {
    MapPin,
    Navigation,
    Loader2,
    LogIn,
    LogOut,
    Clock,
    Building2,
    Calendar,
    CalendarDays,
    Camera,
    StickyNote,
    Check,
    CheckCircle2,
    AlertTriangle,
    Ban,
    X,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { LocationViewMap } from "@/components/maps/LocationPicker";
import { useFieldTaskSocket } from "@/hooks/useFieldTaskSocket";
import { getCurrentPosition, haversineMeters } from "@/lib/geo";
import { type FieldTask, fmtDuration, fmtElapsed, fmtTime, fmtDate } from "@/components/field-tasks/types";
import { StatusBadge } from "@/components/field-tasks/StatusBadge";
import { TaskTable } from "@/components/field-tasks/TaskTable";

const OUTSIDE_GRACE_MS = 5 * 60 * 1000; // 5 minutes outside → prompt
const POPUP_TIMEOUT_MS = 60 * 1000; // 60s to respond before auto checkout
const POLL_MS = 60 * 1000; // track location every 1 minute

const extractError = async (res: Response, fallback: string): Promise<string> => {
    try {
        const text = await res.text();
        if (!text) return `${fallback} (HTTP ${res.status})`;
        try {
            const j = JSON.parse(text);
            return j.error || j.message || `${fallback} (HTTP ${res.status})`;
        } catch {
            return text.slice(0, 200);
        }
    } catch {
        return `${fallback} (HTTP ${res.status})`;
    }
};

/* --------------------- Auto-checkout monitor --------------------- */

function AutoCheckoutMonitor({
    task,
    onCheckout,
}: {
    task: FieldTask;
    onCheckout: (auto: boolean) => Promise<void>;
}) {
    const [promptOpen, setPromptOpen] = useState(false);
    const [countdown, setCountdown] = useState(POPUP_TIMEOUT_MS / 1000);
    const outsideSinceRef = useRef<number | null>(null);
    const popupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onCheckoutRef = useRef(onCheckout);
    useEffect(() => { onCheckoutRef.current = onCheckout; }, [onCheckout]);

    const clearPopupTimer = () => {
        if (popupTimerRef.current) clearInterval(popupTimerRef.current);
        popupTimerRef.current = null;
    };

    // Start a countdown when the prompt opens; auto-checkout if it runs out.
    const openPrompt = useCallback(() => {
        setPromptOpen(true);
        setCountdown(POPUP_TIMEOUT_MS / 1000);
        clearPopupTimer();
        popupTimerRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearPopupTimer();
                    setPromptOpen(false);
                    void onCheckoutRef.current(true); // ignored → auto checkout
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    }, []);

    // Poll location every minute and evaluate the outside-radius timer.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const pos = await getCurrentPosition();
                if (cancelled) return;
                const dist = haversineMeters(pos.latitude, pos.longitude, task.latitude, task.longitude);
                if (dist <= task.allowedRadius) {
                    // Back inside → reset everything.
                    outsideSinceRef.current = null;
                    if (promptOpen) {
                        clearPopupTimer();
                        setPromptOpen(false);
                        toast.success("You're back inside the task area — check-out cancelled.");
                    }
                } else {
                    if (outsideSinceRef.current == null) outsideSinceRef.current = Date.now();
                    const elapsed = Date.now() - outsideSinceRef.current;
                    if (elapsed >= OUTSIDE_GRACE_MS && !promptOpen) openPrompt();
                }
            } catch {
                // Geolocation unavailable this tick — skip silently.
            }
        };
        void tick();
        const id = setInterval(tick, POLL_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
            clearPopupTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task.id, task.latitude, task.longitude, task.allowedRadius]);

    const handleStay = () => {
        clearPopupTimer();
        setPromptOpen(false);
        outsideSinceRef.current = Date.now(); // reset grace window
    };

    const handleCheckoutNow = async () => {
        clearPopupTimer();
        setPromptOpen(false);
        await onCheckoutRef.current(false);
    };

    return (
        <Dialog open={promptOpen} onOpenChange={() => { /* must choose */ }}>
            <DialogContent className="max-w-md" onPointerDownOutside={e => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle size={20} /> You left the assigned location
                    </DialogTitle>
                    <DialogDescription className="pt-1">
                        You've been outside the allowed area for over 5 minutes. Do you want to check out?
                        You'll be checked out automatically in <strong>{countdown}s</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleStay}
                        className="flex-1 py-2.5 rounded-md border border-border/60 text-sm font-semibold hover:bg-secondary/30 transition-colors"
                    >
                        I'm still working
                    </button>
                    <button
                        onClick={handleCheckoutNow}
                        className="flex-1 py-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
                    >
                        Check out now
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* --------------------- Page --------------------- */

const MyFieldTasks = () => {
    const [tasks, setTasks] = useState<FieldTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [busy, setBusy] = useState<"checkin" | "checkout" | "photo" | "notes" | "notvisited" | null>(null);
    const [notesDraft, setNotesDraft] = useState("");

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/my`, { credentials: "include" });
            if (!res.ok) {
                toast.error(await extractError(res, "Failed to load tasks"));
                return;
            }
            const data: FieldTask[] = await res.json();
            setTasks(data);
            // Keep the panel open on the same task after a refetch, but don't
            // auto-open one on first load — the panel opens only on click.
            setSelectedId(prev => (prev && data.some(t => t.id === prev) ? prev : null));
        } catch {
            toast.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const schedule = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fetchTasks(), 250);
    }, [fetchTasks]);
    useFieldTaskSocket(schedule);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const selected = useMemo(() => tasks.find(t => t.id === selectedId) || null, [tasks, selectedId]);

    // Newest first, mirroring the admin task table.
    const sortedTasks = useMemo(
        () => [...tasks].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
        [tasks],
    );

    // Proof images are excluded from the list; fetch the selected task's proof lazily.
    const [proofCache, setProofCache] = useState<Record<number, string | null>>({});
    const fetchedProofs = useRef<Set<number>>(new Set());
    const loadProof = useCallback(async (id: number) => {
        if (fetchedProofs.current.has(id)) return;
        fetchedProofs.current.add(id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/${id}`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                setProofCache(prev => ({ ...prev, [id]: data.proofImage ?? null }));
            } else {
                fetchedProofs.current.delete(id);
            }
        } catch {
            fetchedProofs.current.delete(id);
        }
    }, []);

    useEffect(() => {
        setNotesDraft(selected?.notes || "");
        if (selected) loadProof(selected.id);
    }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const inProgress = useMemo(() => tasks.find(t => t.status === "In Progress") || null, [tasks]);

    const checkIn = useCallback(async (task: FieldTask) => {
        setBusy("checkin");
        const toastId = toast.loading("Getting your location…");
        try {
            const pos = await getCurrentPosition();
            const dist = Math.round(haversineMeters(pos.latitude, pos.longitude, task.latitude, task.longitude));
            if (dist > task.allowedRadius) {
                toast.error(`You're ${dist}m away — must be within ${task.allowedRadius}m to check in.`, { id: toastId });
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/${task.id}/check-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ latitude: pos.latitude, longitude: pos.longitude }),
            });
            if (!res.ok) throw new Error(await extractError(res, "Check-in failed"));
            toast.success("Checked in", { id: toastId });
            await fetchTasks();
        } catch (e: any) {
            toast.error(e?.message || "Could not check in (location permission needed)", { id: toastId });
        } finally {
            setBusy(null);
        }
    }, [fetchTasks]);

    const checkOut = useCallback(async (task: FieldTask, auto: boolean) => {
        if (!auto) setBusy("checkout");
        try {
            let body: any = { auto };
            try {
                const pos = await getCurrentPosition();
                body = { ...body, latitude: pos.latitude, longitude: pos.longitude };
            } catch { /* location optional on checkout */ }
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/${task.id}/check-out`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(await extractError(res, "Check-out failed"));
            toast[auto ? "warning" : "success"](auto ? "Auto checked-out (you left the area)" : "Checked out");
            await fetchTasks();
        } catch (e: any) {
            toast.error(e?.message || "Check-out failed");
        } finally {
            setBusy(null);
        }
    }, [fetchTasks]);

    // Submit the staged proof photo together with an optional comment. The
    // comment is saved to the task's notes so it shows on the admin side.
    // Returns true on success so the panel can clear its staged file.
    const submitProof = useCallback(async (task: FieldTask, file: File, comment: string): Promise<boolean> => {
        setBusy("photo");
        try {
            const base64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const trimmed = comment.trim();
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ proofImage: base64, ...(trimmed ? { notes: trimmed } : {}) }),
            });
            if (!res.ok) throw new Error(await extractError(res, "Submit failed"));
            // We already have the base64 locally — update the cache directly.
            fetchedProofs.current.add(task.id);
            setProofCache(prev => ({ ...prev, [task.id]: base64 }));
            toast.success("Proof submitted");
            // Refresh so the saved comment is reflected in the task list/panel.
            if (trimmed) await fetchTasks();
            return true;
        } catch (e: any) {
            toast.error(e?.message || "Submit failed");
            return false;
        } finally {
            setBusy(null);
        }
    }, [fetchTasks]);

    const saveNotes = useCallback(async (task: FieldTask) => {
        setBusy("notes");
        try {
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ notes: notesDraft }),
            });
            if (!res.ok) throw new Error(await extractError(res, "Save failed"));
            toast.success("Notes saved");
            await fetchTasks();
        } catch (e: any) {
            toast.error(e?.message || "Save failed");
        } finally {
            setBusy(null);
        }
    }, [fetchTasks, notesDraft]);

    const markNotVisited = useCallback(async (task: FieldTask, reason: string) => {
        setBusy("notvisited");
        try {
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/${task.id}/not-visited`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ reason }),
            });
            if (!res.ok) throw new Error(await extractError(res, "Failed to report"));
            toast.success("Marked as not visited");
            await fetchTasks();
        } catch (e: any) {
            toast.error(e?.message || "Failed to report");
        } finally {
            setBusy(null);
        }
    }, [fetchTasks]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F8F9FA]">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading your tasks…
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            {/* Auto-checkout runs whenever a task is checked in */}
            {inProgress && (
                <AutoCheckoutMonitor task={inProgress} onCheckout={auto => checkOut(inProgress, auto)} />
            )}

            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-none mx-auto overflow-x-hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl">
                        <Navigation size={28} className="text-green-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">My Field Tasks</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Check in at the task location and check out when done.
                        </p>
                    </div>
                </div>

                <TaskTable
                    tasks={sortedTasks}
                    selectedId={selectedId}
                    onSelect={t => setSelectedId(t.id)}
                    groupByDate
                />
            </div>

            {/* Slide-over detail panel */}
            <MyTaskPanel
                task={selected}
                proof={selected ? proofCache[selected.id] : undefined}
                busy={busy}
                inProgress={inProgress}
                notesDraft={notesDraft}
                onNotesChange={setNotesDraft}
                onClose={() => setSelectedId(null)}
                onCheckIn={checkIn}
                onCheckOut={checkOut}
                onSaveNotes={saveNotes}
                onSubmitProof={submitProof}
                onMarkNotVisited={markNotVisited}
            />
        </div>
    );
};

/* --------------------- Slide-over detail panel --------------------- */

function MyTaskPanel({
    task,
    proof,
    busy,
    inProgress,
    notesDraft,
    onNotesChange,
    onClose,
    onCheckIn,
    onCheckOut,
    onSaveNotes,
    onSubmitProof,
    onMarkNotVisited,
}: {
    task: FieldTask | null;
    proof?: string | null;
    busy: "checkin" | "checkout" | "photo" | "notes" | "notvisited" | null;
    inProgress: FieldTask | null;
    notesDraft: string;
    onNotesChange: (v: string) => void;
    onClose: () => void;
    onCheckIn: (task: FieldTask) => void;
    onCheckOut: (task: FieldTask, auto: boolean) => void;
    onSaveNotes: (task: FieldTask) => void;
    onSubmitProof: (task: FieldTask, file: File, comment: string) => Promise<boolean>;
    onMarkNotVisited: (task: FieldTask, reason: string) => void;
}) {
    const open = task !== null;
    const [reporting, setReporting] = useState(false);
    const [reasonDraft, setReasonDraft] = useState("");
    // Photo proof staged locally; only sent to the server when "Submit" is pressed.
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string | null>(null);

    const stagePhoto = (file: File) => {
        setPendingFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPendingPreview(reader.result as string);
        reader.readAsDataURL(file);
    };
    const cancelPhoto = () => {
        setPendingFile(null);
        setPendingPreview(null);
    };
    // Single submit for the whole section: sends the staged photo (with the
    // comment) when one is selected, otherwise saves the comment on its own.
    const submitProofAndComment = async () => {
        if (!task) return;
        if (pendingFile) {
            const ok = await onSubmitProof(task, pendingFile, notesDraft);
            if (ok) cancelPhoto();
        } else {
            onSaveNotes(task);
        }
    };

    // Live elapsed timer: starts ticking the moment a task is checked in
    // ("In Progress") and runs until check-out, when `totalDuration` takes over.
    const live = task?.status === "In Progress" && !!task?.checkInTime;
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!live) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [live, task?.checkInTime]);

    // Reset the report form + staged photo whenever the panel switches tasks or closes.
    useEffect(() => {
        setReporting(false);
        setReasonDraft("");
        setPendingFile(null);
        setPendingPreview(null);
    }, [task?.id]);

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
                        {/* Header */}
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
                                    {task.clientName && (
                                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                            <Building2 size={12} /> {task.clientName}
                                        </p>
                                    )}
                                </div>
                                <button
                                    title="Close"
                                    onClick={onClose}
                                    className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </header>

                        {/* Scrollable body */}
                        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                            {task.description && (
                                <p className="text-sm leading-relaxed text-slate-600">{task.description}</p>
                            )}

                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <Info icon={Building2} label="Client" value={task.clientName || "—"} />
                                <Info icon={Calendar} label="Date" value={fmtDate(task.date)} />
                                <Info icon={Clock} label="Expected" value={task.expectedDuration || "—"} />
                                <Info icon={MapPin} label="Radius" value={`${task.allowedRadius} m`} />
                                <Info icon={LogIn} label="Checked in" value={fmtTime(task.checkInTime)} />
                                <Info icon={LogOut} label="Checked out" value={fmtTime(task.checkOutTime)} />
                                <Info
                                    icon={Clock}
                                    label="Duration"
                                    value={
                                        live
                                            ? fmtElapsed(now - new Date(task.checkInTime!).getTime())
                                            : fmtDuration(task.totalDuration)
                                    }
                                />
                                {task.address && <Info icon={MapPin} label="Address" value={task.address} />}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                                <LocationViewMap task={task} height={220} />
                            </div>

                            {/* Check in / out */}
                            <div className="flex flex-wrap gap-3">
                                {task.status === "Assigned" && (
                                    <>
                                        <button
                                            onClick={() => onCheckIn(task)}
                                            disabled={busy !== null || (!!inProgress && inProgress.id !== task.id)}
                                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-sm shadow-lg shadow-emerald-500/10 disabled:opacity-50 transition-all"
                                        >
                                            {busy === "checkin" ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                                            Check In
                                        </button>
                                        {!reporting && (
                                            <button
                                                onClick={() => setReporting(true)}
                                                disabled={busy !== null}
                                                className="flex items-center gap-2 px-5 py-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 font-semibold text-sm hover:bg-rose-100 disabled:opacity-50 transition-all"
                                            >
                                                <Ban size={16} /> Can't visit
                                            </button>
                                        )}
                                    </>
                                )}
                                {task.status === "In Progress" && (
                                    <button
                                        onClick={() => onCheckOut(task, false)}
                                        disabled={busy !== null}
                                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-semibold text-sm shadow-lg shadow-amber-500/10 disabled:opacity-50 transition-all"
                                    >
                                        {busy === "checkout" ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                        Check Out
                                    </button>
                                )}
                                {task.status === "Completed" && (
                                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                                        <CheckCircle2 size={18} /> Task completed
                                    </div>
                                )}
                                {!!inProgress && inProgress.id !== task.id && task.status === "Assigned" && (
                                    <p className="text-xs text-muted-foreground self-center">
                                        Finish your active task before starting another.
                                    </p>
                                )}
                            </div>

                            {/* Report "not visited" reason */}
                            {task.status === "Assigned" && reporting && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                                        <Ban size={12} /> Reason for not visiting
                                    </p>
                                    <textarea
                                        rows={3}
                                        autoFocus
                                        value={reasonDraft}
                                        onChange={e => setReasonDraft(e.target.value)}
                                        placeholder="e.g. Client cancelled, vehicle breakdown, unwell…"
                                        className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onMarkNotVisited(task, reasonDraft.trim())}
                                            disabled={busy !== null || !reasonDraft.trim()}
                                            className="flex items-center gap-2 px-5 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm disabled:opacity-50 transition-all"
                                        >
                                            {busy === "notvisited" ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                                            Submit reason
                                        </button>
                                        <button
                                            onClick={() => { setReporting(false); setReasonDraft(""); }}
                                            disabled={busy !== null}
                                            className="px-5 py-2 rounded-md border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Submitted not-visited reason */}
                            {task.status === "Not Visited" && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1 mb-1.5">
                                        <Ban size={12} /> Reported as not visited
                                    </p>
                                    <p className="text-sm text-slate-700">{task.missedReason || "No reason provided."}</p>
                                </div>
                            )}

                            {/* Notes + photo proof */}
                            <div className="space-y-4 pt-1">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                        <StickyNote size={12} /> Notes / comments
                                    </p>
                                    <textarea
                                        rows={3}
                                        value={notesDraft}
                                        onChange={e => onNotesChange(e.target.value)}
                                        placeholder="Add a comment about this visit…"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                                        <Camera size={12} /> Photo proof
                                    </p>
                                    {pendingPreview ? (
                                        // Staged photo: preview, not yet saved.
                                        <div className="space-y-2">
                                            <img src={pendingPreview} alt="Selected proof" className="max-h-40 rounded-lg border border-slate-200" />
                                            <div className="flex items-center gap-3">
                                                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 cursor-pointer">
                                                    <Camera size={12} /> Choose a different photo
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={e => {
                                                            const f = e.target.files?.[0];
                                                            if (f) stagePhoto(f);
                                                            e.target.value = "";
                                                        }}
                                                    />
                                                </label>
                                                <button
                                                    onClick={cancelPhoto}
                                                    disabled={busy !== null}
                                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {proof === undefined ? (
                                                <p className="text-xs text-slate-400">Loading…</p>
                                            ) : proof ? (
                                                <img src={proof} alt="Proof" className="max-h-40 rounded-lg border border-slate-200" />
                                            ) : (
                                                <p className="text-xs text-slate-400">No photo uploaded yet.</p>
                                            )}
                                            <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-green-600 hover:text-green-700 cursor-pointer">
                                                <Camera size={12} />
                                                {proof ? "Replace photo" : "Upload photo"}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const f = e.target.files?.[0];
                                                        if (f) stagePhoto(f);
                                                        e.target.value = "";
                                                    }}
                                                />
                                            </label>
                                        </>
                                    )}
                                </div>

                                {/* Always-visible submit for the photo and/or comment */}
                                {(() => {
                                    const notesChanged = notesDraft.trim() !== (task.notes || "").trim();
                                    const canSubmit = !!pendingFile || notesChanged;
                                    return (
                                        <div className="pt-1">
                                            <button
                                                onClick={submitProofAndComment}
                                                disabled={busy !== null || !canSubmit}
                                                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-50 transition-all"
                                            >
                                                {busy === "photo" || busy === "notes" ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Check size={16} />
                                                )}
                                                Submit
                                            </button>
                                            {!canSubmit && (
                                                <p className="mt-1.5 text-[11px] text-center text-slate-400">
                                                    Add a photo or comment to submit.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>
    );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Icon size={11} /> {label}
            </p>
            <p className="text-slate-700 font-medium truncate">{value}</p>
        </div>
    );
}

export default MyFieldTasks;
