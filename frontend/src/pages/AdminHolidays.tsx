import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Info,
    Globe,
    MapPin,
    CheckCircle2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AdminHolidays = () => {
    const [view, setView] = useState<"calendar" | "list">("calendar");
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date()); // Default to current today's month/year
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ name: "", date: "", type: "Mandatory", location: "Pan India" });

    useEffect(() => {
        fetchHolidays();
        
        // Keep in sync with other admins every 10 seconds
        const interval = setInterval(fetchHolidays, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchHolidays = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/holidays`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setHolidays(data);
            }
        } catch (error) {
            console.error('Error fetching holidays:', error);
            toast.error("Failed to load holidays");
        } finally {
            setIsLoading(false);
        }
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const changeMonth = (offset: number) => {
        const nextDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(nextDate);
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handleCreateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreating) return;
        setIsCreating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/holidays`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newHoliday),
                credentials: 'include'
            });

            if (response.ok) {
                toast.success("Holiday added successfully");
                fetchHolidays();
                setIsModalOpen(false);
                setNewHoliday({ name: "", date: "", type: "Mandatory", location: "Pan India" });
            } else {
                const err = await response.json();
                toast.error(err.error || "Failed to add holiday");
            }
        } catch (error) {
            toast.error("Network error while adding holiday");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteHoliday = async (id: number) => {
        if (!confirm("Delete this holiday?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/holidays/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                toast.success("Holiday deleted");
                fetchHolidays();
            }
        } catch (error) {
            toast.error("Failed to delete holiday");
        }
    };

    const filteredHolidays = holidays.filter(h =>
        h.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-none m-3 mx-auto overflow-x-hidden">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Globe size={28} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Holiday Management</h1>
                            <p className="text-sm text-muted-foreground mt-1">Configure and update company holidays for the current fiscal year.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all"
                    >
                        <Plus size={18} />
                        Add holiday
                    </button>
                </div>

                {/* Filters & View Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-3xl border border-border/50 shadow-sm">
                    <div className="relative w-full sm:w-80 group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search holiday name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-secondary/30 border border-border/60 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex bg-secondary/50 p-1 rounded-xl border border-border/20">
                            <button
                                onClick={() => setView("calendar")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                                    view === "calendar" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Calendar
                            </button>
                            <button
                                onClick={() => setView("list")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                    view === "list" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                List View
                            </button>
                        </div>
                        <button className="p-3 hover:bg-secondary rounded-xl transition-colors text-muted-foreground border border-border/20">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {view === "calendar" ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Interactive Calendar */}
                        <div className="xl:col-span-2 bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
                            <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-bold">Updated Calendar</h2>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => changeMonth(-1)}
                                            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                        ><ChevronLeft size={18} /></button>
                                        <span className="text-sm font-semibold min-w-[120px] text-center">
                                            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                                        </span>
                                        <button
                                            onClick={() => changeMonth(1)}
                                            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                        ><ChevronRight size={18} /></button>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-primary" />
                                        <span className="text-xs text-muted-foreground font-semibold">Mandatory</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-blue-500" />
                                        <span className="text-xs text-muted-foreground font-semibold">Optional</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-7 gap-3">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                        <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase mb-4">{day}</div>
                                    ))}
                                    {/* Empty slots for days before the start of the month */}
                                    {[...Array(getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => (
                                        <div key={`empty-${i}`} className="h-24 lg:h-32 bg-muted/5 opacity-40 border border-border/10 rounded-2xl" />
                                    ))}

                                    {[...Array(getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => {
                                        const day = i + 1;
                                        const dayHolidays = holidays.filter(h => {
                                            const d = new Date(h.date);
                                            return d.getDate() === day &&
                                                d.getMonth() === viewDate.getMonth() &&
                                                d.getFullYear() === viewDate.getFullYear();
                                        });
                                        const isHoliday = dayHolidays.length > 0;

                                        return (
                                            <div
                                                key={day}
                                                className={cn(
                                                    "h-24 lg:h-32 border border-border/30 rounded-2xl p-3 transition-all cursor-pointer relative group",
                                                    isHoliday ? "bg-primary/5 border-primary/20 shadow-sm ring-1 ring-primary/10" : "bg-muted/5 hover:bg-muted/10"
                                                )}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={cn(
                                                        "text-sm font-black",
                                                        isHoliday ? "text-accent bg-accent/10 w-7 h-7 flex items-center justify-center rounded-lg" : "text-muted-foreground"
                                                    )}>{day}</span>
                                                </div>
                                                <div className="mt-3 space-y-2 max-h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar pr-1 relative z-10 transition-all no-scrollbar">
                                                    {dayHolidays.map(h => (
                                                        <div key={h.id} className="group/item flex items-center justify-between gap-1 p-1 hover:bg-primary/5 rounded-md transition-all">
                                                            <div className="flex-1 min-w-0">
                                                                <span className="block text-[10px] font-black text-accent leading-tight truncate">{h.name}</span>
                                                                <span className="block text-[9px] text-muted-foreground font-medium truncate">{h.location}</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteHoliday(h.id);
                                                                }}
                                                                className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-destructive/10 rounded-md transition-all shrink-0"
                                                                title="Delete this holiday"
                                                            >
                                                                <X size={12} className="text-destructive" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-[0.02] rounded-2xl transition-opacity pointer-events-none" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Side Actions & Upcoming */}
                        <div className="space-y-8">
                            <div className="bg-card rounded-3xl border border-primary/10 p-8 shadow-sm space-y-6 bg-gradient-to-b from-white to-primary/[0.02]">
                                <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                                    <Info size={16} className="text-primary" />
                                    Holiday updates
                                </h2>
                                <div className="space-y-4">
                                    <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                                        Changes made here will reflect globally for all employees. Automated notifications will be sent if major changes occur.
                                    </p>
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                                        <CheckCircle2 size={18} className="text-primary mt-0.5" />
                                        <p className="text-xs font-bold text-primary leading-tight">All holidays for Q4 2023 have been synchronized.</p>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                ) : (
                    /* List View Implementation */
                    <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30">
                                    <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Holiday name</th>
                                    <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Date</th>
                                    <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Type</th>
                                    <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Location</th>
                                    <th className="px-8 py-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {filteredHolidays.map(holiday => (
                                    <tr key={holiday.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-semibold text-foreground">{holiday.name}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-medium text-muted-foreground">{new Date(holiday.date).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-semibold",
                                                holiday.type === "Mandatory" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                                            )}>
                                                {holiday.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin size={12} />
                                                <span className="text-xs font-medium">{holiday.location}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleDeleteHoliday(holiday.id)}
                                                    className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-destructive transition-all"
                                                >
                                                    <Trash2 size={14} />
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
            {/* Add Holiday Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-border/60 flex items-center justify-between">
                            <h2 className="text-lg font-bold">Add New Holiday</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateHoliday} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Holiday Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Diwali"
                                    value={newHoliday.name}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border/80 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</label>
                                <input
                                    required
                                    type="date"
                                    value={newHoliday.date}
                                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                    className="w-full bg-secondary/30 border border-border/80 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</label>
                                    <select
                                        value={newHoliday.type}
                                        onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border/80 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                    >
                                        <option value="Mandatory">Mandatory</option>
                                        <option value="Optional">Optional</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location</label>
                                    <input
                                        type="text"
                                        placeholder="Pan India"
                                        value={newHoliday.location}
                                        onChange={(e) => setNewHoliday({ ...newHoliday, location: e.target.value })}
                                        className="w-full bg-secondary/30 border border-border/80 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isCreating}
                                className={cn(
                                    "w-full py-3 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/10 transition-all mt-4 flex items-center justify-center gap-2",
                                    isCreating ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/95"
                                )}
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    "Save Holiday"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const SettingItem = ({ label, status }: any) => (
    <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded-md">{status}</span>
    </div>
);

export default AdminHolidays;

