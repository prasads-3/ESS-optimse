import { API_BASE_URL } from '@/config';
import React, { useState, useEffect, lazy, Suspense } from "react";
import {
    Download,
    Eye,
    ChevronRight,
    Search,
    FileText,
    Loader2,
    Users,
    DollarSign,
    Calendar,
    ArrowLeft,
    Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NoAccessBlock from "@/components/NoAccessBlock";

const GeneratePayslipModal = lazy(() => import("@/admin/GeneratePayslipModal"));

const Payroll = () => {
    const { user, hasFeature } = useAuth();

    if (!hasFeature("payslip")) {
        return <NoAccessBlock feature="Payroll" />;
    }
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

    const fetchGroupedPayroll = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/payroll/grouped`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            } else {
                toast.error("Failed to fetch payroll records");
            }
        } catch (error) {
            console.error("Error fetching grouped payroll:", error);
            toast.error("An error occurred while loading payroll");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupedPayroll();
    }, []);

    const filteredEmployees = employees.filter(
        (employee) =>
            (employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.employeeId?.toString().includes(searchQuery.toLowerCase())
    );

    const totalSlipsGenerated = employees.reduce((sum, e) => sum + (e.salarySlips?.length || 0), 0);
    const totalEmployeesCount = employees.length;

    return (
        <div className="flex-1 overflow-y-auto bg-[#f8f9fb] min-h-screen">
            <div className="max-w-full mx-auto px-6 py-8 space-y-6">

                {/* Header Section */}
                <div className="flex flex-col space-y-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest hover:translate-x-[-4px] transition-transform w-fit"
                    >
                        <ArrowLeft size={14} />
                        Back to Dashboard
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border/40">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground/90 tracking-tight">Admin Payroll Repository</h1>
                            <p className="text-sm text-muted-foreground mt-1 font-medium">Manage and view all employee payslips in one place</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative mb-3 sm:mb-0 sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Search employees..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <Button
                                onClick={() => setIsPayslipModalOpen(true)}
                                className="h-9 gap-2 bg-primary text-white hover:bg-primary/95"
                            >
                                <Upload size={14} />
                                Payroll Assets
                            </Button>
                        </div>
                    </div>



                    {/* Table */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                            <p className="text-sm text-slate-500 font-medium">Loading payroll records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-50 border-b border-zinc-200">
                                        <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center">Total Slips</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-right">Latest Net Pay</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-right w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((employee) => {
                                            const latestSlip = employee.salarySlips?.[0];
                                            return (
                                                <tr key={employee.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase border border-primary/5">
                                                                {employee.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900 leading-tight">{employee.name}</p>
                                                                <p className="text-[11px] text-slate-400 font-medium">ID: {employee.employeeId || employee.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-medium text-slate-700">{employee.department || "N/A"}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">{employee.title || "Employee"}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-zinc-100 text-zinc-700 text-xs font-bold border border-zinc-200">
                                                            {employee.salarySlips?.length || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {latestSlip ? (
                                                            <div>
                                                                <p className="text-sm font-bold text-emerald-600">₹{latestSlip.netPay.toLocaleString('en-IN')}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{latestSlip.month} {latestSlip.year}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-300 font-medium">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => navigate(`/admin/payroll-history/${employee.id}`)}
                                                            className="h-8 px-3 text-[11px] font-bold text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg gap-1.5 transition-all"
                                                        >
                                                            View History
                                                            <ChevronRight size={13} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <FileText size={48} className="text-slate-200" />
                                                    <p className="text-sm text-slate-400 font-medium">No payroll records found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer */}
                    {!isLoading && filteredEmployees.length > 0 && (
                        <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between rounded-b-xl">
                            <p className="text-[11px] text-slate-400 font-medium">
                                Showing <span className="font-bold text-slate-600">{filteredEmployees.length}</span> of{" "}
                                <span className="font-bold text-slate-600">{employees.length}</span> employees
                                {" · "}<span className="font-bold text-slate-600">{totalSlipsGenerated}</span> total payslips
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium hidden sm:block uppercase tracking-widest font-bold">
                                Miraki Labs Payroll
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {isPayslipModalOpen && (
                <Suspense fallback={null}>
                    <GeneratePayslipModal
                        isOpen={isPayslipModalOpen}
                        onClose={() => setIsPayslipModalOpen(false)}
                        onSuccess={fetchGroupedPayroll}
                    />
                </Suspense>
            )}
        </div>
    );
};

/* ────────── Sub-components ────────── */

function StatCard({
    icon,
    label,
    value,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    bg: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl", bg)}>{icon}</div>
            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-slate-900 leading-tight">{value}</p>
            </div>
        </div>
    );
}

export default Payroll;

