import { API_BASE_URL } from "@/config";
import { useState, useEffect, useMemo } from "react";
import {
    FileText,
    Download,
    Search,
    Eye,
    Loader2,
    CheckCircle2,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { generatePayslipPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";

const MONTH_ORDER: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

const formatINR = (n: number) =>
    `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MyPayslips = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [yearFilter, setYearFilter] = useState<string>("All");
    const [payslips, setPayslips] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPayslips = async () => {
            if (!user?.id) return;
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/salary-slips?employeeId=${user.id}`, {
                    credentials: "include",
                });
                if (response.ok) setPayslips(await response.json());
            } catch (error) {
                console.error("Error fetching payslips:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPayslips();
    }, [user?.id]);

    const orgLogoFromAuth = (user as any)?.organization?.logo || null;
    const orgNameFromAuth = (user as any)?.organization?.name || null;
    const orgAddrFromAuth = (user as any)?.organization?.address || null;
    const orgSlugFromAuth = (user as any)?.organization?.slug || null;
    // Prefer fresh API values from the salary-slip endpoint (resolved server-side
    // on each request) over the cached auth value, which can be stale if the
    // organization's address/logo was updated after this user's last login.
    const withBranding = (slip: any) => ({
        ...slip,
        organizationLogo: slip.organizationLogo || orgLogoFromAuth || null,
        organizationName: slip.organizationName || orgNameFromAuth || null,
        organizationAddress: slip.organizationAddress || orgAddrFromAuth || null,
        organizationSlug: slip.organizationSlug || orgSlugFromAuth || null,
        payslipConfig: slip.payslipConfig || null,
    });

    const handleDownload = async (slip: any) => {
        try {
            toast.success("Preparing payslip…");
            await generatePayslipPDF(withBranding(slip), "download");
        } catch (error) {
            console.error("PDF Download error:", error);
            toast.error("Download failed. Try Preview instead.");
        }
    };

    const handlePreview = async (slip: any) => {
        try {
            await generatePayslipPDF(withBranding(slip), "preview");
        } catch (error) {
            toast.error("Preview failed to open.");
        }
    };

    const years = useMemo(() => {
        const set = new Set<string>(payslips.map((p) => String(p.year)));
        return ["All", ...Array.from(set).sort((a, b) => Number(b) - Number(a))];
    }, [payslips]);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return payslips
            .filter((s) => yearFilter === "All" || String(s.year) === yearFilter)
            .filter(
                (s) =>
                    !q ||
                    s.month?.toLowerCase().includes(q) ||
                    String(s.year).toLowerCase().includes(q)
            )
            .sort((a, b) => {
                const ya = Number(b.year) - Number(a.year);
                if (ya !== 0) return ya;
                return (MONTH_ORDER[b.month] || 0) - (MONTH_ORDER[a.month] || 0);
            });
    }, [payslips, searchQuery, yearFilter]);

    const totals = useMemo(() => {
        const ytd = filtered.reduce((s, p) => s + (Number(p.netPay) || 0), 0);
        const latest = filtered[0];
        const avg = filtered.length ? ytd / filtered.length : 0;
        return { ytd, latest, avg, count: filtered.length };
    }, [filtered]);

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">My Payslips</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Download and preview your monthly salary records.</p>
                    </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Total Records</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{payslips.length}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <FileText size={12} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">payslips on file</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Latest Net Pay</p>
                        <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">
                            {totals.latest ? formatINR(Number(totals.latest.netPay)) : "—"}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="text-[11px] text-muted-foreground">
                                {totals.latest ? `${totals.latest.month} ${totals.latest.year}` : "no records"}
                            </span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Total {yearFilter === "All" ? "Earnings" : yearFilter}</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{formatINR(totals.ytd)}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">{totals.count} {totals.count === 1 ? "month" : "months"}</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Average Net Pay</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{formatINR(totals.avg)}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground">across selected period</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-semibold text-foreground">Payslip History</h2>
                            <span className="text-[11px] text-muted-foreground">{payslips.length} total</span>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                                className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground cursor-pointer"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>
                                        {y === "All" ? "All years" : `FY ${y}`}
                                    </option>
                                ))}
                            </select>
                            <div className="relative flex-1 sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                <input
                                    type="text"
                                    placeholder="Search by month or year…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground placeholder:text-muted-foreground/70"
                                />
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={20} className="text-muted-foreground/70 animate-spin mb-3" />
                            <p className="text-xs text-muted-foreground">Loading payslips…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                                <FileText size={18} className="text-muted-foreground/70" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No payslips found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {searchQuery || yearFilter !== "All"
                                    ? "Try a different search or year."
                                    : "Your payslips will appear here once payroll runs."}
                            </p>
                            {(searchQuery || yearFilter !== "All") && (
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setYearFilter("All");
                                    }}
                                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-success hover:text-emerald-800"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/50/60 border-b border-border">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Period</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Generated</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Status</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Net Pay</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((slip) => (
                                        <tr key={slip.id} className="hover:bg-secondary/50/50 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center text-muted-foreground">
                                                        <FileText size={13} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground leading-tight">
                                                            {slip.month} {slip.year}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">Regular payroll</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
                                                {new Date(slip.createdAt).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
                                                    "bg-emerald-50 text-success border-emerald-200"
                                                )}>
                                                    <CheckCircle2 size={11} />
                                                    Paid
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="text-sm font-semibold text-foreground tabular-nums">
                                                    {formatINR(Number(slip.netPay))}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        onClick={() => handlePreview(slip)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-success hover:bg-emerald-50 transition"
                                                    >
                                                        <Eye size={12} />
                                                        Preview
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(slip)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-success hover:bg-emerald-50 transition"
                                                    >
                                                        <Download size={12} />
                                                        Download
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyPayslips;
