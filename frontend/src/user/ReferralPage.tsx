import { API_BASE_URL } from "@/config";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Users,
    Plus,
    Copy,
    Share2,
    CheckCircle2,
    Clock,
    XCircle,
    Mail,
    Phone,
    User,
    Award,
    Loader2,
    Info,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import NoAccessBlock from "@/components/NoAccessBlock";

interface Referral {
    id: number;
    referredName: string;
    referredEmail: string;
    referredPhone: string | null;
    status: string;
    points: number;
    notes: string | null;
    createdAt: string;
}

interface ReferralPoints {
    points: number;
    totalEarned: number;
    totalUsed: number;
}

const REFERRAL_LINK = "https://www.mirakilabs.com/careers";

const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    return cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
        (s === "hired" || s === "completed") && "bg-emerald-50 text-success border-emerald-200",
        (s === "interviewing" || s === "contacted") && "bg-amber-50 text-warning border-amber-200",
        s === "rejected" && "bg-rose-50 text-destructive border-rose-200",
        !["hired", "completed", "interviewing", "contacted", "rejected"].includes(s) && "bg-secondary/50 text-foreground border-border",
    );
};

const statusIconFor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "hired" || s === "completed") return CheckCircle2;
    if (s === "rejected") return XCircle;
    return Clock;
};

