import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    X,
    FileText,
    CheckCircle2,
    ChevronDown,
    User,
    Banknote,
    Building2,
    IndianRupee,
    Hash,
    Save,
    Plus,
    Trash2,
    Calculator,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface GeneratePayslipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface LineItem {
    id: string;
    label: string;
    value: string;
    locked?: boolean; // label cannot be edited or removed
}

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

const departments = [
    "Developer", "Design", "Marketing", "Testing", "Operations", "Finance", "Sales",
];

const uid = () => Math.random().toString(36).slice(2, 9);

const defaultEarnings = (): LineItem[] => [
    { id: uid(), label: "Basic Salary", value: "", locked: true },
    { id: uid(), label: "HRA", value: "" },
    { id: uid(), label: "Transport Allowance", value: "" },
    { id: uid(), label: "Medical Allowance", value: "" },
    { id: uid(), label: "Other Allowance", value: "" },
];

const defaultDeductions = (): LineItem[] => [
    { id: uid(), label: "Provident Fund (PF)", value: "" },
    { id: uid(), label: "ESI Contribution", value: "" },
    { id: uid(), label: "Professional Tax", value: "" },
    { id: uid(), label: "Income Tax (TDS)", value: "" },
    { id: uid(), label: "Other Deductions", value: "" },
];

