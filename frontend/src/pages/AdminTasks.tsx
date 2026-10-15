import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import {
    ClipboardList,
    Plus,
    Trash2,
    Loader2,
    Search,
    ArrowLeft,
    ArrowRight,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { TaskCard, type TaskItem, type Priority } from "@/components/tasks";
import { useTaskSocket } from "@/hooks/useTaskSocket";

type DailyDraft = { dayName: string; title: string; description?: string };
type WeekDraft = {
    weekNumber: number;
    startDate: string;
    endDate: string;
    dailyTasks: DailyDraft[];
};

type EmployeeOption = { id: number; name: string; email: string };

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultDay = (): DailyDraft => ({ dayName: "Monday", title: "", description: "" });
const defaultWeek = (n: number): WeekDraft => ({
    weekNumber: n,
    startDate: "",
    endDate: "",
    dailyTasks: [defaultDay()],
});

const inputCls =
    "w-full px-4 py-2.5 bg-secondary/30 border border-border/60 rounded-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

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

/* ----------------------------- Wizard ----------------------------- */

type FormState = {
    title: string;
    description: string;
    assignedTo: string;
    priority: Priority;
    startDate: string;
    endDate: string;
    clientName: string;
    address: string;
    expectedDuration: string;
    radius: string;
};

const STEPS = [
    { n: 1, label: "Project Details" },
    { n: 2, label: "Add Weeks" },
    { n: 3, label: "Daily Tasks" },
] as const;

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((s, i) => {
                const done = current > s.n;
                const active = current === s.n;
                return (
                    <div key={s.n} className="flex items-center">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold transition-all",
                                    done
                                        ? "bg-primary text-white"
                                        : active
                                          ? "bg-primary text-white shadow-lg shadow-primary/20 ring-4 ring-primary/10"
                                          : "bg-secondary text-muted-foreground"
                                )}
                            >
                                {done ? <Check size={14} /> : s.n}
                            </div>
                            <span
                                className={cn(
                                    "text-xs font-bold uppercase tracking-wider hidden sm:block",
                                    active || done ? "text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {s.label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "w-8 h-0.5 mx-3 transition-all",
                                    done ? "bg-primary" : "bg-border/60"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CreateProjectWizard({
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
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [activeWeekTab, setActiveWeekTab] = useState(0);
    const [form, setForm] = useState<FormState>({
        title: "",
        description: "",
        assignedTo: "",
        priority: "Medium",
        startDate: "",
        endDate: "",
        clientName: "",
        address: "",
        expectedDuration: "",
        radius: "",
    });
    const [weeks, setWeeks] = useState<WeekDraft[]>([defaultWeek(1)]);

    const resetAll = useCallback(() => {
        setStep(1);
        setActiveWeekTab(0);
        setForm({
            title: "",
            description: "",
            assignedTo: "",
            priority: "Medium",
            startDate: "",
            endDate: "",
            clientName: "",
            address: "",
            expectedDuration: "",
            radius: "",
        });
        setWeeks([defaultWeek(1)]);
    }, []);

    useEffect(() => {
        if (!open) resetAll();
    }, [open, resetAll]);

    const validateStep = (s: number): string | null => {
        if (s === 1) {
            if (!form.title.trim()) return "Title is required";
            if (!form.assignedTo) return "Please assign an employee";
            if (!form.startDate || !form.endDate) return "Start and deadline are required";
            if (new Date(form.endDate) < new Date(form.startDate))
                return "Deadline must be after start date";
        }
        if (s === 2) {
            for (const w of weeks) {
                if (!w.startDate || !w.endDate)
                    return `Week ${w.weekNumber} needs start and end dates`;
            }
        }
        if (s === 3) {
            for (const w of weeks) {
                if (w.dailyTasks.length === 0)
                    return `Week ${w.weekNumber} has no daily tasks`;
                for (const d of w.dailyTasks) {
                    if (!d.title.trim())
                        return `Week ${w.weekNumber}: every daily task needs a title`;
                }
            }
        }
        return null;
    };

    const handleNext = () => {
        const err = validateStep(step);
        if (err) {
            toast.error(err);
            return;
        }
        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const taskRes = await fetch(`${API_BASE_URL}/api/tasks/admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim() || undefined,
                    assignedTo: form.assignedTo,
                    priority: form.priority,
                    startDate: new Date(form.startDate).toISOString(),
                    endDate: new Date(form.endDate).toISOString(),
                    clientName: form.clientName.trim() || undefined,
                    address: form.address.trim() || undefined,
                    expectedDuration: form.expectedDuration.trim() || undefined,
                    radius: form.radius.trim() ? Number(form.radius) : undefined,
                }),
            });
            if (!taskRes.ok) {
                throw new Error(await extractError(taskRes, "Failed to create project"));
            }
            const task = await taskRes.json();

            await Promise.all(
                weeks.map(async w => {
                    const wRes = await fetch(
                        `${API_BASE_URL}/api/tasks/admin/${task.id}/weeks`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                weekNumber: w.weekNumber,
                                startDate: new Date(w.startDate).toISOString(),
                                endDate: new Date(w.endDate).toISOString(),
                            }),
                        }
                    );
                    if (!wRes.ok) {
                        throw new Error(
                            await extractError(wRes, `Week ${w.weekNumber} failed`)
                        );
                    }
                    const week = await wRes.json();

                    await Promise.all(
                        w.dailyTasks.map(async d => {
                            const dRes = await fetch(
                                `${API_BASE_URL}/api/tasks/admin/weeks/${week.id}/daily`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    credentials: "include",
                                    body: JSON.stringify({
                                        dayName: d.dayName,
                                        title: d.title.trim(),
                                        description: d.description?.trim() || undefined,
                                    }),
                                }
                            );
                            if (!dRes.ok) {
                                throw new Error(
                                    await extractError(
                                        dRes,
                                        `Daily task in week ${w.weekNumber} failed`
                                    )
                                );
                            }
                        })
                    );
                })
            );

            toast.success("Project created successfully");
            onCreated();
            onClose();
        } catch (e: any) {
            console.error("[AdminTasks] create error:", e);
            toast.error(e?.message || "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    /* ---------- mutators ---------- */
    const addWeek = () =>
        setWeeks(prev => {
            const next = [...prev, defaultWeek(prev.length + 1)];
            setActiveWeekTab(next.length - 1);
            return next;
        });
    const removeWeek = (idx: number) =>
        setWeeks(prev => {
            const next = prev
                .filter((_, i) => i !== idx)
                .map((w, i) => ({ ...w, weekNumber: i + 1 }));
            setActiveWeekTab(Math.min(activeWeekTab, next.length - 1));
            return next;
        });
    const updateWeek = (idx: number, patch: Partial<WeekDraft>) =>
        setWeeks(prev => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
    const addDaily = (wi: number) =>
        setWeeks(prev =>
            prev.map((w, i) =>
                i === wi ? { ...w, dailyTasks: [...w.dailyTasks, defaultDay()] } : w
            )
        );
    const removeDaily = (wi: number, di: number) =>
        setWeeks(prev =>
            prev.map((w, i) =>
                i === wi
                    ? { ...w, dailyTasks: w.dailyTasks.filter((_, j) => j !== di) }
                    : w
            )
        );
    const updateDaily = (wi: number, di: number, patch: Partial<DailyDraft>) =>
        setWeeks(prev =>
            prev.map((w, i) =>
                i === wi
                    ? {
                          ...w,
                          dailyTasks: w.dailyTasks.map((d, j) =>
                              j === di ? { ...d, ...patch } : d
                          ),
                      }
                    : w
            )
        );

    const totalDailies = weeks.reduce((s, w) => s + w.dailyTasks.length, 0);

    return (
        <Dialog open={open} onOpenChange={v => !v && !submitting && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-sm">
                            <ClipboardList size={20} className="text-primary" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-foreground">
                                Create Project
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                                Step {step} of {STEPS.length} · {STEPS[step - 1].label}
                            </DialogDescription>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 pt-6">
                    <StepIndicator current={step} />
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Task / Title *
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e =>
                                        setForm(f => ({ ...f, title: e.target.value }))
                                    }
                                    className={inputCls}
                                    placeholder="e.g. AC Repair"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Client Name
                                </label>
                                <input
                                    type="text"
                                    value={form.clientName}
                                    onChange={e =>
                                        setForm(f => ({ ...f, clientName: e.target.value }))
                                    }
                                    className={inputCls}
                                    placeholder="e.g. Client A"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Expected Duration
                                </label>
                                <input
                                    type="text"
                                    value={form.expectedDuration}
                                    onChange={e =>
                                        setForm(f => ({
                                            ...f,
                                            expectedDuration: e.target.value,
                                        }))
                                    }
                                    className={inputCls}
                                    placeholder="e.g. 2 Hours"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={e =>
                                        setForm(f => ({ ...f, address: e.target.value }))
                                    }
                                    className={inputCls}
                                    placeholder="e.g. Andheri East, Mumbai"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Radius (meters)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.radius}
                                    onChange={e =>
                                        setForm(f => ({ ...f, radius: e.target.value }))
                                    }
                                    className={inputCls}
                                    placeholder="e.g. 500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Assign To *
                                </label>
                                <select
                                    value={form.assignedTo}
                                    onChange={e =>
                                        setForm(f => ({ ...f, assignedTo: e.target.value }))
                                    }
                                    className={inputCls}
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
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Priority
                                </label>
                                <select
                                    value={form.priority}
                                    onChange={e =>
                                        setForm(f => ({
                                            ...f,
                                            priority: e.target.value as Priority,
                                        }))
                                    }
                                    className={inputCls}
                                >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={e =>
                                        setForm(f => ({ ...f, startDate: e.target.value }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Deadline *
                                </label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={e =>
                                        setForm(f => ({ ...f, endDate: e.target.value }))
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={e =>
                                        setForm(f => ({ ...f, description: e.target.value }))
                                    }
                                    rows={3}
                                    className={inputCls}
                                    placeholder="Optional — what is the objective of this project?"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground font-medium">
                                    Break the project into weekly milestones.
                                </p>
                                <button
                                    type="button"
                                    onClick={addWeek}
                                    className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold px-4 py-2 rounded-sm shadow-sm shadow-primary/10 transition-all"
                                >
                                    <Plus className="h-4 w-4" /> Add Week
                                </button>
                            </div>

                            <div className="space-y-3">
                                {weeks.map((w, wi) => (
                                    <div
                                        key={wi}
                                        className="border border-border/40 rounded-md p-4 bg-secondary/10"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-6 bg-primary" />
                                                <h3 className="font-bold text-sm text-foreground">
                                                    Week {w.weekNumber}
                                                </h3>
                                            </div>
                                            {weeks.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeWeek(wi)}
                                                    className="p-1.5 hover:bg-destructive/10 rounded-sm transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                                    Start
                                                </label>
                                                <input
                                                    type="date"
                                                    value={w.startDate}
                                                    onChange={e =>
                                                        updateWeek(wi, {
                                                            startDate: e.target.value,
                                                        })
                                                    }
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                                    End
                                                </label>
                                                <input
                                                    type="date"
                                                    value={w.endDate}
                                                    onChange={e =>
                                                        updateWeek(wi, {
                                                            endDate: e.target.value,
                                                        })
                                                    }
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <p className="text-sm text-muted-foreground font-medium">
                                Add daily tasks for each week. {totalDailies} total task
                                {totalDailies !== 1 ? "s" : ""} so far.
                            </p>

                            {/* Week tab strip */}
                            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/40">
                                {weeks.map((w, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setActiveWeekTab(i)}
                                        className={cn(
                                            "px-4 py-2 rounded-sm text-xs font-bold whitespace-nowrap transition-all",
                                            activeWeekTab === i
                                                ? "bg-primary text-white shadow-sm"
                                                : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Week {w.weekNumber}
                                        <span className="ml-1.5 opacity-70">
                                            ({w.dailyTasks.length})
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Active week's daily tasks */}
                            {weeks[activeWeekTab] && (
                                <div className="space-y-2">
                                    {weeks[activeWeekTab].dailyTasks.map((d, di) => (
                                        <div
                                            key={di}
                                            className="grid grid-cols-12 gap-2 items-center bg-card border border-border/40 rounded-sm p-2.5"
                                        >
                                            <select
                                                value={d.dayName}
                                                onChange={e =>
                                                    updateDaily(activeWeekTab, di, {
                                                        dayName: e.target.value,
                                                    })
                                                }
                                                className="col-span-3 px-2 py-2 bg-secondary/30 border border-border/60 rounded-sm text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            >
                                                {DAY_NAMES.map(dn => (
                                                    <option key={dn}>{dn}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Task title"
                                                value={d.title}
                                                onChange={e =>
                                                    updateDaily(activeWeekTab, di, {
                                                        title: e.target.value,
                                                    })
                                                }
                                                className="col-span-4 px-3 py-2 bg-secondary/30 border border-border/60 rounded-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Description (optional)"
                                                value={d.description}
                                                onChange={e =>
                                                    updateDaily(activeWeekTab, di, {
                                                        description: e.target.value,
                                                    })
                                                }
                                                className="col-span-4 px-3 py-2 bg-secondary/30 border border-border/60 rounded-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeDaily(activeWeekTab, di)}
                                                disabled={
                                                    weeks[activeWeekTab].dailyTasks.length === 1
                                                }
                                                className="col-span-1 p-1.5 hover:bg-destructive/10 rounded-sm disabled:opacity-30 disabled:hover:bg-transparent justify-self-center transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addDaily(activeWeekTab)}
                                        className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1.5 mt-2"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add daily task
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={step === 1 ? onClose : handleBack}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border border-border/60 rounded-sm hover:bg-secondary/30 disabled:opacity-60 transition-colors"
                    >
                        {step === 1 ? (
                            <>
                                <X size={16} /> Cancel
                            </>
                        ) : (
                            <>
                                <ArrowLeft size={16} /> Back
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary hover:bg-primary/95 text-white rounded-sm shadow-lg shadow-primary/10 disabled:opacity-60 transition-all"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                            </>
                        ) : step === 3 ? (
                            <>
                                <Check size={16} /> Create Project
                            </>
                        ) : (
                            <>
                                Next <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ----------------------------- Main Page ----------------------------- */

const AdminTasks = () => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const [search, setSearch] = useState("");
    const [wizardOpen, setWizardOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [tasksRes, empRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/tasks/admin`, { credentials: "include" }),
                fetch(`${API_BASE_URL}/api/employees`, { credentials: "include" }),
            ]);
            if (tasksRes.ok) setTasks(await tasksRes.json());
            else toast.error(await extractError(tasksRes, "Failed to load tasks"));
            if (empRes.ok) {
                const emps = await empRes.json();
                setEmployees(
                    (Array.isArray(emps) ? emps : emps.employees || []).map((e: any) => ({
                        id: e.id,
                        name: e.name,
                        email: e.email,
                    }))
                );
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Realtime: any task event triggers a debounced refetch
    const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleRefetch = useCallback(() => {
        if (refetchTimer.current) clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => fetchAll(), 250);
    }, [fetchAll]);
    useTaskSocket(scheduleRefetch);

    useEffect(() => () => {
        if (refetchTimer.current) clearTimeout(refetchTimer.current);
    }, []);

    const toggleExpand = useCallback(
        (id: number) => setExpanded(p => ({ ...p, [id]: !p[id] })),
        []
    );

    const handleDelete = useCallback(
        async (id: number) => {
            const task = tasks.find(t => t.id === id);
            if (
                !window.confirm(
                    `Delete project "${task?.title ?? ""}"? This removes all its weeks and daily tasks and cannot be undone.`
                )
            )
                return;
            setDeletingId(id);
            try {
                const res = await fetch(`${API_BASE_URL}/api/tasks/admin/${id}`, {
                    method: "DELETE",
                    credentials: "include",
                });
                if (!res.ok) {
                    throw new Error(await extractError(res, "Failed to delete project"));
                }
                setTasks(prev => prev.filter(t => t.id !== id));
                toast.success("Project deleted");
            } catch (e: any) {
                console.error("[AdminTasks] delete error:", e);
                toast.error(e?.message || "Failed to delete project");
            } finally {
                setDeletingId(null);
            }
        },
        [tasks]
    );

    const employeeByEmail = useMemo(() => {
        const m = new Map<string, string>();
        employees.forEach(e => m.set(e.email, e.name));
        return m;
    }, [employees]);

    const filteredTasks = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return tasks;
        return tasks.filter(t => {
            const name = employeeByEmail.get(t.assignedTo) || "";
            return (
                t.title.toLowerCase().includes(q) ||
                t.assignedTo.toLowerCase().includes(q) ||
                name.toLowerCase().includes(q) ||
                (t.description || "").toLowerCase().includes(q)
            );
        });
    }, [tasks, search, employeeByEmail]);

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-none m-3 mx-auto overflow-x-hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-md">
                            <ClipboardList size={28} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Plan projects, schedule weekly milestones, and track daily progress.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setWizardOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-sm font-semibold text-sm shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all"
                    >
                        <Plus size={18} />
                        Create Project
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-md border border-border/50 shadow-sm">
                    <div className="text-sm font-semibold text-muted-foreground">
                        {tasks.length} project{tasks.length !== 1 ? "s" : ""}
                    </div>
                    <div className="relative w-full sm:w-80 group">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="Search by title or assignee..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-secondary/30 border border-border/60 rounded-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                {/* LIST */}
                {loading ? (
                    <div className="flex items-center justify-center py-16 bg-card rounded-md border border-border/50 shadow-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading projects…
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="bg-card rounded-md border border-border/50 shadow-sm p-16 text-center">
                        <div className="inline-flex p-4 bg-primary/10 rounded-md mb-4">
                            <ClipboardList size={32} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            {tasks.length === 0 ? "No projects yet" : "No matching projects"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {tasks.length === 0 ? (
                                <>
                                    Click <strong>Create Project</strong> to start assigning work.
                                </>
                            ) : (
                                "Try a different search term."
                            )}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                isOpen={!!expanded[task.id]}
                                onToggle={toggleExpand}
                                onDelete={handleDelete}
                                deleting={deletingId === task.id}
                                assigneeName={employeeByEmail.get(task.assignedTo)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateProjectWizard
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                employees={employees}
                onCreated={fetchAll}
            />
        </div>
    );
};

export default AdminTasks;
