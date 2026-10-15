import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Calendar,
    Clock,
    Plus,
    X,
    Filter,
    ChevronRight,
    ChevronLeft,
    FileText,
    AlertCircle,
    Paperclip,
    CheckCircle2,
    XCircle,
    Clock3,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TimeAndLeave = () => {
    const [viewDate, setViewDate] = useState(new Date());
    const [holidays, setHolidays] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [leaveForm, setLeaveForm] = useState({
        type: "Casual Leave",
        startDate: "",
        endDate: "",
        isHalfDay: false,
        reason: ""
    });

    useEffect(() => {
        fetchHolidays();
        fetchLeaves();
        
        // Auto-sync with database every 10 seconds
        const interval = setInterval(() => {
            fetchHolidays();
            fetchLeaves();
        }, 10000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchHolidays = async () => {
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
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLeaves = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/leaves`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setLeaves(data);
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend validation: Check leaves in the same month as startDate
        const start = new Date(leaveForm.startDate);
        const month = start.getMonth();
        const year = start.getFullYear();

        const leavesThisMonth = leaves.filter(l => {
            const d = new Date(l.startDate);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        if (leavesThisMonth.length >= 2) {
            toast.error("Monthly Limit Reached: You can only apply for a maximum of 2 leaves per month.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/leaves`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leaveForm),
                credentials: 'include'
            });

            if (response.ok) {
                toast.success("Leave application submitted successfully");
                setLeaveForm({
                    type: "Casual Leave",
                    startDate: "",
                    endDate: "",
                    isHalfDay: false,
                    reason: ""
                });
                fetchLeaves();
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "Failed to apply for leave");
            }
        } catch (error) {
            toast.error("Failed to apply for leave");
        }
    };

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];


    return (
        <div className="flex-1 overflow-y-auto bg-background/50 scroll-smooth">
            <div className="p-4 md:p-6 lg:p-10 space-y-10 max-w-none m-3 mx-auto overflow-x-hidden">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">

                        <div>
                            <h1 className="text-3xl font-semibold text-foreground/90 tracking-tight">Holiday</h1>
                        </div>
                    </div>
                </div>


                {/* Tab Content */}
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Leave Balance Dashboard */}


                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Main Column */}
                        <div className="xl:col-span-2 space-y-8">

                            {/* Holiday Calendar Integrated Directly */}
                            <div className="bg-card rounded-lg bespoke-border bespoke-shadow overflow-hidden pt-2">
                                <div className="px-8 py-5 border-b border-border/60 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            <h2 className="font-semibold text-xs text-muted-foreground">Holiday calendar</h2>
                                        </div>
                                        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/40">
                                            <button
                                                onClick={() => changeMonth(-1)}
                                                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                            ><ChevronLeft size={16} /></button>
                                            <span className="text-xs font-semibold min-w-[100px] text-center">
                                                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                                            </span>
                                            <button
                                                onClick={() => changeMonth(1)}
                                                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                            ><ChevronRight size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="flex gap-5">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                                            <span className="text-[10px] text-muted-foreground font-semibold">Holiday</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-blue-500">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                            <span className="text-[10px] text-muted-foreground font-semibold">Birthday</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-7 gap-3 mb-3">
                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                                            <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase">{day}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-3">
                                        {[...Array(getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => (
                                            <div key={`empty-${i}`} className="h-20 sm:h-28 bg-muted/5 opacity-40 border border-border/10 rounded-2xl" />
                                        ))}

                                        {[...Array(getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()))].map((_, i) => {
                                            const day = i + 1;
                                            const dayHolidays = holidays.filter(h => {
                                                const d = new Date(h.date);
                                                return d.getDate() === day &&
                                                    d.getMonth() === viewDate.getMonth() &&
                                                    d.getFullYear() === viewDate.getFullYear();
                                            });
                                            const dayLeaves = leaves.filter(l => {
                                                const d = new Date(l.startDate);
                                                return d.getDate() === day &&
                                                    d.getMonth() === viewDate.getMonth() &&
                                                    d.getFullYear() === viewDate.getFullYear();
                                            });
                                            const isHoliday = dayHolidays.length > 0;
                                            const isLeave = dayLeaves.length > 0;
                                            const isBirthday = day === 5 && viewDate.getMonth() === 9; // Original mock birthday

                                            return (
                                                <div
                                                    key={day}
                                                    className={cn(
                                                        "h-20 sm:h-28 border border-border/10 rounded-2xl p-3 transition-all cursor-pointer hover:border-primary/40 relative group overflow-hidden",
                                                        isHoliday ? "bg-primary/5 border-primary/20" : "bg-muted/5 hover:bg-white/40",
                                                        isLeave ? "bg-orange-50/50 border-orange-200" : "",
                                                        isBirthday ? "bg-blue-50/50 border-blue-200/50" : ""
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        isHoliday ? "text-primary" : "text-foreground/70"
                                                    )}>{day}</span>

                                                    {dayHolidays.map(h => (
                                                        <div key={h.id} className="mt-2 text-center">
                                                            <span className="block text-[9px] font-semibold text-primary leading-tight">{h.name}</span>
                                                        </div>
                                                    ))}

                                                    {dayLeaves.map(l => (
                                                        <div key={l.id} className="mt-2 text-center">
                                                            <span className="block text-[9px] font-semibold text-orange-600 leading-tight">Leave: {l.type}</span>
                                                        </div>
                                                    ))}

                                                    {isBirthday && (
                                                        <div className="mt-2 text-center">
                                                            <span className="block text-[9px] font-semibold text-blue-600 leading-tight">Sarah's B'day</span>
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-[0.02] transition-opacity" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Side Column: Apply Form */}
                        <div className="space-y-8">
                            <div className="bg-card rounded-lg bespoke-border bespoke-shadow overflow-hidden sticky top-10">
                                <div className="bg-primary px-8 py-8 text-white relative overflow-hidden">
                                    <div className="relative z-10">
                                        <h2 className="text-xl font-semibold tracking-tight">Apply for leave</h2>
                                        <p className="text-xs text-white/70 mt-1 font-medium">Plan your time off</p>
                                    </div>
                                    <Plus size={100} className="absolute -right-6 -bottom-6 text-white/10 rotate-12" />
                                </div>
                                <div className="p-8 space-y-6">
                                    <form onSubmit={handleApplyLeave} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-muted-foreground pl-1">Leave type</label>
                                            <select
                                                value={leaveForm.type}
                                                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                                                className="w-full bg-secondary/30 border border-border/60 rounded-lg px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition appearance-none cursor-pointer font-medium"
                                            >
                                                <option>Casual Leave</option>
                                                <option>Sick Leave</option>
                                                <option>Privilege Leave</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-semibold text-muted-foreground pl-1">From date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={leaveForm.startDate}
                                                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                                    className="w-full bg-secondary/30 border border-border/60 rounded-lg px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition font-medium"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-semibold text-muted-foreground pl-1">To date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    value={leaveForm.endDate}
                                                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                                    className="w-full bg-secondary/30 border border-border/60 rounded-lg px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-lg border border-border/40 group cursor-pointer hover:bg-secondary/40 transition-all">
                                            <input
                                                type="checkbox"
                                                id="halfday"
                                                checked={leaveForm.isHalfDay}
                                                onChange={(e) => setLeaveForm({ ...leaveForm, isHalfDay: e.target.checked })}
                                                className="w-4 h-4 rounded text-primary border-primary/20 focus:ring-primary/20 cursor-pointer"
                                            />
                                            <label htmlFor="halfday" className="text-xs font-semibold text-foreground/80 cursor-pointer">Apply as half day</label>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-muted-foreground pl-1">Reason for leave</label>
                                            <textarea
                                                rows={4}
                                                placeholder="Briefly explain the reason..."
                                                value={leaveForm.reason}
                                                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                                className="w-full bg-secondary/30 border border-border/60 rounded-lg px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none font-medium"
                                            />
                                        </div>

                                        <div className="cursor-pointer group flex flex-col items-center justify-center border-2 border-dashed border-border/20 rounded-2xl py-10 hover:bg-white/40 hover:border-primary/40 transition-all duration-300">
                                            <div className="p-4 bg-primary/5 rounded-full group-hover:scale-110 transition-transform mb-3">
                                                <Paperclip size={24} className="text-primary" />
                                            </div>
                                            <label className="text-[10px] font-semibold text-muted-foreground/60">Attach supporting documents</label>
                                            <span className="text-[9px] text-muted-foreground/40 mt-1">PDF, JPG up to 5MB</span>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <button type="submit" className="w-full py-3.5 bg-primary text-white rounded-lg font-semibold text-xs shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all flex items-center justify-center gap-2">
                                                Submit application
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLeaveForm({ type: "Casual Leave", startDate: "", endDate: "", isHalfDay: false, reason: "" })}
                                                className="w-full py-3 bg-secondary/50 text-muted-foreground rounded-lg font-semibold text-xs hover:bg-secondary transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>



            </div>
        </div>
    );
};

/* Sub-components */

const LeaveBalanceCard = ({ label, total, used, color }: any) => {
    const percentage = (used / total) * 100;
    return (
        <div className="bg-card p-6 rounded-lg bespoke-border bespoke-shadow card-hover relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/60 mb-2">{label}</p>
                    <div className="flex items-end gap-2 mt-2">
                        <h3 className="text-5xl font-bold leading-none text-foreground/90">{total - used}</h3>
                        <span className="text-[10px] font-semibold text-muted-foreground pb-1">/ {total} total</span>
                    </div>
                </div>
                <div className={cn("p-3 rounded-xl", color.replace('bg-', 'bg-').replace('500', '100'), color.replace('bg-', 'text-'))}>
                    <Clock size={20} />
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-[9px] font-semibold text-muted-foreground/50">
                    <span>Utilization rate</span>
                    <span>{percentage.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden p-[1px] border border-border/5">
                    <div
                        className={cn("h-full transition-all duration-1000 rounded-full", color, "ai-glow")}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
            {/* <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-500">
                <FileText size={120} />
            </div> */}
        </div>
    );
};

const RequestRow = ({ type, dates, status, approver }: any) => (
    <tr className="hover:bg-primary/[0.02] transition-colors group">
        <td className="px-8 py-5">
            <div className="flex items-center gap-4">
                <div className={cn(
                    "p-2.5 rounded-lg",
                    type.includes('Sick') ? "bg-red-50 text-red-500" :
                        type.includes('Casual') ? "bg-blue-50 text-blue-500" : "bg-primary/5 text-primary"
                )}>
                    <Calendar size={16} />
                </div>
                <span className="text-sm font-semibold text-foreground/80">{type}</span>
            </div>
        </td>
        <td className="px-8 py-5">
            <span className="text-xs font-medium text-muted-foreground">{dates}</span>
        </td>
        <td className="px-8 py-5">
            <div className={cn(
                "px-3 py-1 rounded-full text-[9px] font-semibold inline-flex items-center gap-1.5",
                status === 'Approved' ? "bg-success/10 text-success" :
                    status === 'Rejected' ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
            )}>
                <div className={cn("w-1.5 h-1.5 rounded-full",
                    status === 'Approved' ? "bg-success" :
                        status === 'Rejected' ? "bg-destructive" :
                            "bg-warning"
                )} />
                {status}
            </div>
        </td>
        <td className="px-8 py-5">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-primary">
                    {approver.charAt(0)}
                </div>
                <span className="text-[10px] font-semibold text-foreground/60">{approver}</span>
            </div>
        </td>
        <td className="px-8 py-5 text-right">
            <button className="text-[10px] font-semibold text-primary hover:text-accent transition-colors px-4 py-2 bg-primary/5 rounded-lg hover:bg-primary/10">Details</button>
        </td>
    </tr>
);

export default TimeAndLeave;

