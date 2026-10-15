import { API_BASE_URL } from "@/config";
import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    CalendarDays,
    Loader2,
    Check,
    Info,
    AlertCircle,
} from "lucide-react";
import FileDropInput from "@/components/FileDropInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUserLayout } from "./UserLayoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { leaveDays } from "@/lib/leaveDays";
import { maxLeaveDaysInAnyMonth } from "@/lib/workdays";

interface ApplyLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LEAVE_TYPES = [
    { value: "Casual Leave", label: "Casual Leave", code: "CL" },
    { value: "Sick Leave", label: "Sick Leave", code: "SL" },
    { value: "Privilege Leave", label: "Privilege Leave", code: "PL" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
// Latest date a leave may START on: leave can only be applied for the leave day
// itself ("us din") or one day before ("ek din pehle") — i.e. today or tomorrow.
const maxStartStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
};

// Max leave days an employee may take in any single calendar month. Mirrors the
// backend rule in lib/leave.js (Sundays excluded) for immediate UX feedback.
const MONTHLY_LEAVE_LIMIT = 2;

const formatDate = (s: string) =>
    s ? new Date(s).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";

const ApplyLeaveModal = ({ isOpen, onClose }: ApplyLeaveModalProps) => {
    const { refreshDashboard } = useUserLayout();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [formData, setFormData] = useState({
        type: "Casual Leave",
        startDate: "",
        endDate: "",
        reason: "",
        document: "",
    });
    const [stats, setStats] = useState({ available: 0, total: 0 });

    useEffect(() => {
        if (isOpen && user?.id) {
            (async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/user/stats/${user.id}`, { credentials: "include" });
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.leaveStats) setStats(data.leaveStats);
                    }
                } catch (e) {
                    console.error(e);
                }
            })();
        }
    }, [isOpen, user?.id]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    const dayCount = useMemo(
        () => leaveDays(formData.startDate, formData.endDate),
        [formData.startDate, formData.endDate]
    );

    const exceedsBalance = dayCount > stats.available && stats.total > 0;
    const exceedsMonthlyLimit = useMemo(
        () => maxLeaveDaysInAnyMonth(formData.startDate, formData.endDate) > MONTHLY_LEAVE_LIMIT,
        [formData.startDate, formData.endDate],
    );
    const activeType = LEAVE_TYPES.find((t) => t.value === formData.type) ?? LEAVE_TYPES[0];

    const handleFile = (file: File | undefined) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            setFormData((f) => ({ ...f, document: (e.target?.result as string) || "" }));
            setFileName(file.name);
        };
        reader.readAsDataURL(file);
    };

    const clearFile = () => {
        setFormData((f) => ({ ...f, document: "" }));
        setFileName("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.startDate || !formData.endDate) {
            toast.error("Please select both start and end dates");
            return;
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            toast.error("End date cannot be before start date");
            return;
        }
        // Leave may only start today or tomorrow — no booking further ahead.
        if (formData.startDate < todayStr()) {
            toast.error("Start date cannot be in the past");
            return;
        }
        if (formData.startDate > maxStartStr()) {
            toast.error("You can only apply for leave starting today or tomorrow");
            return;
        }
        if (exceedsMonthlyLimit) {
            toast.error(`Only ${MONTHLY_LEAVE_LIMIT} leave days are allowed per month.`);
            return;
        }
        if (!user?.id) {
            toast.error("Authentication error. Please log in again.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/leaves`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, employeeId: user.id }),
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Leave application submitted");
                refreshDashboard();
                setFormData({ type: "Casual Leave", startDate: "", endDate: "", reason: "", document: "" });
                setFileName("");
                onClose();
            } else {
                toast.error(data.message || data.error || "Failed to submit application");
            }
        } catch (err) {
            console.error(err);
            toast.error("Could not connect to server");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <form
                onSubmit={handleSubmit}
                className="relative w-full max-w-3xl bg-card rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[92vh] border border-border"
            >
                {/* Header */}
                <div className="flex items-start justify-between px-7 py-5 border-b border-border">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-foreground">New Leave Request</h2>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded">DRAFT</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Submit a request for time off. Your manager will review and approve.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-secondary rounded-md transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Form */}
                        <div className="lg:col-span-7 p-7 space-y-6 lg:border-r lg:border-border">
                            {/* Type */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">Leave type</label>
                                    <span className="text-[11px] text-muted-foreground/70">Required</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {LEAVE_TYPES.map((t) => {
                                        const active = formData.type === t.value;
                                        return (
                                            <button
                                                type="button"
                                                key={t.value}
                                                onClick={() => setFormData({ ...formData, type: t.value })}
                                                className={cn(
                                                    "flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-md border text-left transition-all",
                                                    active
                                                        ? "border-emerald-700 bg-emerald-700 text-white"
                                                        : "border-border bg-card text-foreground hover:border-emerald-300 hover:bg-emerald-50/40"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={cn(
                                                        "text-[10px] font-bold w-9 h-6 flex items-center justify-center rounded border",
                                                        active ? "border-white/30 bg-card/10" : "border-border bg-secondary/50 text-muted-foreground"
                                                    )}>
                                                        {t.code}
                                                    </span>
                                                    <span className="text-sm font-medium truncate">{t.label}</span>
                                                </div>
                                                {active && <Check size={14} className="shrink-0" strokeWidth={2.5} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">Date range</label>
                                    {dayCount > 0 && (
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            {dayCount} {dayCount === 1 ? "day" : "days"}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            min={todayStr()}
                                            max={maxStartStr()}
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="peer w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground"
                                        />
                                        <span className="absolute -top-1.5 left-2.5 px-1 bg-card text-[10px] font-medium text-muted-foreground">Start date</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            required
                                            min={formData.startDate || todayStr()}
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="peer w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground"
                                        />
                                        <span className="absolute -top-1.5 left-2.5 px-1 bg-card text-[10px] font-medium text-muted-foreground">End date</span>
                                    </div>
                                </div>
                                {exceedsMonthlyLimit && (
                                    <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-md">
                                        <AlertCircle size={13} className="text-destructive mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-rose-800 leading-relaxed">
                                            Only {MONTHLY_LEAVE_LIMIT} leave days are allowed per month.
                                        </p>
                                    </div>
                                )}
                                {!exceedsMonthlyLimit && exceedsBalance && (
                                    <div className="flex items-start gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
                                        <AlertCircle size={13} className="text-warning mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-800 leading-relaxed">
                                            This request exceeds your available balance ({stats.available} {stats.available === 1 ? "day" : "days"}).
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Reason */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">Reason</label>
                                    <span className="text-[11px] text-muted-foreground/70">{formData.reason.length}/500</span>
                                </div>
                                <textarea
                                    rows={3}
                                    required
                                    maxLength={500}
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Provide context for your manager..."
                                    className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition resize-none text-foreground placeholder:text-muted-foreground/70"
                                />
                            </div>

                            {/* File */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-foreground">Attachment</label>
                                    <span className="text-[11px] text-muted-foreground/70">Optional</span>
                                </div>
                                <FileDropInput
                                    value={formData.document}
                                    fileName={fileName}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    title="Upload supporting document"
                                    hint="PDF, JPG or PNG · up to 5MB"
                                    onFile={(file) => handleFile(file)}
                                    onClear={clearFile}
                                />
                            </div>
                        </div>

                        {/* Sidebar — review panel */}
                        <div className="lg:col-span-5 bg-secondary/50/50 p-7 space-y-5">
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Request Summary</p>
                                <dl className="space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Type</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right">{activeType.label}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">Start</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right">{formatDate(formData.startDate)}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-xs text-muted-foreground">End</dt>
                                        <dd className="text-xs font-semibold text-foreground text-right">{formatDate(formData.endDate)}</dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4 pt-3 border-t border-border">
                                        <dt className="text-xs text-muted-foreground">Leave days <span className="text-muted-foreground/60">(excl. Sundays)</span></dt>
                                        <dd className="text-sm font-bold text-foreground text-right">
                                            {dayCount} {dayCount === 1 ? "day" : "days"}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="border-t border-border pt-5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leave Balance</p>
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="text-2xl font-semibold text-foreground tabular-nums">{stats.available}</span>
                                    <span className="text-xs text-muted-foreground">of {stats.total} days available</span>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-success rounded-full transition-all duration-500"
                                        style={{ width: `${stats.total ? Math.min(100, (stats.available / stats.total) * 100) : 0}%` }}
                                    />
                                </div>
                                {dayCount > 0 && !exceedsBalance && (
                                    <p className="text-[11px] text-muted-foreground mt-2">
                                        Remaining after this request: <span className="font-semibold text-foreground">{stats.available - dayCount} days</span>
                                    </p>
                                )}
                            </div>

                            <div className="border-t border-border pt-5">
                                <div className="flex items-start gap-2.5">
                                    <Info size={14} className="text-muted-foreground/70 mt-0.5 shrink-0" />
                                    <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1.5">
                                        <p>Leave can only start <span className="font-semibold text-foreground">today or tomorrow</span> — advance booking is not allowed.</p>
                                        <p>Casual leave requires <span className="font-semibold text-foreground">48 hours</span> notice.</p>
                                        <p>Sick leave over 2 days requires a <span className="font-semibold text-foreground">medical certificate</span>.</p>
                                        <p>Privilege leave requires <span className="font-semibold text-foreground">2 weeks</span> notice.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CalendarDays size={12} />
                        <span>Submitted requests cannot be edited.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-foreground rounded-md hover:bg-secondary transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || exceedsMonthlyLimit}
                            className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-700/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Submitting
                                </>
                            ) : (
                                "Submit request"
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ApplyLeaveModal;