/* ── Field for employee details ── */
const Field = ({
    label, icon: Icon, placeholder, value, onChange, type = "text", required
}: {
    label: string;
    icon: React.ElementType;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-slate-600 tracking-wide">
            {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        <div className="relative">
            <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
                type={type}
                placeholder={placeholder ?? label}
                value={value}
                onChange={onChange}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
        </div>
    </div>
);

/* ── Dynamic line item row (label + amount + remove) ── */
const LineItemRow = ({
    item, onLabelChange, onValueChange, onRemove, accent
}: {
    item: LineItem;
    onLabelChange: (label: string) => void;
    onValueChange: (value: string) => void;
    onRemove?: () => void;
    accent: "emerald" | "rose";
}) => {
    const accentRing = accent === "emerald" ? "focus:ring-emerald-500/15 focus:border-emerald-500" : "focus:ring-rose-500/15 focus:border-rose-500";
    return (
        <div className="grid grid-cols-[1fr_110px_auto] sm:grid-cols-[1fr_140px_auto] gap-2 items-center group">
            <input
                type="text"
                value={item.label}
                onChange={(e) => onLabelChange(e.target.value)}
                disabled={item.locked}
                placeholder="Item name"
                className={`px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none ${accentRing} focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-600 disabled:font-semibold`}
            />
            <div className="relative">
                <IndianRupee size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.value}
                    onChange={(e) => onValueChange(e.target.value)}
                    className={`w-full pl-8 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 text-right tabular-nums focus:outline-none ${accentRing} focus:ring-2 transition-all`}
                />
            </div>
            {onRemove && !item.locked ? (
                <button
                    type="button"
                    onClick={onRemove}
                    title="Remove"
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                    <Trash2 size={14} />
                </button>
            ) : (
                <span className="w-[34px]" />
            )}
        </div>
    );
};

const GeneratePayslipModal = ({ isOpen, onClose, onSuccess }: GeneratePayslipModalProps) => {
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
    const currentYearStr = currentDate.getFullYear().toString();

    const [form, setForm] = useState({
        employeeId: "",
        employeeStrId: "",
        employeeName: "",
        department: "",
        designation: "",
        bankAccount: "",
        month: currentMonthName,
        year: currentYearStr,
        attendanceStatus: "present",
        deductionReason: "",
        insideTime: "0",
        outsideTime: "0",
        dailySalary: "",
    });

    const [earnings, setEarnings] = useState<LineItem[]>(defaultEarnings());
    const [deductions, setDeductions] = useState<LineItem[]>(defaultDeductions());

    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    const { hasFeature } = useAuth();

    useEffect(() => {
        if (isOpen) {
            const fetchEmployees = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/employees`, { credentials: 'include' });
                    if (response.ok) {
                        const data = await response.json();
                        setEmployees(data);
                    }
                } catch (error) {
                    console.error('Error fetching employees:', error);
                }
            };
            fetchEmployees();
        }
    }, [isOpen]);

    useEffect(() => {
        if (form.employeeStrId) {
            const foundEmp = employees.find(emp =>
                emp.employeeId?.toLowerCase() === form.employeeStrId.trim().toLowerCase() ||
                emp.id.toString() === form.employeeStrId.trim()
            );
            if (foundEmp) {
                setForm(prev => ({
                    ...prev,
                    employeeId: foundEmp.id.toString(),
                    employeeName: foundEmp.name || "",
                    designation: foundEmp.title || "",
                    department: foundEmp.department || "",
                    bankAccount: foundEmp.bankAccount || "",
                }));
            }
        }
    }, [form.employeeStrId, employees]);

    if (!isOpen) return null;

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    /* ── line item helpers ── */
    const updateItem = (
        list: LineItem[],
        setList: React.Dispatch<React.SetStateAction<LineItem[]>>,
        id: string,
        patch: Partial<LineItem>
    ) => setList(list.map(i => (i.id === id ? { ...i, ...patch } : i)));

    const addEarning = () =>
        setEarnings(prev => [...prev, { id: uid(), label: "", value: "" }]);
    const addDeduction = () =>
        setDeductions(prev => [...prev, { id: uid(), label: "", value: "" }]);

    const removeItem = (
        list: LineItem[],
        setList: React.Dispatch<React.SetStateAction<LineItem[]>>,
        id: string
    ) => setList(list.filter(i => i.id !== id));

    const num = (v: string) => parseFloat(v) || 0;
    const grossEarnings = earnings.reduce((s, i) => s + num(i.value), 0);
    const totalDeductions = deductions.reduce((s, i) => s + num(i.value), 0);
    const netPay = grossEarnings - totalDeductions;

    const basicSalaryValue = earnings.find(i => i.label.trim().toLowerCase() === "basic salary")?.value || "";

    const handleAutoCalculate = async () => {
        if (!form.employeeId || !basicSalaryValue) {
            toast.error("Please select an employee and enter Basic Salary first");
            return;
        }
        setIsCalculating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/payroll/calculate-deduction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: form.employeeId,
                    month: form.month,
                    year: form.year,
                    basicSalary: basicSalaryValue,
                    dailySalary: form.dailySalary || (parseFloat(basicSalaryValue) / 30).toString()
                }),
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                // Push into "Other Deductions" if present, else add a new row.
                const otherIdx = deductions.findIndex(i => i.label.trim().toLowerCase().startsWith("other"));
                if (otherIdx >= 0) {
                    const id = deductions[otherIdx].id;
                    updateItem(deductions, setDeductions, id, { value: data.deduction.toString() });
                } else {
                    setDeductions(prev => [...prev, { id: uid(), label: "Location Deduction", value: data.deduction.toString() }]);
                }
                setForm(prev => ({
                    ...prev,
                    attendanceStatus: data.attendance_status,
                    deductionReason: data.deduction_reason,
                    insideTime: data.inside_time.toString(),
                    outsideTime: data.outside_time.toString()
                }));
                toast.success(`Location deduction calculated: ₹${data.deduction}`);
            } else {
                toast.error("Failed to calculate deduction");
            }
        } catch (error) {
            console.error("Calculation error:", error);
            toast.error("Error connecting to calculation service");
        } finally {
            setIsCalculating(false);
        }
    };

    /* ── map dynamic items into legacy backend payload ── */
    const buildPayload = (dbEmployeeId: string) => {
        const map: Record<string, string> = {};
        const matchEarn: Record<string, string> = {
            "basic salary": "basicSalary",
            "hra": "hra",
            "transport allowance": "transportAllowance",
            "medical allowance": "medicalAllowance",
            "other allowance": "otherAllowance",
        };
        const matchDed: Record<string, string> = {
            "provident fund (pf)": "pf",
            "pf": "pf",
            "esi contribution": "esi",
            "esi": "esi",
            "professional tax": "professionalTax",
            "income tax (tds)": "incomeTax",
            "income tax": "incomeTax",
            "tds": "incomeTax",
            "other deductions": "otherDeduction",
            "other deduction": "otherDeduction",
        };
        let extraEarnings = 0;
        const customEarnings: { label: string; value: number }[] = [];
        earnings.forEach(i => {
            const key = matchEarn[i.label.trim().toLowerCase()];
            const v = num(i.value);
            if (key) {
                map[key] = (parseFloat(map[key] || "0") + v).toString();
            } else if (i.label.trim()) {
                extraEarnings += v;
                customEarnings.push({ label: i.label.trim(), value: v });
            }
        });
        if (extraEarnings) {
            map.otherAllowance = (parseFloat(map.otherAllowance || "0") + extraEarnings).toString();
        }
        let extraDeductions = 0;
        const customDeductions: { label: string; value: number }[] = [];
        deductions.forEach(i => {
            const key = matchDed[i.label.trim().toLowerCase()];
            const v = num(i.value);
            if (key) {
                map[key] = (parseFloat(map[key] || "0") + v).toString();
            } else if (i.label.trim()) {
                extraDeductions += v;
                customDeductions.push({ label: i.label.trim(), value: v });
            }
        });
        if (extraDeductions) {
            map.otherDeduction = (parseFloat(map.otherDeduction || "0") + extraDeductions).toString();
        }

        return {
            ...form,
            employeeId: dbEmployeeId,
            basicSalary: map.basicSalary || "",
            hra: map.hra || "",
            transportAllowance: map.transportAllowance || "",
            medicalAllowance: map.medicalAllowance || "",
            otherAllowance: map.otherAllowance || "",
            pf: map.pf || "",
            esi: map.esi || "",
            professionalTax: map.professionalTax || "",
            incomeTax: map.incomeTax || "",
            otherDeduction: map.otherDeduction || "",
            customEarnings,
            customDeductions,
            grossEarnings,
            totalDeductions,
            netPay,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || submitted) return;

        let dbEmployeeId = form.employeeId;
        if (!dbEmployeeId && form.employeeStrId) {
            const foundEmp = employees.find(emp =>
                emp.employeeId?.toLowerCase() === form.employeeStrId.trim().toLowerCase() ||
                emp.id.toString() === form.employeeStrId.trim()
            );
            if (foundEmp) dbEmployeeId = foundEmp.id.toString();
            else {
                toast.error(`Employee with ID "${form.employeeStrId}" not found in database.`);
                return;
            }
        }

        const missing: string[] = [];
        if (!dbEmployeeId) missing.push("Employee ID");
        if (!form.employeeName.trim()) missing.push("Employee Name");
        if (!form.department.trim()) missing.push("Department");
        if (!form.designation.trim()) missing.push("Designation");
        if (!form.month) missing.push("Month");
        if (!form.year) missing.push("Year");
        if (!basicSalaryValue || parseFloat(basicSalaryValue) <= 0) missing.push("Basic Salary");
        if (missing.length) {
            toast.error(`Please fill: ${missing.join(", ")}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/salary-slips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload(dbEmployeeId)),
                credentials: 'include'
            });
            if (response.ok) {
                toast.success("Salary slip generated successfully");
                setSubmitted(true);
                onSuccess?.();
                onClose();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("[Payslip] Server error:", response.status, errorData);
                const msg = errorData.details || errorData.message || errorData.error || `Server returned ${response.status}`;
                toast.error(msg);
            }
        } catch (error) {
            console.error('Error saving slip:', error);
            toast.error("Error connecting to server");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasPayslipFeature = () => hasFeature('payslip');

    const NoAccessView = () => (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border border-rose-100">
                <IndianRupee className="text-rose-500" size={36} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Access Restricted</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-3 leading-relaxed">
                Your current subscription plan doesn't include <strong>Payslip Management</strong>.
                Upgrade to enable generating and distributing payslips.
            </p>
            <div className="flex gap-3 mt-8">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200"
                >
                    Maybe Later
                </button>
                <button
                    onClick={() => window.location.href = '/admin/subscription'}
                    className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all"
                >
                    View Plans
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-5xl bg-slate-50 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                            <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight truncate">Generate Employee Payslip</h2>
                            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">Create a formal salary record for the selected pay period.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {!hasPayslipFeature() ? (
                        <NoAccessView />
                    ) : (
                        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
                            {/* Employee Details */}
                            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                <header className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                    <User size={14} className="text-slate-500" />
                                    <h3 className="text-sm font-semibold text-slate-800">Employee Information</h3>
                                </header>
                                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                                    <Field label="Employee ID" placeholder="e.g. ML109" icon={Hash} value={form.employeeStrId} onChange={set("employeeStrId")} required />
                                    <Field label="Employee Name" icon={User} value={form.employeeName} onChange={set("employeeName")} required />
                                    <Field label="Designation" icon={Building2} value={form.designation} onChange={set("designation")} required />
                                    <Field label="Bank Account" icon={Hash} value={form.bankAccount} onChange={set("bankAccount")} />

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-semibold text-slate-600 tracking-wide">
                                            Department<span className="text-rose-500 ml-0.5">*</span>
                                        </label>
                                        <div className="relative">
                                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <select
                                                value={form.department}
                                                onChange={set("department")}
                                                className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[11px] font-semibold text-slate-600 tracking-wide">
                                            Pay Period<span className="text-rose-500 ml-0.5">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <select
                                                    value={form.month}
                                                    onChange={set("month")}
                                                    className="w-full appearance-none pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                                >
                                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                            <div className="relative w-24">
                                                <select
                                                    value={form.year}
                                                    onChange={set("year")}
                                                    className="w-full appearance-none pl-3 pr-7 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                                                >
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Earnings + Deductions */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                                {/* Earnings */}
                                <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <header className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-emerald-50/40 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-emerald-600" />
                                            <h3 className="text-sm font-semibold text-slate-800">Earnings</h3>
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500">{earnings.length} item{earnings.length !== 1 ? "s" : ""}</span>
                                    </header>
                                    <div className="p-4 sm:p-5 space-y-2.5">
                                        <div className="grid grid-cols-[1fr_110px_auto] sm:grid-cols-[1fr_140px_auto] gap-2 px-1 pb-1">
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Amount</span>
                                            <span className="w-[34px]" />
                                        </div>
                                        {earnings.map(item => (
                                            <LineItemRow
                                                key={item.id}
                                                item={item}
                                                accent="emerald"
                                                onLabelChange={(label) => updateItem(earnings, setEarnings, item.id, { label })}
                                                onValueChange={(value) => updateItem(earnings, setEarnings, item.id, { value })}
                                                onRemove={() => removeItem(earnings, setEarnings, item.id)}
                                            />
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addEarning}
                                            className="w-full mt-2 px-3 py-2 border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Plus size={14} /> Add Earning
                                        </button>
                                        <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-600">Gross Earnings</span>
                                            <span className="text-base font-semibold text-emerald-600 tabular-nums">
                                                ₹ {grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* Deductions */}
                                <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                    <header className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-rose-50/40 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown size={14} className="text-rose-600" />
                                            <h3 className="text-sm font-semibold text-slate-800">Deductions</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAutoCalculate}
                                            disabled={isCalculating}
                                            className="text-[11px] font-semibold text-primary hover:bg-primary/5 px-2 py-1 rounded-md flex items-center gap-1 transition-all disabled:opacity-60"
                                        >
                                            <Calculator size={12} />
                                            {isCalculating ? "Calculating..." : "Auto-Calculate Location"}
                                        </button>
                                    </header>
                                    <div className="p-4 sm:p-5 space-y-2.5">
                                        <div className="grid grid-cols-[1fr_110px_auto] sm:grid-cols-[1fr_140px_auto] gap-2 px-1 pb-1">
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Description</span>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-right">Amount</span>
                                            <span className="w-[34px]" />
                                        </div>
                                        {deductions.map(item => (
                                            <LineItemRow
                                                key={item.id}
                                                item={item}
                                                accent="rose"
                                                onLabelChange={(label) => updateItem(deductions, setDeductions, item.id, { label })}
                                                onValueChange={(value) => updateItem(deductions, setDeductions, item.id, { value })}
                                                onRemove={() => removeItem(deductions, setDeductions, item.id)}
                                            />
                                        ))}
                                        {form.deductionReason && (
                                            <p className="text-[11px] text-rose-600 font-medium px-1 py-1.5 bg-rose-50 rounded-md border border-rose-100">
                                                {form.deductionReason} (Status: {form.attendanceStatus})
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={addDeduction}
                                            className="w-full mt-2 px-3 py-2 border border-dashed border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                                        >
                                            <Plus size={14} /> Add Deduction
                                        </button>
                                        <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-600">Total Deductions</span>
                                            <span className="text-base font-semibold text-rose-600 tabular-nums">
                                                ₹ {totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Net Pay Summary */}
                            <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 sm:p-6 text-white shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-lg shrink-0">
                                            <Banknote size={22} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">Net Take-Home Pay</p>
                                            <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums mt-0.5">
                                                ₹ {netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 sm:text-right text-xs">
                                        <div>
                                            <p className="text-white/50 font-medium uppercase tracking-wider text-[10px]">Gross</p>
                                            <p className="text-emerald-300 font-semibold tabular-nums mt-0.5">
                                                ₹ {grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 font-medium uppercase tracking-wider text-[10px]">Deductions</p>
                                            <p className="text-rose-300 font-semibold tabular-nums mt-0.5">
                                                ₹ {totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </form>
                    )}
                </div>

                {/* Footer */}
                {hasPayslipFeature() && (
                    <div className="bg-white border-t border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitted || isSubmitting}
                            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitted ? (
                                <>
                                    <CheckCircle2 size={16} />
                                    Generated
                                </>
                            ) : isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Generate Payslip
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeneratePayslipModal;