const ReferralPage = () => {
    const { user, hasFeature } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [points, setPoints] = useState<ReferralPoints>({ points: 0, totalEarned: 0, totalUsed: 0 });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filter, setFilter] = useState<"All" | "Hired" | "Interviewing" | "Pending" | "Rejected">("All");
    const [searchQuery, setSearchQuery] = useState("");

    const [formData, setFormData] = useState({
        referredName: "",
        referredEmail: "",
        referredPhone: "",
        notes: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReferrals = async () => {
        if (!user?.id && user?.id !== 0) return;
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/referrals?employeeId=${user.id}`, {
                credentials: "include",
            });
            if (response.ok) {
                const data = await response.json();
                setReferrals(data.referrals || []);
                if (data.points) setPoints(data.points);
            }
        } catch (e) {
            console.error("Error fetching referrals:", e);
            toast.error("Failed to load referrals");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (hasFeature("referral")) fetchReferrals();
        else setIsLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, hasFeature]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(REFERRAL_LINK);
        toast.success("Referral link copied");
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Join Our Team",
                    text: "I'm working here and thought you might be a great fit. Check out our open positions.",
                    url: REFERRAL_LINK,
                });
                toast.success("Shared");
            } catch (e) {
                if ((e as Error).name !== "AbortError") handleCopyLink();
            }
        } else {
            handleCopyLink();
        }
    };

    const handleSubmitReferral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.referredName || !formData.referredEmail) {
            toast.error("Name and email are required");
            return;
        }
        try {
            setIsSubmitting(true);
            const response = await fetch(`${API_BASE_URL}/api/referrals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ employeeId: user?.id, ...formData }),
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Referral submitted");
                setIsAddModalOpen(false);
                setFormData({ referredName: "", referredEmail: "", referredPhone: "", notes: "" });
                fetchReferrals();
            } else {
                toast.error(data.error || "Failed to submit referral");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to submit referral");
        } finally {
            setIsSubmitting(false);
        }
    };

    const counts = useMemo(() => {
        const c = (s: string) => referrals.filter((r) => (r.status || "").toLowerCase() === s).length;
        return {
            All: referrals.length,
            Hired: c("hired") + c("completed"),
            Interviewing: c("interviewing") + c("contacted"),
            Pending: c("pending") + c("submitted") + c("new") + c(""),
            Rejected: c("rejected"),
        };
    }, [referrals]);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return referrals.filter((r) => {
            const s = (r.status || "").toLowerCase();
            if (filter === "Hired" && !["hired", "completed"].includes(s)) return false;
            if (filter === "Interviewing" && !["interviewing", "contacted"].includes(s)) return false;
            if (filter === "Rejected" && s !== "rejected") return false;
            if (filter === "Pending" && !["pending", "submitted", "new", "", "completed"].includes(s) && filter === "Pending" && !["pending", "submitted", "new", ""].includes(s)) return false;
            // Wait, logic fix for Pending
            if (filter === "Pending" && ["hired", "completed", "rejected", "interviewing", "contacted"].includes(s)) return false;
            if (!q) return true;
            return (
                r.referredName?.toLowerCase().includes(q) ||
                r.referredEmail?.toLowerCase().includes(q) ||
                (r.referredPhone || "").toLowerCase().includes(q)
            );
        });
    }, [referrals, filter, searchQuery]);

    if (!hasFeature("referral")) {
        return <NoAccessBlock feature="Referral Program" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">Refer & Earn</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Refer talented people to your team and earn reward points.</p>
                    </div>
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <button className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 shadow-sm shadow-emerald-700/20">
                                <Plus size={14} /> New referral
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[480px] p-0 border-border">
                            <DialogHeader className="px-6 py-4 border-b border-border">
                                <DialogTitle className="text-base font-semibold text-foreground">Refer a Candidate</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmitReferral} className="px-6 py-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">Full name</label>
                                    <input
                                        type="text"
                                        placeholder="Jane Doe"
                                        value={formData.referredName}
                                        onChange={(e) => setFormData({ ...formData, referredName: e.target.value })}
                                        required
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">Email</label>
                                    <input
                                        type="email"
                                        placeholder="jane@example.com"
                                        value={formData.referredEmail}
                                        onChange={(e) => setFormData({ ...formData, referredEmail: e.target.value })}
                                        required
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Phone <span className="text-muted-foreground/70 font-normal">(optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={formData.referredPhone}
                                        onChange={(e) => setFormData({ ...formData, referredPhone: e.target.value })}
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Notes <span className="text-muted-foreground/70 font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Skills, experience, or why they'd be a great fit…"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition resize-none text-foreground placeholder:text-muted-foreground/70"
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border -mx-6 px-6 -mb-5 pb-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-foreground rounded-md hover:bg-secondary transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 disabled:opacity-60 shadow-sm shadow-emerald-700/20"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" /> Submitting
                                            </>
                                        ) : (
                                            "Submit referral"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Available Points</p>
                            <p className="mt-1.5 text-2xl font-semibold text-success tabular-nums">{points.points}</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <Award size={12} className="text-emerald-600" />
                                <span className="text-[11px] text-muted-foreground">ready to redeem</span>
                            </div>
                            <button 
                                onClick={() => {
                                    if (points.points < 100) {
                                        toast.info("Minimum 100 points required to redeem");
                                    } else {
                                        toast("Redemption Request", {
                                            description: "Redemption feature is being finalized. Our HR team will contact you shortly regarding your 250 points.",
                                            action: {
                                                label: "Contact HR",
                                                onClick: () => window.location.href = `mailto:hr@mirakilabs.com?subject=Point%20Redemption%20Request&body=Hi%20HR%20Team,%0A%0AI%20would%20like%20to%20redeem%20my%20${points.points}%20referral%20points.%0A%0AEmployee:%20${user?.name}%0AEmail:%20${user?.email}`
                                            }
                                        });
                                    }
                                }}
                                className="px-3 py-1 bg-emerald-50 text-success text-[10px] font-bold rounded border border-emerald-200 hover:bg-emerald-100 transition uppercase tracking-tight"
                            >
                                Redeem
                            </button>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Lifetime Earned</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{points.totalEarned}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">{points.totalUsed} used</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Total Referrals</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{referrals.length}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <Users size={12} className="text-muted-foreground" />
                            <span className="text-[11px] text-muted-foreground">people referred</span>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <p className="text-[11px] font-medium text-muted-foreground">Hired</p>
                        <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">{counts.Hired}</p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span className="text-[11px] text-muted-foreground">successful hires</span>
                        </div>
                    </div>
                </div>

                {/* Two-column: link + how-it-works */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-foreground">Your Referral Link</h2>
                            <span className="text-[11px] text-muted-foreground">Share with anyone</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                value={REFERRAL_LINK}
                                readOnly
                                className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyLink}
                                    className="px-3 py-2 text-sm font-medium text-foreground border border-border bg-card rounded-md hover:bg-secondary/50 transition flex items-center gap-1.5"
                                >
                                    <Copy size={14} /> Copy
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="px-3 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-sm shadow-emerald-700/20"
                                >
                                    <Share2 size={14} /> Share
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3">
                            Earn <span className="font-semibold text-success">250 points</span> for every successful hire. Points can be redeemed for gift cards or extra time off.
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={14} className="text-muted-foreground" />
                            <h2 className="text-sm font-semibold text-foreground">How it Works</h2>
                        </div>
                        <ol className="space-y-2.5">
                            {[
                                "Share your link with potential candidates.",
                                "They apply and go through the standard interview.",
                                "Once hired and past probation, points are credited.",
                                "Redeem points for rewards — no limit on referrals.",
                            ].map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="w-4 h-4 rounded-full bg-emerald-50 text-success text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                                        {i + 1}
                                    </span>
                                    <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {/* Referrals table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-semibold text-foreground">My Referrals</h2>
                                <span className="text-[11px] text-muted-foreground">{referrals.length} total</span>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or phone…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition text-foreground placeholder:text-muted-foreground/70"
                                />
                            </div>
                        </div>
                        <div className="flex border-b border-transparent -mb-3 overflow-x-auto">
                            {(["All", "Hired", "Interviewing", "Pending", "Rejected"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition whitespace-nowrap",
                                        filter === f
                                            ? "border-emerald-700 text-success"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {f}
                                    <span className={cn(
                                        "ml-1.5 text-[10px] px-1.5 py-0.5 rounded tabular-nums",
                                        filter === f ? "bg-emerald-50 text-success" : "bg-secondary text-muted-foreground"
                                    )}>
                                        {counts[f]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={20} className="text-muted-foreground/70 animate-spin mb-3" />
                            <p className="text-xs text-muted-foreground">Loading referrals…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-secondary flex items-center justify-center mb-3">
                                <Users size={18} className="text-muted-foreground/70" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No referrals found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {searchQuery
                                    ? "Try a different search term."
                                    : filter === "All"
                                        ? "Start referring friends to earn reward points."
                                        : `No ${filter.toLowerCase()} referrals.`}
                            </p>
                            {!searchQuery && filter === "All" && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-success hover:text-emerald-800"
                                >
                                    Refer your first candidate
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/50/60 border-b border-border">
                                    <tr>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Candidate</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Contact</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Status</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground">Referred</th>
                                        <th className="px-5 py-2.5 text-[11px] font-semibold text-muted-foreground text-right">Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((r) => {
                                        const StatusIcon = statusIconFor(r.status);
                                        return (
                                            <tr key={r.id} className="hover:bg-secondary/50/50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                                            <User size={13} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-foreground leading-tight">
                                                                {r.referredName}
                                                            </p>
                                                            {r.notes && (
                                                                <p
                                                                    className="text-[11px] text-muted-foreground italic truncate max-w-[260px]"
                                                                    title={r.notes}
                                                                >
                                                                    "{r.notes}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col text-xs text-muted-foreground gap-0.5">
                                                        <span className="flex items-center gap-1.5">
                                                            <Mail size={11} className="text-muted-foreground/70" />
                                                            <span className="truncate max-w-[200px]">{r.referredEmail}</span>
                                                        </span>
                                                        {r.referredPhone && (
                                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                <Phone size={11} className="text-muted-foreground/70" />
                                                                {r.referredPhone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={statusBadge(r.status)}>
                                                        <StatusIcon size={11} />
                                                        {r.status || "Pending"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
                                                    {new Date(r.createdAt).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={cn(
                                                        "text-sm font-semibold tabular-nums",
                                                        r.points > 0 ? "text-success" : "text-muted-foreground/70"
                                                    )}>
                                                        {r.points || 0}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReferralPage;
