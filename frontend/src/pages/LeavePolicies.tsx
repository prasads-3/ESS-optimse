import React from "react";
import {
    ShieldCheck,
    Info,
    Calendar,
    Clock,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Download,
    BookOpen,
    UserCheck,
    History
} from "lucide-react";
import { cn } from "@/lib/utils";

const LeavePolicies = () => {
    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-none m-3 mx-auto overflow-x-hidden">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <BookOpen size={28} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Company Leave Policies</h1>
                            <p className="text-sm text-muted-foreground mt-1">Version 2024.1 • Effective from Jan 01, 2024</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-card border border-border rounded-xl font-semibold text-sm hover:bg-secondary transition-all shadow-sm">
                        <Download size={18} className="text-primary" />
                        Download full PDF
                    </button>
                </div>

                {/* Section 1: Policy Overview */}
                <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-r from-white to-primary/[0.01]">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <h2 className="text-lg font-bold flex items-center justify-center md:justify-start gap-2">
                            <Info size={20} className="text-primary" />
                            Policy Applicability
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            This policy applies to all full-time regular employees of Miraki Labs globally. It outlines the entitlements, accrual rules, and procedures for taking time off from work to ensure a healthy work-life balance and operational consistency.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 shrink-0 w-full md:w-auto">
                        <OverviewItem label="Probation Period" value="3 Months" />
                        <OverviewItem label="Leave Cycle" value="Jan - Dec" />
                        <OverviewItem label="Max Carry Forward" value="30 Days" />
                        <OverviewItem label="Encashment" value="Available (PL)" />
                    </div>
                </div>

                {/* Section 2: Leave Types & Detailed Rules */}
                <section className="space-y-6">
                    <h2 className="text-lg font-bold text-foreground/80 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        Leave Entitlements & Accrual Rules
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PolicyCard
                            type="Casual Leave (CL)"
                            entitlement="12 Days"
                            accrual="1.0 Day per month"
                            carryForward="No"
                            encashment="No"
                            desc="Intended for short-term personal needs or sudden emergencies."
                            icon={UserCheck}
                            color="text-primary"
                            bg="bg-primary/10"
                        />
                        <PolicyCard
                            type="Sick Leave (SL)"
                            entitlement="10 Days"
                            accrual="Lump sum at start of year"
                            carryForward="Yes (up to 20 days)"
                            encashment="No"
                            desc="For medical absences. Medical certificate required for > 2 days."
                            icon={AlertTriangle}
                            color="text-accent"
                            bg="bg-accent/10"
                        />
                        <PolicyCard
                            type="Privilege Leave (PL)"
                            entitlement="18 Days"
                            accrual="1.5 Days per month"
                            carryForward="Yes (up to 45 days)"
                            encashment="Yes (Year-end)"
                            desc="Planned long-term breaks. Requires 15 days prior notice."
                            icon={BookOpen}
                            color="text-success"
                            bg="bg-success/10"
                        />
                    </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="xl:col-span-2 space-y-8">

                        {/* Eligibility & Application Rules */}
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-border/50 bg-gray-50/50">
                                <h3 className="font-semibold text-sm text-muted-foreground">Application & documentation</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-success" />
                                        General Rules
                                    </h4>
                                    <ul className="space-y-3">
                                        <RuleItem text="All leaves must be applied via the ESS Portal." />
                                        <RuleItem text="PL requires manager approval at least 2 weeks in advance." />
                                        <RuleItem text="Half-day leaves are available for CL and SL." />
                                        <RuleItem text="Unauthorized absence for >3 days leads to disciplinary action." />
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <FileText size={16} className="text-primary" />
                                        Required Proofs
                                    </h4>
                                    <ul className="space-y-3">
                                        <RuleItem text="SL > 2 days: Valid Doctor's Medical Certificate." />
                                        <RuleItem text="Maternity Leave: Hospital confirmation documents." />
                                        <RuleItem text="Bereavement Leave: Proof of relationship/occurrence." />
                                        <RuleItem text="Jury Duty: Official summons copy." />
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Approval Hierarchy */}
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
                            <h3 className="font-semibold text-sm text-muted-foreground mb-6">Approval workflow & hierarchy</h3>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-8 relative">
                                {/* Visual connectors for desktop */}
                                <div className="hidden md:block absolute left-[25%] right-[25%] top-1/2 h-px bg-dashed border-t border-dashed border-border/60 -z-10" />

                                <WorkflowStep label="Employee" sub="Applies for leave" icon={UserCheck} active />
                                <WorkflowStep label="Reporting Manager" sub="First Level Approval" icon={ShieldCheck} active />
                                <WorkflowStep label="HR Admin" sub="Compliance Review" icon={ShieldCheck} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column Compliance Info */}
                    <div className="space-y-8">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-6">
                            <h3 className="font-semibold text-sm text-muted-foreground">Time & calendar calculation</h3>
                            <div className="space-y-4">
                                <CalculationCard
                                    title="Weekend Policy"
                                    desc="Saturdays and Sundays are weekly offs. If a holiday falls on a weekend, no compensatory off is provided unless specified."
                                />
                                <CalculationCard
                                    title="Holiday Interleaving"
                                    desc="If a public holiday falls within a leave period, it is not counted as a leave day (applicable for CL/PL only)."
                                />
                                <CalculationCard
                                    title="Probation Restrictions"
                                    desc="During probation, only SL is accrued. PL can be availed only after successful completion of probation (3 months)."
                                />
                            </div>
                        </div>

                        <div className="bg-primary/5 rounded-2xl border border-primary/10 p-6 space-y-4">
                            <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                                <History size={16} />
                                Year-End Rules
                            </h3>
                            <div className="bg-white/80 p-4 rounded-xl border border-primary/5 shadow-sm">
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    The leave year follows the <span className="font-bold text-foreground">Calendar Year (Jan to Dec)</span>. All unutilized Casual Leaves expire on Dec 31st. Privilege Leaves up to 30 days can be carried forward to the next year automatically.
                                </p>
                            </div>
                            <button className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20 mt-2">
                                I acknowledge policy
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

