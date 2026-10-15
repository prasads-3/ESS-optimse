import { API_BASE_URL } from "@/config";
import { useState, useEffect } from "react";
import { Megaphone, Plus, Search, Trash2, Loader2, Calendar, User as UserIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import NoAccessBlock from "@/components/NoAccessBlock";

interface Announcement {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    author: { name: string };
}

interface Employee {
    id: number;
    name: string;
    email: string;
}

const Announcements = () => {
    const { user, hasFeature } = useAuth();

    if (!hasFeature("announcement")) {
        return <NoAccessBlock feature="Announcement" />;
    }

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [recipientType, setRecipientType] = useState<"all" | "specific">("all");
    const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAdmin = user?.role === "admin";

    useEffect(() => {
        fetchAnnouncements();
        if (isAdmin) fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/employees`, { credentials: "include" });
            const data = await response.json();
            if (response.ok) setEmployees(data);
        } catch (e) {
            console.error("Error fetching employees:", e);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/announcements`, { credentials: "include" });
            const data = await response.json();
            if (response.ok) setAnnouncements(data);
        } catch (e) {
            console.error("Error fetching announcements:", e);
            toast.error("Failed to load announcements");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/announcements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title,
                    content,
                    effectiveDate,
                    authorId: user?.id,
                    recipientEmail: recipientType === "specific" ? selectedEmails : null,
                }),
            });
            if (response.ok) {
                toast.success("Announcement posted");
                setTitle("");
                setContent("");
                setEffectiveDate("");
                setRecipientType("all");
                setSelectedEmails([]);
                setIsDialogOpen(false);
                fetchAnnouncements();
            } else {
                toast.error("Failed to post announcement");
            }
        } catch (e) {
            console.error(e);
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id: number) => {
        if (!confirm("Delete this announcement?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/announcements/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (response.ok) {
                toast.success("Announcement deleted");
                fetchAnnouncements();
            } else {
                toast.error("Failed to delete");
            }
        } catch (e) {
            toast.error("An error occurred");
        }
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return (
            date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
            " · " +
            date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        );
    };

    const filtered = announcements.filter(
        (a) =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/40 font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Announcements</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Updates and notices from your organization.</p>
                    </div>
                    {isAdmin && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <button className="px-4 py-2 bg-emerald-700 text-white rounded-md text-sm font-medium hover:bg-emerald-800 transition flex items-center gap-2 shadow-sm shadow-emerald-700/20">
                                    <Plus size={14} /> New announcement
                                </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[520px] p-0 border-slate-200">
                                <DialogHeader className="px-6 py-4 border-b border-slate-200">
                                    <DialogTitle className="text-base font-semibold text-slate-900">
                                        New Announcement
                                    </DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateAnnouncement} className="px-6 py-5 space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Title</label>
                                        <input
                                            placeholder="Announcement title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600 transition text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Recipients</label>
                                        <div className="flex gap-2">
                                            {(["all", "specific"] as const).map((opt) => (
                                                <button
                                                    type="button"
                                                    key={opt}
                                                    onClick={() => setRecipientType(opt)}
                                                    className={cn(
                                                        "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition",
                                                        recipientType === opt
                                                            ? "border-emerald-700 bg-emerald-700 text-white"
                                                            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                                                    )}
                                                >
                                                    {opt === "all" ? "All employees" : "Specific people"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {recipientType === "specific" && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">
                                                Select recipients{" "}
                                                <span className="text-slate-400 font-normal">
                                                    ({selectedEmails.length} selected)
                                                </span>
                                            </label>
                                            <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                                                {employees.map((emp) => (
                                                    <label
                                                        key={emp.id}
                                                        className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 transition"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEmails.includes(emp.email)}
                                                            onChange={(e) => {
                                                                if (e.target.checked)
                                                                    setSelectedEmails([...selectedEmails, emp.email]);
                                                                else
                                                                    setSelectedEmails(
                                                                        selectedEmails.filter((x) => x !== emp.email)
                                                                    );
                                                            }}
                                                            className="w-3.5 h-3.5 accent-emerald-700"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-800 truncate">{emp.name}</p>
                                                            <p className="text-[11px] text-slate-500 truncate">{emp.email}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Effective date <span className="text-slate-400 font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. April 1, 2026"
                                            value={effectiveDate}
                                            onChange={(e) => setEffectiveDate(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600 transition text-slate-800"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Content</label>
                                        <textarea
                                            placeholder="Write your announcement…"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            required
                                            rows={5}
                                            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600 transition resize-none text-slate-800 placeholder:text-slate-400"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 -mx-6 px-6 -mb-5 pb-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsDialogOpen(false)}
                                            className="px-4 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 transition"
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
                                                    <Loader2 size={14} className="animate-spin" /> Posting
                                                </>
                                            ) : (
                                                "Post announcement"
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search announcements…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600 transition text-slate-800 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded transition"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={20} className="text-slate-400 animate-spin mb-3" />
                            <p className="text-xs text-slate-500">Loading announcements…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <Megaphone size={18} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                                {searchQuery ? "No matching announcements" : "No announcements yet"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {searchQuery
                                    ? "Try a different search term."
                                    : isAdmin
                                        ? "Post the first announcement for your team."
                                        : "Updates from your organization will appear here."}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            <AnimatePresence>
                                {filtered.map((a) => {
                                    const isOpen = expandedId === a.id;
                                    return (
                                        <motion.li
                                            key={a.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div
                                                onClick={() => setExpandedId(isOpen ? null : a.id)}
                                                className="px-5 py-4 cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded tabular-nums">
                                                                #{a.id}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                                <Calendar size={11} /> {formatDateTime(a.createdAt)}
                                                            </span>
                                                            {a.author?.name && (
                                                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                                                    <UserIcon size={11} /> {a.author.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-sm font-semibold text-slate-900 truncate">{a.title}</h3>
                                                        {!isOpen && a.content && (
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{a.content}</p>
                                                        )}
                                                    </div>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteAnnouncement(a.id);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition"
                                                        >
                                                            <Trash2 size={12} />
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                                {isOpen && a.content && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        className="mt-3 pt-3 border-t border-slate-100"
                                                    >
                                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                            {a.content}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </motion.li>
                                    );
                                })}
                            </AnimatePresence>
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Announcements;
