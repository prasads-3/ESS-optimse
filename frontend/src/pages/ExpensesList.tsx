import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Receipt,
    Search,
    Download,
    Eye,
    Calendar,
    ChevronRight,
    User,
    Loader2,
    Wallet,
    SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import ExpenseLimitsPanel from "@/components/ExpenseLimitsPanel";
import FundRequestsPanel from "@/components/FundRequestsPanel";

const ExpensesList = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"expenses" | "limits" | "fundrequests">("expenses");
    const [searchQuery, setSearchQuery] = useState("");
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isFirstLoad = true;
        const fetchGroupedExpenses = async () => {
            try {
                if (isFirstLoad) setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/admin/expenses/grouped`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setEmployees(data);
                }
            } catch (error) {
                console.error("Error fetching grouped expenses:", error);
                if (isFirstLoad) toast.error("Failed to load expense records");
            } finally {
                if (isFirstLoad) {
                    setIsLoading(false);
                    isFirstLoad = false;
                }
            }
        };

        fetchGroupedExpenses();
        const interval = setInterval(fetchGroupedExpenses, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const filteredEmployees = employees.filter(emp =>
        (emp?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp?.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exportToExcel = async () => {
        if (filteredEmployees.length === 0) {
            toast.error("No expense records to export");
            return;
        }
        const XLSX = await import('xlsx');
        const workbook = XLSX.utils.book_new();

        // Sheet 1 — per-employee summary
        const summary = filteredEmployees.map((emp: any) => {
            const totalAmount = emp.expenses.reduce((acc: number, e: any) => acc + (e.totalAmount || 0), 0);
            return {
                "Employee": emp.name,
                "Role": emp.role,
                "Total Claims": emp.expenses.length,
                "Total Amount (₹)": totalAmount,
                "Last Claim": emp.expenses[0]?.claimDate ? new Date(emp.expenses[0].claimDate).toLocaleDateString() : 'N/A',
            };
        });
        const summarySheet = XLSX.utils.json_to_sheet(summary, {
            header: ["Employee", "Role", "Total Claims", "Total Amount (₹)", "Last Claim"],
        });
        summarySheet['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

        // Sheet 2 — one row per individual claim
        const detailed = filteredEmployees.flatMap((emp: any) =>
            emp.expenses.map((e: any) => ({
                "Employee": emp.name,
                "Role": emp.role,
                "Claim Date": e.claimDate ? new Date(e.claimDate).toLocaleDateString() : 'N/A',
                "Amount (₹)": e.totalAmount || 0,
                "Status": e.status || 'Pending',
            }))
        );
        const detailedSheet = XLSX.utils.json_to_sheet(detailed, {
            header: ["Employee", "Role", "Claim Date", "Amount (₹)", "Status"],
        });
        detailedSheet['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, detailedSheet, "All Claims");

        XLSX.writeFile(workbook, `Expense_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Expense report exported");
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/30 scroll-smooth p-6 font-sans">
            <div className="max-w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header Section */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur-2xl opacity-0 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2 font-sans">
                                Expenses Management
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1 font-sans">Review and track expense claims from across the organization.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {activeTab === "expenses" && (
                                <Button
                                    onClick={exportToExcel}
                                    disabled={isLoading || filteredEmployees.length === 0}
                                    className="h-11 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200/50 font-bold text-xs px-8 uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={16} />
                                    Export Report
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200">
                    {([
                        { key: "expenses", label: "Expenses", Icon: Receipt },
                        { key: "limits", label: "Expense Limits", Icon: SlidersHorizontal },
                        { key: "fundrequests", label: "Fund Requests", Icon: Wallet },
                    ] as const).map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                                activeTab === key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-slate-400 hover:text-slate-700"
                            )}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === "limits" && <ExpenseLimitsPanel />}

                {activeTab === "fundrequests" && <FundRequestsPanel />}

                {activeTab === "expenses" && (
                <>
                {/* Search */}
                <div className="flex flex-col lg:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by employee name or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 placeholder:text-slate-400 shadow-sm"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground font-medium">Loading records...</p>
                    </div>
                ) : (
                    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Claims</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Claim</th>
                                        <th className="px-6 py-4 text-[10px) font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredEmployees.map((emp) => {
                                        const totalAmount = emp.expenses.reduce((acc: number, e: any) => acc + e.totalAmount, 0);
                                        const lastDate = emp.expenses[0]?.claimDate;

                                        return (
                                            <tr
                                                key={emp.id}
                                                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/admin/expense-history/${emp.id}`)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <EmployeeAvatar
                                                                name={emp.name}
                                                                photo={emp.photo}
                                                                size="md"
                                                                className="rounded-xl border border-border"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">{emp.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{emp.role}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-slate-600">{emp.expenses.length} Records</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <span className="text-sm font-extrabold text-slate-900">₹{totalAmount.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Calendar size={12} />
                                                        <span className="text-xs font-medium">{lastDate ? new Date(lastDate).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-2 text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-primary/5 rounded-xl"
                                                    >
                                                        View History
                                                        <ChevronRight size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredEmployees.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4">
                                                    <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                                                        <Receipt size={40} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-base font-bold text-slate-900">No expense records</h3>
                                                        <p className="text-xs text-slate-500 font-medium max-w-[240px] mx-auto">No employees have submitted expense claims yet.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
                </>
                )}
            </div>
        </div>
    );
};

export default ExpensesList;