/* Sub-components */

const OverviewItem = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-white p-3 rounded-xl border border-border/40 shadow-sm text-center">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
);

const PolicyCard = ({ type, entitlement, accrual, carryForward, encashment, desc, icon: Icon, color, bg }: any) => (
    <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:border-primary/30 transition-all group">
        <div className="flex items-center gap-4 mb-4">
            <div className={cn("p-3 rounded-xl group-hover:scale-110 transition-transform", bg)}>
                <Icon size={20} className={color} />
            </div>
            <h3 className="text-lg font-bold">{type}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-6 italic">"{desc}"</p>
        <div className="grid grid-cols-2 gap-y-4 text-xs font-medium">
            <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Entitlement</p>
                <p className="font-semibold text-foreground">{entitlement}</p>
            </div>
            <div className="space-y-1 text-right md:text-left">
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Accrual pattern</p>
                <p className="font-semibold text-foreground">{accrual}</p>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Carry forward</p>
                <p className={cn("font-semibold", carryForward.includes('Yes') ? "text-success" : "text-destructive")}>{carryForward}</p>
            </div>
            <div className="space-y-1 text-right md:text-left">
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Encashment</p>
                <p className={cn("font-semibold", encashment.includes('Yes') ? "text-success" : "text-destructive")}>{encashment}</p>
            </div>
        </div>
    </div>
);

const RuleItem = ({ text }: { text: string }) => (
    <li className="flex items-start gap-3">
        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        <span className="text-xs text-muted-foreground font-medium leading-relaxed">{text}</span>
    </li>
);

const WorkflowStep = ({ label, sub, icon: Icon, active }: any) => (
    <div className="flex flex-col items-center text-center gap-3 relative bg-card px-4">
        <div className={cn(
            "p-4 rounded-full border-2 transition-all",
            active ? "bg-primary/5 border-primary shadow-lg shadow-primary/10" : "bg-secondary border-border"
        )}>
            <Icon size={24} className={active ? "text-primary" : "text-muted-foreground"} />
        </div>
        <div>
            <p className="text-sm font-bold text-foreground leading-tight">{label}</p>
            <p className="text-[10px] font-medium text-muted-foreground">{sub}</p>
        </div>
    </div>
);

const CalculationCard = ({ title, desc }: { title: string; desc: string }) => (
    <div className="space-y-1.5 p-3 rounded-xl border border-border/30 bg-muted/5 group hover:bg-secondary/30 transition-colors">
        <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
);

export default LeavePolicies;
