import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    Loader2,
    User,
    FileText,
    Download,
    Search,
    ChevronRight,
    ArrowUpRight,
    Eye,
    Sparkles,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generatePayslipPDF } from "@/lib/pdfGenerator";
import { Button } from "@/components/ui/button";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Helpers ────────────────────────────────────────────────── */
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/* ─── Component ──────────────────────────────────────────────── */
const EmployeePayrollHistory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [slips, setSlips] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [employee, setEmployee] = useState<any>(null);

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/salary-slips?employeeId=${id}`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setSlips(data);
                // In a real app, you might have a separate endpoint for employee details
                // here we just take it from the first slip if available
                if (data.length > 0) {
                    setEmployee({
                        id: data[0].employeeId,
                        name: data[0].employeeName,
                        department: data[0].department,
                        designation: data[0].designation,
                        photo: data[0].photo || null
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching employee payslips:", error);
            toast.error("Failed to load records");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchData();
    }, [id, fetchData]);

    // Mirror the sidebar/dashboard branding into the PDF so the two always match.
    // `user.organization` is the admin's own org, which is also the employee's org
    // (admins only view employees within their own organization).
    const handleDownload = async (slip: any) => {
        try {
            toast.success(`Generating PDF for ${slip.month} ${slip.year}...`);
            const org = (user as any)?.organization || {};
            await generatePayslipPDF({
                ...slip,
                organizationLogo: org.logo || slip.organizationLogo || null,
                organizationName: org.name || slip.organizationName || null,
                organizationAddress: org.address || slip.organizationAddress || null,
                organizationSlug: org.slug || slip.organizationSlug || null,
                payslipConfig: slip.payslipConfig || org.payslipConfig || null,
            });
        } catch (error) {
            console.error("PDF Generation error:", error);
            toast.error("Failed to generate PDF. Please try again.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this payslip? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/salary-slips/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.ok) {
                toast.success("Payslip deleted successfully");
                setSlips((prev) => prev.filter((s) => s.id !== id));
            } else {
                const data = await response.json();
                toast.error(data.error || "Failed to delete payslip");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("An error occurred while deleting");
        }
    };

    /* ── Stats ── */
    const totalSlips = slips.length;
    const totalNetPay = slips.reduce((sum, s) => sum + (s.netPay || 0), 0);
    const avgNetPay = totalSlips > 0 ? totalNetPay / totalSlips : 0;

    return (
        <div className="flex-1 overflow-y-auto bg-[#f8f9fb] min-h-screen">
            <div className="max-w-full mx-auto px-6 py-8 space-y-6">

                {/* ── Back Button ── */}
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 text-xs font-semibold tracking-wide transition-colors group"
                >
                    <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Payroll Repository
                </button>

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <EmployeeAvatar
                                name={employee?.name || "Employee"}
                                photo={employee?.photo}
                                size="md"
                                className="rounded-xl border border-zinc-200 shadow-sm"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>

                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                                {employee?.name || "Employee"}'s Payroll History
                            </h1>
                            <p className="text-sm text-zinc-400 font-medium mt-0.5">
                                {employee?.designation || "Team Member"} · {employee?.department || "Operations"} · Employee #{id}
                            </p>
                        </div>
                    </div>

                    {/* Summary Pills */}
                    {!isLoading && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <StatPill label="Total Slips" value={totalSlips} color="zinc" />
                            <StatPill label="Avg Net Pay" value={`₹${Math.round(avgNetPay).toLocaleString('en-IN')}`} color="emerald" />
                        </div>
                    )}
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                        <p className="text-sm text-zinc-400 font-medium">Decrypting records…</p>
                    </div>
                ) : slips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-zinc-200 border-dashed">
                        <FileText size={32} className="text-zinc-300" />
                        <p className="text-sm text-zinc-400 font-medium">No payslip records found for this employee.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {slips.map((slip, idx) => (
                            <div key={slip.id} 
                                className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                            >
                                {/* Subtle Glow Pattern */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors duration-500"></div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2 bg-zinc-50 rounded-lg text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                            <FileText size={18} />
                                        </div>
                                        <div className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            PAID
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h4 className="text-base font-bold text-zinc-900 tracking-tight">{slip.month} {slip.year}</h4>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                            Generated {formatDate(slip.createdAt)}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-zinc-50">
                                        <div className="mb-4">
                                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 text-left">Net Payable</p>
                                            <p className="text-xl font-bold text-zinc-900 group-hover:text-primary transition-colors text-left">
                                                ₹{slip.netPay.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="flex-1 h-9 rounded-lg text-zinc-400 hover:text-primary hover:bg-primary/5 font-bold text-[10px] uppercase tracking-widest gap-2 transition-all font-sans"
                                                onClick={() => handleDownload(slip)}
                                            >
                                                <Download size={14} />
                                                Download
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-9 w-9 p-0 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                onClick={() => handleDelete(slip.id)}
                                                title="Delete Payslip"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Footer ── */}
                {!isLoading && slips.length > 0 && (
                    <p className="text-[11px] text-zinc-400 font-medium text-center pb-2">
                        {totalSlips} record{totalSlips !== 1 ? "s" : ""} discovered in archives
                    </p>
                )}
            </div>
        </div>
    );
};

/* ── Stat Pill Sub-component ─────────────────────────────────── */
function StatPill({ label, value, color }: { label: string; value: any; color: string }) {
    const colorMap: Record<string, string> = {
        zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
        amber: "bg-amber-50 text-amber-600 border-amber-200",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
        red: "bg-red-50 text-red-500 border-red-200",
    };
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold",
            colorMap[color]
        )}>
            <span className="text-sm font-black">{value}</span>
            <span className="opacity-70">{label}</span>
        </span>
    );
}

export default EmployeePayrollHistory;

