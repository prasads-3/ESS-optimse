import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import {
    MapPin,
    Plus,
    Loader2,
    Search,
    X,
    Check,
    ChevronDown,
    Navigation,
    CalendarDays,
    Repeat,
    AlertTriangle,
    Users,
    LogIn,
    LogOut,
    Clock,
    Save,
    Pencil,
    FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { LocationPicker, type LatLng } from "@/components/maps/LocationPicker";
import { useFieldTaskSocket } from "@/hooks/useFieldTaskSocket";
import { type FieldTask, fmtTime, fmtDuration, fmtDate } from "@/components/field-tasks/types";
import { TaskTable } from "@/components/field-tasks/TaskTable";
import { TaskDetailsPanel } from "@/components/field-tasks/TaskDetailsPanel";

type EmployeeOption = { id: number; name: string; email: string };

const inputCls =
    "w-full px-4 py-2.5 bg-secondary/30 border border-border/60 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all";

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

/* ----------------------------- Create dialog ----------------------------- */

type FormState = {
    title: string;
    description: string;
    assignedTo: string;
    clientName: string;
    address: string;
    date: string;
    expectedDuration: string;
    allowedRadius: string;
};

const emptyForm: FormState = {
    title: "",
    description: "",
    assignedTo: "",
    clientName: "",
    address: "",
    date: "",
    expectedDuration: "",
    allowedRadius: "100",
};

// One editable task; a weekday can hold several of these in the weekly builder.
type TaskDraft = {
    title: string;
    description: string;
    clientName: string;
    address: string;
    expectedDuration: string;
    allowedRadius: string;
    location: LatLng | null;
};

const makeTask = (): TaskDraft => ({
    title: "",
    description: "",
    clientName: "",
    address: "",
    expectedDuration: "",
    allowedRadius: "100",
    location: null,
});

// A weekday in the weekly builder: an enabled flag plus one or more tasks.
type DayDraft = {
    enabled: boolean;
    tasks: TaskDraft[];
};

const makeDay = (enabled: boolean): DayDraft => ({
    enabled,
    tasks: [makeTask()],
});

const defaultDays = (): DayDraft[] => [0, 1, 2, 3, 4, 5, 6].map(i => makeDay(i < 5));

function CreateFieldTaskDialog({
    open,
    onClose,
    employees,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    employees: EmployeeOption[];
    onCreated: () => void;
}) {
    const [form, setForm] = useState<FormState>(emptyForm);
    const [location, setLocation] = useState<LatLng | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [mode, setMode] = useState<"single" | "weekly">("single");
    const [weekStart, setWeekStart] = useState("");
    const [days, setDays] = useState<DayDraft[]>(defaultDays);
    const [expandedDay, setExpandedDay] = useState<number | null>(0);
    // Single-day mode: tasks added beyond the primary form (all share the same date).
    const [extraTasks, setExtraTasks] = useState<TaskDraft[]>([]);

    useEffect(() => {
        if (!open) {
            setForm(emptyForm);
            setLocation(null);
            setMode("single");
            setWeekStart("");
            setDays(defaultDays());
            setExpandedDay(0);
            setExtraTasks([]);
        }
    }, [open]);

    const addExtraTask = () => setExtraTasks(prev => [...prev, makeTask()]);
    const updateExtraTask = (idx: number, patch: Partial<TaskDraft>) =>
        setExtraTasks(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
    const removeExtraTask = (idx: number) =>
        setExtraTasks(prev => prev.filter((_, i) => i !== idx));

    const updateDay = (offset: number, patch: Partial<DayDraft>) =>
        setDays(prev => prev.map((d, i) => (i === offset ? { ...d, ...patch } : d)));

    const updateTask = (offset: number, taskIdx: number, patch: Partial<TaskDraft>) =>
        setDays(prev => prev.map((d, i) =>
            i === offset
                ? { ...d, tasks: d.tasks.map((t, ti) => (ti === taskIdx ? { ...t, ...patch } : t)) }
                : d
        ));

    const addTask = (offset: number) =>
        setDays(prev => prev.map((d, i) =>
            i === offset ? { ...d, tasks: [...d.tasks, makeTask()] } : d
        ));

    const removeTask = (offset: number, taskIdx: number) =>
        setDays(prev => prev.map((d, i) =>
            i === offset ? { ...d, tasks: d.tasks.filter((_, ti) => ti !== taskIdx) } : d
        ));

    const radiusNum = Math.max(1, parseInt(form.allowedRadius, 10) || 100);

    // 7 consecutive days starting at weekStart, with weekday + date labels.
    const weekDays = useMemo(() => {
        if (!weekStart) return [];
        const base = new Date(weekStart + "T00:00:00");
        return Array.from({ length: 7 }, (_, offset) => {
            const d = new Date(base);
            d.setDate(base.getDate() + offset);
            return {
                offset,
                date: d,
                weekday: d.toLocaleDateString([], { weekday: "short" }),
                label: d.toLocaleDateString([], { day: "numeric", month: "short" }),
            };
        });
    }, [weekStart]);

    const enabledCount = days.filter(d => d.enabled).length;
    const totalTasks = days.filter(d => d.enabled).reduce((n, d) => n + d.tasks.length, 0);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.assignedTo) return toast.error("Select an employee");

        let url: string;
        let body: any;
        let count = 1;

        if (mode === "weekly") {
            if (!weekStart) return toast.error("Pick the week start date");
            const enabled = days
                .map((d, i) => ({ d, i }))
                .filter(x => x.d.enabled);
            if (enabled.length === 0) return toast.error("Enable at least one day");
            for (const { d, i } of enabled) {
                const lbl = `${weekDays[i].weekday} ${weekDays[i].label}`;
                for (let ti = 0; ti < d.tasks.length; ti++) {
                    const t = d.tasks[ti];
                    const tn = d.tasks.length > 1 ? ` (task ${ti + 1})` : "";
                    if (!t.title.trim()) return toast.error(`${lbl}${tn}: task title is required`);
                    if (!t.location) return toast.error(`${lbl}${tn}: pick a map location`);
                }
            }
            const tasks = enabled.flatMap(({ d, i }) =>
                d.tasks.map(t => ({
                    title: t.title.trim(),
                    description: t.description.trim() || undefined,
                    clientName: t.clientName.trim() || undefined,
                    address: t.address.trim() || undefined,
                    latitude: t.location!.lat,
                    longitude: t.location!.lng,
                    allowedRadius: Math.max(1, parseInt(t.allowedRadius, 10) || 100),
                    expectedDuration: t.expectedDuration.trim() || undefined,
                    date: weekDays[i].date.toISOString(),
                }))
            );
            count = tasks.length;
            url = `${API_BASE_URL}/api/field-tasks/admin/batch`;
            body = { assignedTo: form.assignedTo, tasks };
        } else {
            if (!form.title.trim()) return toast.error("Task title is required");
            if (!form.date) return toast.error("Date is required");
            if (!location) return toast.error("Pick the task location on the map");
            const dateIso = new Date(form.date).toISOString();

            if (extraTasks.length === 0) {
                url = `${API_BASE_URL}/api/field-tasks/admin`;
                body = {
                    title: form.title.trim(),
                    description: form.description.trim() || undefined,
                    assignedTo: form.assignedTo,
                    clientName: form.clientName.trim() || undefined,
                    address: form.address.trim() || undefined,
                    latitude: location.lat,
                    longitude: location.lng,
                    allowedRadius: radiusNum,
                    expectedDuration: form.expectedDuration.trim() || undefined,
                    date: dateIso,
                };
            } else {
                // Primary task + extras, all on the same date → batch endpoint.
                for (let i = 0; i < extraTasks.length; i++) {
                    const t = extraTasks[i];
                    if (!t.title.trim()) return toast.error(`Task ${i + 2}: title is required`);
                    if (!t.location) return toast.error(`Task ${i + 2}: pick a map location`);
                }
                const tasks = [
                    {
                        title: form.title.trim(),
                        description: form.description.trim() || undefined,
                        clientName: form.clientName.trim() || undefined,
                        address: form.address.trim() || undefined,
                        latitude: location.lat,
                        longitude: location.lng,
                        allowedRadius: radiusNum,
                        expectedDuration: form.expectedDuration.trim() || undefined,
                        date: dateIso,
                    },
                    ...extraTasks.map(t => ({
                        title: t.title.trim(),
                        description: t.description.trim() || undefined,
                        clientName: t.clientName.trim() || undefined,
                        address: t.address.trim() || undefined,
                        latitude: t.location!.lat,
                        longitude: t.location!.lng,
                        allowedRadius: Math.max(1, parseInt(t.allowedRadius, 10) || 100),
                        expectedDuration: t.expectedDuration.trim() || undefined,
                        date: dateIso,
                    })),
                ];
                count = tasks.length;
                url = `${API_BASE_URL}/api/field-tasks/admin/batch`;
                body = { assignedTo: form.assignedTo, tasks };
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(await extractError(res, "Failed to create task"));
            toast.success(`${count} field task${count !== 1 ? "s" : ""} assigned`);
            onCreated();
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && !submitting && onClose()}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 rounded-md">
                            <MapPin size={20} className="text-brand" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-foreground">Assign Field Task</div>
                            <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                                Set the location and allowed check-in radius
                            </DialogDescription>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    {/* Shared across both modes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Employee *</Label>
                            <select
                                className={inputCls}
                                value={form.assignedTo}
                                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                            >
                                <option value="">— Select employee —</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.email}>
                                        {emp.name} ({emp.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Schedule</Label>
                            <div className="flex bg-secondary/40 p-1 rounded-sm">
                                {([
                                    { k: "single", t: "Single day" },
                                    { k: "weekly", t: "Whole week (per day)" },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.k}
                                        type="button"
                                        onClick={() => setMode(opt.k)}
                                        className={cn(
                                            "flex-1 px-3 py-1.5 rounded-sm text-xs font-bold transition-all",
                                            mode === opt.k
                                                ? "bg-white text-brand shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {opt.t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {mode === "single" ? (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label>Task *</Label>
                                    <input
                                        className={inputCls}
                                        placeholder="e.g. AC Repair"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Client / Place Name</Label>
                                    <input
                                        className={inputCls}
                                        placeholder="e.g. Client A"
                                        value={form.clientName}
                                        onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Date *</Label>
                                    <input
                                        type="date"
                                        className={inputCls}
                                        value={form.date}
                                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Address</Label>
                                    <input
                                        className={inputCls}
                                        placeholder="e.g. Andheri East, Mumbai"
                                        value={form.address}
                                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Expected Duration</Label>
                                    <input
                                        className={inputCls}
                                        placeholder="e.g. 2 Hours"
                                        value={form.expectedDuration}
                                        onChange={e => setForm(f => ({ ...f, expectedDuration: e.target.value }))}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label>Task Description</Label>
                                    <textarea
                                        rows={2}
                                        className={inputCls}
                                        placeholder="Details / instructions for the employee"
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Map Location Picker *</Label>
                                <LocationPicker value={location} radius={radiusNum} onChange={setLocation} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Latitude</Label>
                                    <input className={cn(inputCls, "bg-secondary/50")} value={location ? location.lat.toFixed(6) : ""} readOnly placeholder="auto" />
                                </div>
                                <div>
                                    <Label>Longitude</Label>
                                    <input className={cn(inputCls, "bg-secondary/50")} value={location ? location.lng.toFixed(6) : ""} readOnly placeholder="auto" />
                                </div>
                                <div>
                                    <Label>Allowed Radius (m)</Label>
                                    <input
                                        type="number"
                                        min={1}
                                        className={inputCls}
                                        value={form.allowedRadius}
                                        onChange={e => setForm(f => ({ ...f, allowedRadius: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Additional tasks for the same employee + date */}
                            {extraTasks.map((t, idx) => (
                                <div
                                    key={idx}
                                    className="space-y-4 rounded-md border border-border/40 bg-card/60 p-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                                            Task {idx + 2}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeExtraTask(idx)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive hover:underline"
                                        >
                                            <X size={13} /> Remove
                                        </button>
                                    </div>
                                    <TaskFields task={t} onChange={patch => updateExtraTask(idx, patch)} />
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addExtraTask}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                            >
                                <Plus size={14} /> Add another task
                            </button>
                            {extraTasks.length > 0 && (
                                <p className="text-[11px] text-muted-foreground">
                                    {extraTasks.length + 1} tasks will be created for the same employee on the selected date.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Week starting *</Label>
                                    <input
                                        type="date"
                                        className={inputCls}
                                        value={weekStart}
                                        onChange={e => setWeekStart(e.target.value)}
                                    />
                                </div>
                            </div>
                            {!weekStart ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <CalendarDays size={13} /> Pick a week start date, then set a task for each day.
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {weekDays.map(wd => (
                                            <WeeklyDayCard
                                                key={wd.offset}
                                                day={days[wd.offset]}
                                                weekday={wd.weekday}
                                                dateLabel={wd.label}
                                                expanded={expandedDay === wd.offset}
                                                onToggleExpand={() =>
                                                    setExpandedDay(expandedDay === wd.offset ? null : wd.offset)
                                                }
                                                onToggle={() => {
                                                    const nowOn = !days[wd.offset].enabled;
                                                    updateDay(wd.offset, { enabled: nowOn });
                                                    if (nowOn) setExpandedDay(wd.offset);
                                                }}
                                                onChangeTask={(ti, patch) => updateTask(wd.offset, ti, patch)}
                                                onAddTask={() => addTask(wd.offset)}
                                                onRemoveTask={ti => removeTask(wd.offset, ti)}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {enabledCount} day{enabledCount !== 1 ? "s" : ""} selected · {totalTasks} task{totalTasks !== 1 ? "s" : ""} — a separate task is created for each entry.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </form>

                <div className="px-6 py-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-border/60 rounded-sm hover:bg-secondary/30 disabled:opacity-60 transition-colors"
                    >
                        <X size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
                        Assign Task
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            {children}
        </label>
    );
}

/* ------------------------------ Edit dialog ------------------------------ */

/**
 * Edit an existing field task's details (title, client, date, address, duration,
 * description, map location + radius). Assignment is changed via Reassign, not here.
 */
function EditFieldTaskDialog({
    task,
    assigneeName,
    onClose,
    onUpdated,
}: {
    task: FieldTask | null;
    assigneeName?: string;
    onClose: () => void;
    onUpdated: () => void;
}) {
    const [form, setForm] = useState<FormState>(emptyForm);
    const [location, setLocation] = useState<LatLng | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const open = task !== null;

    // Hydrate the form whenever a different task is opened for editing.
    useEffect(() => {
        if (!task) return;
        setForm({
            title: task.title ?? "",
            description: task.description ?? "",
            assignedTo: task.assignedTo ?? "",
            clientName: task.clientName ?? "",
            address: task.address ?? "",
            date: task.date ? new Date(task.date).toISOString().slice(0, 10) : "",
            expectedDuration: task.expectedDuration ?? "",
            allowedRadius: String(task.allowedRadius ?? 100),
        });
        setLocation({ lat: task.latitude, lng: task.longitude });
    }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const radiusNum = Math.max(1, parseInt(form.allowedRadius, 10) || 100);

    const submit = async () => {
        if (!task) return;
        if (!form.title.trim()) return toast.error("Task title is required");
        if (!form.date) return toast.error("Date is required");
        if (!location) return toast.error("Pick the task location on the map");

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/admin/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim(),
                    clientName: form.clientName.trim(),
                    address: form.address.trim(),
                    latitude: location.lat,
                    longitude: location.lng,
                    allowedRadius: radiusNum,
                    expectedDuration: form.expectedDuration.trim(),
                    date: new Date(form.date).toISOString(),
                }),
            });
            if (!res.ok) throw new Error(await extractError(res, "Failed to update task"));
            toast.success("Field task updated");
            onUpdated();
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && !submitting && onClose()}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 rounded-md">
                            <Pencil size={20} className="text-brand" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-foreground">Edit Field Task</div>
                            <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                                {assigneeName ? `Assigned to ${assigneeName}` : "Update the task details below"}
                            </DialogDescription>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Label>Task *</Label>
                            <input
                                className={inputCls}
                                placeholder="e.g. AC Repair"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Client / Place Name</Label>
                            <input
                                className={inputCls}
                                placeholder="e.g. Client A"
                                value={form.clientName}
                                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Date *</Label>
                            <input
                                type="date"
                                className={inputCls}
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Address</Label>
                            <input
                                className={inputCls}
                                placeholder="e.g. Andheri East, Mumbai"
                                value={form.address}
                                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label>Expected Duration</Label>
                            <input
                                className={inputCls}
                                placeholder="e.g. 2 Hours"
                                value={form.expectedDuration}
                                onChange={e => setForm(f => ({ ...f, expectedDuration: e.target.value }))}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Task Description</Label>
                            <textarea
                                rows={2}
                                className={inputCls}
                                placeholder="Details / instructions for the employee"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div>
                        <Label>Map Location Picker *</Label>
                        <LocationPicker value={location} radius={radiusNum} onChange={setLocation} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Latitude</Label>
                            <input className={cn(inputCls, "bg-secondary/50")} value={location ? location.lat.toFixed(6) : ""} readOnly placeholder="auto" />
                        </div>
                        <div>
                            <Label>Longitude</Label>
                            <input className={cn(inputCls, "bg-secondary/50")} value={location ? location.lng.toFixed(6) : ""} readOnly placeholder="auto" />
                        </div>
                        <div>
                            <Label>Allowed Radius (m)</Label>
                            <input
                                type="number"
                                min={1}
                                className={inputCls}
                                value={form.allowedRadius}
                                onChange={e => setForm(f => ({ ...f, allowedRadius: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-border/60 rounded-sm hover:bg-secondary/30 disabled:opacity-60 transition-colors"
                    >
                        <X size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
                    >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Renders the editable fields for a single task draft (title, client, address,
// duration, description, map, lat/lng/radius). Date and employee are shared and
// handled by the caller. Used by both the single-day and weekly builders.
function TaskFields({
    task,
    onChange,
}: {
    task: TaskDraft;
    onChange: (patch: Partial<TaskDraft>) => void;
}) {
    const radius = Math.max(1, parseInt(task.allowedRadius, 10) || 100);
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                    <Label>Task *</Label>
                    <input
                        className={inputCls}
                        placeholder="e.g. AC Repair"
                        value={task.title}
                        onChange={e => onChange({ title: e.target.value })}
                    />
                </div>
                <div>
                    <Label>Client / Place Name</Label>
                    <input
                        className={inputCls}
                        placeholder="e.g. Client A"
                        value={task.clientName}
                        onChange={e => onChange({ clientName: e.target.value })}
                    />
                </div>
                <div>
                    <Label>Expected Duration</Label>
                    <input
                        className={inputCls}
                        placeholder="e.g. 2 Hours"
                        value={task.expectedDuration}
                        onChange={e => onChange({ expectedDuration: e.target.value })}
                    />
                </div>
                <div className="md:col-span-2">
                    <Label>Address</Label>
                    <input
                        className={inputCls}
                        placeholder="e.g. Andheri East, Mumbai"
                        value={task.address}
                        onChange={e => onChange({ address: e.target.value })}
                    />
                </div>
                <div className="md:col-span-2">
                    <Label>Task Description</Label>
                    <textarea
                        rows={2}
                        className={inputCls}
                        placeholder="Details / instructions for the employee"
                        value={task.description}
                        onChange={e => onChange({ description: e.target.value })}
                    />
                </div>
            </div>
            <div>
                <Label>Map Location *</Label>
                <LocationPicker
                    value={task.location}
                    radius={radius}
                    onChange={loc => onChange({ location: loc })}
                    height={240}
                />
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label>Latitude</Label>
                    <input className={cn(inputCls, "bg-secondary/50")} readOnly placeholder="auto" value={task.location ? task.location.lat.toFixed(6) : ""} />
                </div>
                <div>
                    <Label>Longitude</Label>
                    <input className={cn(inputCls, "bg-secondary/50")} readOnly placeholder="auto" value={task.location ? task.location.lng.toFixed(6) : ""} />
                </div>
                <div>
                    <Label>Radius (m)</Label>
                    <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={task.allowedRadius}
                        onChange={e => onChange({ allowedRadius: e.target.value })}
                    />
                </div>
            </div>
        </>
    );
}

function WeeklyDayCard({
    day,
    weekday,
    dateLabel,
    expanded,
    onToggleExpand,
    onToggle,
    onChangeTask,
    onAddTask,
    onRemoveTask,
}: {
    day: DayDraft;
    weekday: string;
    dateLabel: string;
    expanded: boolean;
    onToggleExpand: () => void;
    onToggle: () => void;
    onChangeTask: (taskIdx: number, patch: Partial<TaskDraft>) => void;
    onAddTask: () => void;
    onRemoveTask: (taskIdx: number) => void;
}) {
    const summary = day.tasks.length > 1
        ? `${day.tasks.length} tasks`
        : (day.tasks[0]?.title.trim() || "No task set yet");
    return (
        <div
            className={cn(
                "border rounded-md transition-all",
                day.enabled ? "border-brand/40 bg-brand/[0.03]" : "border-border/50 bg-card"
            )}
        >
            <div className="flex items-center gap-3 p-3">
                <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={onToggle}
                    className="h-4 w-4 accent-brand cursor-pointer"
                />
                <button
                    type="button"
                    onClick={() => day.enabled && onToggleExpand()}
                    disabled={!day.enabled}
                    className="flex-1 flex items-center justify-between text-left disabled:cursor-default"
                >
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {weekday} · {dateLabel}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            {day.enabled ? summary : "Not assigned"}
                        </div>
                    </div>
                    {day.enabled && (
                        <ChevronDown
                            size={16}
                            className={cn("text-muted-foreground transition-transform", expanded && "rotate-180")}
                        />
                    )}
                </button>
            </div>

            {day.enabled && expanded && (
                <div className="px-3 pb-4 pt-4 space-y-4 border-t border-border/40">
                    {day.tasks.map((t, ti) => (
                        <div
                            key={ti}
                            className={cn(
                                "space-y-4",
                                day.tasks.length > 1 && "rounded-md border border-border/40 bg-card/60 p-3"
                            )}
                        >
                            {day.tasks.length > 1 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                                        Task {ti + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveTask(ti)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive hover:underline"
                                    >
                                        <X size={13} /> Remove
                                    </button>
                                </div>
                            )}
                            <TaskFields task={t} onChange={patch => onChangeTask(ti, patch)} />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={onAddTask}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                    >
                        <Plus size={14} /> Add another task
                    </button>
                </div>
            )}
        </div>
    );
}

/* ----------------------------- Reassign modal ----------------------------- */

/**
 * Reassign modal rendered through a portal into document.body so it escapes the
 * task drawer's stacking context. The backdrop (z-9998) covers everything —
 * including the right-side detail drawer (z-60) — and the modal sits on top
 * (z-9999), so only one interaction layer is ever active.
 */
function ReassignFieldTaskDialog({
    task,
    employees,
    currentName,
    onClose,
    onReassign,
}: {
    task: FieldTask | null;
    employees: EmployeeOption[];
    currentName?: string;
    onClose: () => void;
    onReassign: (task: FieldTask, email: string) => Promise<void>;
}) {
    const [assignedTo, setAssignedTo] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // Retain the last task during the exit animation, after `task` becomes null.
    const [shownTask, setShownTask] = useState<FieldTask | null>(task);

    const open = task !== null;

    useEffect(() => {
        if (task) {
            setShownTask(task);
            setAssignedTo("");
        }
    }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const requestClose = useCallback(() => {
        if (!submitting) onClose();
    }, [submitting, onClose]);

    // Lock body scroll + close on ESC while the modal is open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") requestClose();
        };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, requestClose]);

    // Don't offer the employee the task already belongs to.
    const options = useMemo(
        () => employees.filter(e => e.email !== shownTask?.assignedTo),
        [employees, shownTask?.assignedTo],
    );

    const submit = async () => {
        if (!shownTask) return;
        if (!assignedTo) return toast.error("Select an employee to reassign to");
        setSubmitting(true);
        try {
            await onReassign(shownTask, assignedTo);
            const name = employees.find(e => e.email === assignedTo)?.name || assignedTo;
            toast.success(`Task reassigned to ${name}`);
            onClose();
        } catch (err: any) {
            toast.error(err?.message || "Failed to reassign task");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {open && shownTask && (
                <>
                    {/* Full-screen dim + blur backdrop (above the task drawer) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={requestClose}
                        style={{ zIndex: 9998 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Centered modal layer. pointer-events-none lets clicks on the
                        empty area fall through to the backdrop (click-outside to close). */}
                    <div
                        style={{ zIndex: 9999 }}
                        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="reassign-title"
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ type: "spring", stiffness: 320, damping: 30 }}
                            className="pointer-events-auto w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-background shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand/10 rounded-md">
                                        <Repeat size={20} className="text-brand" />
                                    </div>
                                    <div>
                                        <h2 id="reassign-title" className="text-lg font-bold text-foreground">
                                            Reassign Field Task
                                        </h2>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            Move this task to a different employee
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    aria-label="Close"
                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-6 space-y-5">
                                <div className="rounded-md bg-secondary/30 border border-border/50 px-4 py-3">
                                    <div className="text-sm font-bold text-foreground">{shownTask.title}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Currently assigned to {currentName || shownTask.assignedTo}
                                    </div>
                                </div>

                                <div>
                                    <Label>Reassign to *</Label>
                                    <select
                                        autoFocus
                                        className={inputCls}
                                        value={assignedTo}
                                        onChange={e => setAssignedTo(e.target.value)}
                                    >
                                        <option value="">— Select employee —</option>
                                        {options.map(emp => (
                                            <option key={emp.id} value={emp.email}>
                                                {emp.name} ({emp.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <p className="flex items-start gap-2 text-[11px] text-amber-600">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    Reassigning resets the task to “Assigned” and clears any check-in/out,
                                    notes and proof from the previous employee.
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-border/60 rounded-sm hover:bg-secondary/30 disabled:opacity-60 transition-colors"
                                >
                                    <X size={16} /> Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={submitting || !assignedTo}
                                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:opacity-60"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat size={16} />}
                                    Reassign
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
}

/* -------------------------- Employee visits table -------------------------- */

/**
 * One row per employee, summarising their most recent field visit: check-in/out,
 * duration, the task, a reassign action for visits that weren't attended, and an
 * admin-editable remark.
 */
function EmployeeVisitsTable({
    employees,
    tasks,
    onReassign,
    onSaveRemark,
}: {
    employees: EmployeeOption[];
    tasks: FieldTask[];
    onReassign: (task: FieldTask) => void;
    onSaveRemark: (task: FieldTask, remark: string) => Promise<void>;
}) {
    // Per employee: their latest visit plus completed/total counts.
    const rows = useMemo(
        () =>
            employees.map(emp => {
                const empTasks = tasks
                    .filter(t => t.assignedTo === emp.email)
                    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
                const completed = empTasks.filter(t => t.status === "Completed").length;
                return { emp, task: empTasks[0] ?? null, completed, total: empTasks.length };
            }),
        [employees, tasks],
    );

    if (employees.length === 0) return null;

    const COLS = ["Emp ID", "Employee", "Visits", "Check In", "Check Out", "Duration", "Description", "Reason", "Reassign", "Remark"];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-brand/10 p-2">
                    <Users size={18} className="text-brand" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Employee Visits</h2>
                    <p className="text-xs text-slate-500">
                        Latest visit per employee — reassign unattended visits and add remarks.
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {COLS.map(c => (
                                    <th key={c} className="px-4 py-3 text-left first:pl-5">{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ emp, task, completed, total }) => {
                                const notAttended = task != null && (task.status === "Assigned" || task.status === "Not Visited");
                                return (
                                    <tr key={emp.id} className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50/60">
                                        <td className="px-4 py-3.5 pl-5 font-mono text-xs text-slate-500">#{emp.id}</td>
                                        <td className="px-4 py-3.5">
                                            <div className="font-semibold text-slate-800">{emp.name}</div>
                                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-baseline gap-1 font-semibold">
                                                <span className="text-brand">{completed}</span>
                                                <span className="text-slate-400">/ {total}</span>
                                            </span>
                                            <div className="text-[10px] text-slate-400">visits done</div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <LogIn size={13} className="text-brand" />
                                                {task ? fmtTime(task.checkInTime) : "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <LogOut size={13} className="text-amber-500" />
                                                {task ? fmtTime(task.checkOutTime) : "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <Clock size={13} className="text-slate-400" />
                                                {task ? fmtDuration(task.totalDuration) : "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 max-w-[220px]">
                                            {task ? (
                                                <>
                                                    <div className="truncate font-medium text-slate-700">{task.title}</div>
                                                    {task.description && (
                                                        <div className="line-clamp-2 text-[11px] text-slate-400">{task.description}</div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-slate-400">No visits</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 max-w-[220px]">
                                            {task && task.status === "Not Visited" ? (
                                                <span className="line-clamp-2 text-rose-600">{task.missedReason || "No reason given"}</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {!task ? (
                                                <span className="text-slate-300">—</span>
                                            ) : notAttended ? (
                                                <button
                                                    onClick={() => onReassign(task)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
                                                >
                                                    <Repeat size={13} /> Reassign
                                                </button>
                                            ) : (
                                                <span className="text-xs font-semibold text-brand">Attended</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 min-w-[200px]">
                                            {task ? (
                                                <RemarkCell task={task} onSave={onSaveRemark} />
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function RemarkCell({
    task,
    onSave,
}: {
    task: FieldTask;
    onSave: (task: FieldTask, remark: string) => Promise<void>;
}) {
    const [draft, setDraft] = useState(task.adminRemark || "");
    const [saving, setSaving] = useState(false);

    // Re-sync when the stored remark changes (e.g. after a refetch).
    useEffect(() => {
        setDraft(task.adminRemark || "");
    }, [task.adminRemark]);

    const dirty = draft !== (task.adminRemark || "");

    const save = async () => {
        setSaving(true);
        try {
            await onSave(task, draft);
        } catch (e: any) {
            toast.error(e?.message || "Failed to save remark");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-1.5">
            <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Add remark…"
                className="w-full min-w-[140px] rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
            {dirty && (
                <button
                    onClick={save}
                    disabled={saving}
                    title="Save remark"
                    className="shrink-0 rounded-lg bg-brand p-1.5 text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                </button>
            )}
        </div>
    );
}

/* ----------------------------- Main page ----------------------------- */

const STATUS_FILTERS = ["All", "Assigned", "Completed", "Not Visited"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const AdminFieldTasks = () => {
    const [tasks, setTasks] = useState<FieldTask[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [reassignTask, setReassignTask] = useState<FieldTask | null>(null);
    const [editTask, setEditTask] = useState<FieldTask | null>(null);
    const [activeTab, setActiveTab] = useState<"tasks" | "visits">("tasks");

    // Proof images are excluded from the list payload; fetch per task on open.
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

    const fetchAll = useCallback(async () => {
        try {
            const [tRes, eRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/field-tasks/admin`, { credentials: "include" }),
                fetch(`${API_BASE_URL}/api/employees`, { credentials: "include" }),
            ]);
            if (tRes.ok) setTasks(await tRes.json());
            else toast.error(await extractError(tRes, "Failed to load tasks"));
            if (eRes.ok) {
                const emps = await eRes.json();
                setEmployees(
                    (Array.isArray(emps) ? emps : emps.employees || []).map((e: any) => ({
                        id: e.id,
                        name: e.name,
                        email: e.email,
                    }))
                );
            }
        } catch {
            toast.error("Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Realtime refetch (debounced)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const schedule = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fetchAll(), 250);
    }, [fetchAll]);
    useFieldTaskSocket(schedule);
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

    const empByEmail = useMemo(() => {
        const m = new Map<string, string>();
        employees.forEach(e => m.set(e.email, e.name));
        return m;
    }, [employees]);
    const nameFor = useCallback((email: string) => empByEmail.get(email), [empByEmail]);

    const handleDelete = async (task: FieldTask) => {
        if (!window.confirm(`Delete field task "${task.title}"?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/field-tasks/admin/${task.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error(await extractError(res, "Failed to delete"));
            setTasks(prev => prev.filter(t => t.id !== task.id));
            if (selectedId === task.id) setSelectedId(null);
            toast.success("Task deleted");
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete");
        }
    };

    const handleReassign = async (task: FieldTask, email: string) => {
        const res = await fetch(`${API_BASE_URL}/api/field-tasks/admin/${task.id}/reassign`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ assignedTo: email }),
        });
        if (!res.ok) throw new Error(await extractError(res, "Failed to reassign task"));
        await fetchAll();
    };

    const handleSaveRemark = async (task: FieldTask, remark: string) => {
        const res = await fetch(`${API_BASE_URL}/api/field-tasks/admin/${task.id}/remark`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ remark }),
        });
        if (!res.ok) throw new Error(await extractError(res, "Failed to save remark"));
        await fetchAll();
    };

    // Download the active tab's data as an .xlsx file.
    const exportExcel = async () => {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        const stamp = new Date().toISOString().slice(0, 10);

        if (activeTab === "tasks") {
            if (filtered.length === 0) return toast.error("No tasks to export");
            const data = filtered.map(t => ({
                "Task": t.title,
                "Description": t.description || "",
                "Employee": nameFor(t.assignedTo) || "",
                "Email": t.assignedTo,
                "Client": t.clientName || "",
                "Address": t.address || "",
                "Date": fmtDate(t.date),
                "Status": t.status,
                "Check In": fmtTime(t.checkInTime),
                "Check Out": fmtTime(t.checkOutTime),
                "Duration": fmtDuration(t.totalDuration),
                "Allowed Radius (m)": t.allowedRadius,
                "Not Visited Reason": t.missedReason || "",
                "Admin Remark": t.adminRemark || "",
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws["!cols"] = [22, 30, 18, 24, 16, 24, 12, 12, 10, 10, 10, 14, 28, 24].map(wch => ({ wch }));
            XLSX.utils.book_append_sheet(wb, ws, "Field Tasks");
            XLSX.writeFile(wb, `Field_Tasks_${stamp}.xlsx`);
        } else {
            if (employees.length === 0) return toast.error("No employees to export");
            const data = employees.map(emp => {
                const empTasks = tasks
                    .filter(t => t.assignedTo === emp.email)
                    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
                const latest = empTasks[0];
                const completed = empTasks.filter(t => t.status === "Completed").length;
                return {
                    "Emp ID": emp.id,
                    "Employee": emp.name,
                    "Email": emp.email,
                    "Visits Completed": completed,
                    "Total Visits": empTasks.length,
                    "Latest Task": latest?.title || "",
                    "Latest Date": latest ? fmtDate(latest.date) : "",
                    "Status": latest?.status || "",
                    "Check In": latest ? fmtTime(latest.checkInTime) : "",
                    "Check Out": latest ? fmtTime(latest.checkOutTime) : "",
                    "Duration": latest ? fmtDuration(latest.totalDuration) : "",
                    "Not Visited Reason": latest?.status === "Not Visited" ? (latest.missedReason || "") : "",
                    "Admin Remark": latest?.adminRemark || "",
                };
            });
            const ws = XLSX.utils.json_to_sheet(data);
            ws["!cols"] = [8, 18, 24, 14, 12, 22, 12, 12, 10, 10, 10, 28, 24].map(wch => ({ wch }));
            XLSX.utils.book_append_sheet(wb, ws, "Employee Visits");
            XLSX.writeFile(wb, `Employee_Visits_${stamp}.xlsx`);
        }
        toast.success("Exported to Excel");
    };

    // Search + status filter, newest first.
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return tasks
            .filter(t => statusFilter === "All" || t.status === statusFilter)
            .filter(t => {
                if (!q) return true;
                const name = empByEmail.get(t.assignedTo) || "";
                return (
                    t.title.toLowerCase().includes(q) ||
                    (t.clientName || "").toLowerCase().includes(q) ||
                    (t.address || "").toLowerCase().includes(q) ||
                    t.assignedTo.toLowerCase().includes(q) ||
                    name.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }, [tasks, search, statusFilter, empByEmail]);

    const activeCount = tasks.filter(t => t.status === "In Progress").length;

    // Derive the selected task from the live list so the panel updates on refetch.
    const selectedTask = useMemo(
        () => tasks.find(t => t.id === selectedId) ?? null,
        [tasks, selectedId],
    );

    const openTask = (task: FieldTask) => {
        setSelectedId(task.id);
        loadProof(task.id);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-none mx-auto overflow-x-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand/10 rounded-xl">
                            <Navigation size={28} className="text-brand" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Field Task Tracking</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Assign location-based tasks and monitor GPS check-in / check-out.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDialogOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
                    >
                        <Plus size={18} /> Assign Field Task
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200">
                    <div className="flex items-center gap-1">
                        {([
                            { k: "tasks", label: "Tasks", icon: <MapPin size={15} /> },
                            { k: "visits", label: "Employee Visits", icon: <Users size={15} /> },
                        ] as const).map(t => (
                            <button
                                key={t.k}
                                onClick={() => setActiveTab(t.k)}
                                className={cn(
                                    "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
                                    activeTab === t.k
                                        ? "border-brand text-brand"
                                        : "border-transparent text-slate-500 hover:text-slate-700",
                                )}
                            >
                                {t.icon}
                                {t.label}
                                {t.k === "tasks" && tasks.length > 0 && (
                                    <span className={cn(
                                        "rounded-full px-1.5 py-0.5 text-[10px]",
                                        activeTab === t.k ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-500",
                                    )}>{tasks.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={exportExcel}
                        disabled={loading}
                        title="Download current tab as Excel"
                        className="mb-1.5 inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-white px-3.5 py-2 text-xs font-semibold text-brand shadow-sm transition-all hover:border-brand/50 hover:bg-brand/5 disabled:opacity-50"
                    >
                        <FileSpreadsheet size={15} /> Excel
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 shadow-sm">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
                    </div>
                ) : activeTab === "tasks" ? (
                    <div className="space-y-6">
                        {/* Toolbar: status filter + search */}
                        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {STATUS_FILTERS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
                                            statusFilter === s
                                                ? "bg-brand text-white shadow-sm shadow-brand/20"
                                                : "text-slate-500 hover:bg-slate-100",
                                        )}
                                    >
                                        {s}
                                        {s === "In Progress" && activeCount > 0 && (
                                            <span className="ml-1.5 opacity-80">{activeCount}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full lg:w-80 group">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search task, client, employee…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-12 pr-4 text-sm font-medium focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all"
                                />
                            </div>
                        </div>

                        <TaskTable
                            tasks={filtered}
                            selectedId={selectedId}
                            onSelect={openTask}
                            nameFor={nameFor}
                        />
                    </div>
                ) : (
                    <EmployeeVisitsTable
                        employees={employees}
                        tasks={tasks}
                        onReassign={setReassignTask}
                        onSaveRemark={handleSaveRemark}
                    />
                )}
            </div>

            {/* Slide-over detail panel */}
            <TaskDetailsPanel
                task={selectedTask}
                proof={selectedTask ? proofCache[selectedTask.id] : undefined}
                assigneeName={selectedTask ? nameFor(selectedTask.assignedTo) : undefined}
                onClose={() => setSelectedId(null)}
                onDelete={handleDelete}
                onEdit={task => {
                    // Close the drawer first so the edit dialog is the only active layer.
                    setSelectedId(null);
                    setEditTask(task);
                }}
                onReassign={task => {
                    // Close the drawer first so the modal is the only active layer.
                    setSelectedId(null);
                    setReassignTask(task);
                }}
            />

            <ReassignFieldTaskDialog
                task={reassignTask}
                employees={employees}
                currentName={reassignTask ? nameFor(reassignTask.assignedTo) : undefined}
                onClose={() => setReassignTask(null)}
                onReassign={handleReassign}
            />

            <EditFieldTaskDialog
                task={editTask}
                assigneeName={editTask ? nameFor(editTask.assignedTo) : undefined}
                onClose={() => setEditTask(null)}
                onUpdated={fetchAll}
            />

            <CreateFieldTaskDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                employees={employees}
                onCreated={fetchAll}
            />
        </div>
    );
};

export default AdminFieldTasks;
