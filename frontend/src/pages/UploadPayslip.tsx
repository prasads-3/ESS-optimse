import { API_BASE_URL } from '@/config';
import React, { useState, useRef, useEffect } from "react";
import {
    Upload,
    FileText,
    CheckCircle2,
    ChevronDown,
    User,
    Calendar,
    Banknote,
    Building2,
    IndianRupee,
    Hash,
    Printer,
    Save,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import NoAccessBlock from '@/components/NoAccessBlock';

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const years = ["2025", "2024", "2023", "2022"];

const departments = [
    "Engineering", "Design", "Marketing", "HR", "Operations", "Finance", "Sales",
];

const UploadPayslip = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── form state ── */
    const [form, setForm] = useState({
        employeeId: "",
        employeeName: "",
        department: "",
        designation: "",
        month: "October",
        year: "2025",
        // Earnings
        basicSalary: "",
        hra: "",
        transportAllowance: "",
        medicalAllowance: "",
        otherAllowance: "",
        // Deductions
        pf: "",
        esi: "",
        professionalTax: "",
        incomeTax: "",
        otherDeduction: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    /* ── calculated totals ── */
    const num = (v: string) => parseFloat(v) || 0;
    const grossEarnings =
        num(form.basicSalary) + num(form.hra) + num(form.transportAllowance) +
        num(form.medicalAllowance) + num(form.otherAllowance);
    const totalDeductions =
        num(form.pf) + num(form.esi) + num(form.professionalTax) +
        num(form.incomeTax) + num(form.otherDeduction);
    const netPay = grossEarnings - totalDeductions;

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
    };
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/salary-slips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    grossEarnings,
                    totalDeductions,
                    netPay
                }),
                credentials: 'include'
            });

            if (response.ok) {
                toast.success("Salary slip saved successfully");
                setSubmitted(true);
                setTimeout(() => setSubmitted(false), 3000);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || errorData.error || "Failed to save salary slip");
            }
        } catch (error) {
            console.error('Error saving slip:', error);
            toast.error("Error connecting to server");
        }
    };

    /* ── reusable input ── */
    const Field = ({
        label, icon: Icon, placeholder, value, onChange, type = "text", col = false
    }: {
        label: string;
        icon: React.ElementType;
        placeholder?: string;
        value: string;
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        type?: string;
        col?: boolean;
    }) => (
        <div className={cn("flex flex-col gap-1.5", col && "col-span-2")}>
            <label className="text-[11px] font-semibold text-muted-foreground pl-1">{label}</label>
            <div className="relative">
                <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <input
                    type={type}
                    placeholder={placeholder ?? label}
                    value={value}
                    onChange={onChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-secondary/40 border border-border/60 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
            </div>
        </div>
    );

    const RupeeField = ({
        label, value, onChange
    }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground pl-1">{label}</label>
            <div className="relative">
                <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={value}
                    onChange={onChange}
                    className="w-full pl-9 pr-4 py-2.5 bg-secondary/40 border border-border/60 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                />
            </div>
        </div>
    );

    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/employees`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setEmployees(data);
                }
            } catch (error) {
                console.error('Error fetching employees:', error);
            }
        };
        fetchEmployees();
    }, []);

    const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const empId = e.target.value;
        const emp = employees.find(emp => emp.id.toString() === empId);
        if (emp) {
            setForm(prev => ({
                ...prev,
                employeeId: empId,
                employeeName: emp.name,
                designation: emp.title || "",
                department: emp.department || prev.department
            }));
        } else {
            setForm(prev => ({ ...prev, employeeId: empId }));
        }
    };


    const { user, hasFeature } = useAuth();

    if (!hasFeature("payslip")) {
        return <NoAccessBlock feature="Payslip" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background">
            <form onSubmit={handleSubmit}>
                <div className="p-4 md:p-6 lg:p-8 max-w-none m-5 space-y-6 overflow-x-hidden">

                    {/* ── Page Header ── */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-5">
                        <div>
                            <h1 className="text-3xl font-semibold text-foreground tracking-tight">Generate payslip</h1>
                            <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Fill in employee and salary details to create a payslip</p>
                        </div>

                    </div>

                    {/* ── Employee Information ── */}
                    <section className="bg-card rounded-xl border border-border/60 shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <User size={15} className="text-primary" />
                            <h2 className="text-xs font-semibold text-foreground/80">Employee information</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Employee Selection */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground pl-1">Select Employee</label>
                                <div className="relative">
                                    <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                    <select
                                        value={form.employeeId}
                                        onChange={handleEmployeeSelect}
                                        className="w-full appearance-none pl-9 pr-8 py-2.5 bg-secondary/40 border border-border/60 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                </div>
                            </div>

                            <Field label="Employee name" icon={User} placeholder="Full name" value={form.employeeName} onChange={set("employeeName")} />
                            <Field label="Designation" icon={Building2} placeholder="e.g. Software Engineer" value={form.designation} onChange={set("designation")} />

                            {/* Department dropdown */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground pl-1">Department</label>
                                <div className="relative">
                                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                    <select
                                        value={form.department}
                                        onChange={set("department")}
                                        className="w-full appearance-none pl-9 pr-8 py-2.5 bg-secondary/40 border border-border/60 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                    >
                                        <option value="">Select department</option>
                                        {departments.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                </div>
                            </div>

                            {/* Pay period */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-semibold text-muted-foreground pl-1">Pay period</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                        <select
                                            value={form.month}
                                            onChange={set("month")}
                                            className="w-full appearance-none pl-8 pr-6 py-2.5 bg-secondary/40 border border-border/60 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                        >
                                            {months.map(m => <option key={m}>{m}</option>)}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                    </div>
                                    <div className="relative w-24">
                                        <select
                                            value={form.year}
                                            onChange={set("year")}
                                            className="w-full appearance-none pl-3 pr-6 py-2.5 bg-secondary/40 border border-border/60 rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                        >
                                            {years.map(y => <option key={y}>{y}</option>)}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Earnings & Deductions ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Earnings */}
                        <section className="bg-card rounded-xl border border-border/60 shadow-sm p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <IndianRupee size={15} className="text-primary" />
                                <h2 className="text-xs font-semibold text-foreground/80">Earnings</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <RupeeField label="Basic salary" value={form.basicSalary} onChange={set("basicSalary")} />
                                <RupeeField label="HRA (House rent allowance)" value={form.hra} onChange={set("hra")} />
                                <RupeeField label="Transport allowance" value={form.transportAllowance} onChange={set("transportAllowance")} />
                                <RupeeField label="Medical allowance" value={form.medicalAllowance} onChange={set("medicalAllowance")} />
                                <RupeeField label="Other allowances" value={form.otherAllowance} onChange={set("otherAllowance")} />
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-border/60">
                                <span className="text-xs font-semibold text-muted-foreground">Gross earnings</span>
                                <span className="text-sm font-semibold text-primary">
                                    ₹ {grossEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </section>

                        {/* Deductions */}
                        <section className="bg-card rounded-xl border border-border/60 shadow-sm p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Banknote size={15} className="text-destructive" />
                                <h2 className="text-xs font-semibold text-foreground/80">Deductions</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <RupeeField label="Provident fund (PF)" value={form.pf} onChange={set("pf")} />
                                <RupeeField label="ESI contribution" value={form.esi} onChange={set("esi")} />
                                <RupeeField label="Professional tax" value={form.professionalTax} onChange={set("professionalTax")} />
                                <RupeeField label="Income tax (TDS)" value={form.incomeTax} onChange={set("incomeTax")} />
                                <RupeeField label="Other deductions" value={form.otherDeduction} onChange={set("otherDeduction")} />
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-border/60">
                                <span className="text-xs font-semibold text-muted-foreground">Total deductions</span>
                                <span className="text-sm font-semibold text-destructive">
                                    ₹ {totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </section>
                    </div>

                    {/* ── Net Pay Summary ── */}
                    <section className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground">Net pay (take-home)</p>
                            <p className="text-2xl font-bold text-primary mt-0.5">
                                ₹ {netPay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </p>
                            {form.employeeName && (
                                <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                                    For {form.employeeName} · {form.month} {form.year}
                                    {form.employeeId && <> · <span className="font-semibold">{form.employeeId}</span></>}
                                </p>
                            )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground space-y-0.5">
                            <p>Gross: <span className="font-semibold text-foreground">₹ {grossEarnings.toLocaleString("en-IN")}</span></p>
                            <p>Deductions: <span className="font-semibold text-destructive">₹ {totalDeductions.toLocaleString("en-IN")}</span></p>
                        </div>
                    </section>



                    {/* ── Footer Actions ── */}
                    <div className="flex justify-end gap-3 pb-4">
                        <button
                            type="button"
                            onClick={() => setForm({
                                employeeId: "", employeeName: "", department: "", designation: "",
                                month: "October", year: "2025",
                                basicSalary: "", hra: "", transportAllowance: "", medicalAllowance: "", otherAllowance: "",
                                pf: "", esi: "", professionalTax: "", incomeTax: "", otherDeduction: "",
                            })}
                            className="px-5 py-2.5 text-xs font-semibold text-muted-foreground bg-secondary border border-border/60 rounded-lg hover:bg-secondary/70 transition-all"
                        >
                            Clear form
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                        >
                            {submitted ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save payslip</>}
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
};

export default UploadPayslip;

