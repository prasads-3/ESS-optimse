import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Search,
    ChevronRight,
    Loader2,
    ClipboardList,
    PlusCircle,
    CalendarDays,
    Users,
    Clock,
    CheckCircle,
    ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmployeeAvatar from "@/components/EmployeeAvatar";

type Tab = "list" | "apply";

const statusConfig: Record<string, { label: string; className: string }> = {
    Pending: { label: "Pending", className: "bg-amber-50 text-amber-600 border-amber-200" },
    Approved: { label: "Approved", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    Rejected: { label: "Rejected", className: "bg-red-50 text-red-600 border-red-200" },
};

const LeaveList = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<Tab>("list");
    const [searchQuery, setSearchQueryState] = useState(searchParams.get("q") || "");

    useEffect(() => {
        setSearchQueryState(searchParams.get("q") || "");
    }, [searchParams]);

    const setSearchQuery = (value: string) => {
        setSearchQueryState(value);
        const next = new URLSearchParams(searchParams);
        if (value) next.set("q", value);
        else next.delete("q");
        setSearchParams(next, { replace: true });
    };
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchGroupedLeaves = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/leaves/grouped`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error("Error fetching grouped leaves:", error);
            toast.error("Failed to load leave records");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupedLeaves();
    }, []);

    const filteredEmployees = employees.filter(
        (employee) =>
            (employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.leaves.some(
                (leave: any) =>
                    leave.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    leave.reason?.toLowerCase().includes(searchQuery.toLowerCase())
            )
    );

    const totalLeaves = employees.reduce((sum, e) => sum + e.leaves.length, 0);
    const totalPending = employees.reduce(
        (sum, e) => sum + e.leaves.filter((l: any) => l.status === "Pending").length,
        0
    );
    const totalApproved = employees.reduce(
        (sum, e) => sum + e.leaves.filter((l: any) => l.status === "Approved").length,
        0
    );

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
                            <h1 className="text-3xl font-bold text-foreground/90 tracking-tight">Leave Management</h1>
                            <p className="text-sm text-muted-foreground mt-1 font-medium">Review and manage employee leave histories</p>
                        </div>

                        {/* Search */}
                        <div className="relative mb-3 sm:mb-0 sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search employees or leave type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>



                    {/* Table */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                            <p className="text-sm text-slate-500 font-medium">Loading records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-sm bg-white">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-zinc-50 border-b border-zinc-200">
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center">Total Requests</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center">Pending</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center">Approved</th>
                                        <th className="px-6 py-3.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((employee) => {
                                            const pendingCount = employee.leaves.filter((l: any) => l.status === "Pending").length;
                                            const approvedCount = employee.leaves.filter((l: any) => l.status === "Approved").length;
                                            return (
                                                <tr
                                                    key={employee.id}
                                                    className="group hover:bg-zinc-50/80 transition-colors cursor-default"
                                                >
                                                    {/* Employee */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative shrink-0">
                                                                <EmployeeAvatar
                                                                    name={employee.name}
                                                                    photo={employee.photo}
                                                                    size="sm"
                                                                    className="rounded-xl border border-zinc-200"
                                                                />
                                                                {pendingCount > 0 && (
                                                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900 leading-tight">{employee.name}</p>
                                                                <p className="text-[11px] text-slate-400 font-medium">ID: {employee.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Department */}
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-medium text-slate-700">{employee.department || "Operations"}</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">{employee.title || "Employee"}</p>
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md bg-zinc-100 text-zinc-700 text-xs font-bold border border-zinc-200">
                                                            {employee.leaves.length}
                                                        </span>
                                                    </td>

                                                    {/* Pending */}
                                                    <td className="px-6 py-4 text-center">
                                                        {pendingCount > 0 ? (
                                                            <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border rounded-md", statusConfig.Pending.className)}>
                                                                {pendingCount} Pending
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-300 font-medium">—</span>
                                                        )}
                                                    </td>

                                                    {/* Approved */}
                                                    <td className="px-6 py-4 text-center">
                                                        {approvedCount > 0 ? (
                                                            <Badge className={cn("text-[10px] font-bold px-2 py-0.5 border rounded-md", statusConfig.Approved.className)}>
                                                                {approvedCount} Approved
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-300 font-medium">—</span>
                                                        )}
                                                    </td>

                                                    {/* Action */}
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => navigate(`/admin/leave-history/${employee.id}`)}
                                                            className="h-8 px-3 text-[11px] font-bold text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg gap-1.5 transition-all group-hover:opacity-100"
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
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ClipboardList size={32} className="text-slate-200" />
                                                    <p className="text-sm text-slate-400 font-medium">No leave records found.</p>
                                                    {searchQuery && (
                                                        <button
                                                            onClick={() => setSearchQuery("")}
                                                            className="text-xs text-primary font-semibold hover:underline mt-1"
                                                        >
                                                            Clear search
                                                        </button>
                                                    )}
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
                                {" · "}<span className="font-bold text-slate-600">{totalLeaves}</span> total leave requests
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                                Leave Management System
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ────────── Sub-components ────────── */

function TabButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all",
                active
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function StatCard({
    icon,
    label,
    value,
    bg,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
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

export default LeaveList;

