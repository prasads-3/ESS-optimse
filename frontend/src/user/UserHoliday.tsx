import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Info,
    Globe,
    MapPin,
    CheckCircle2,
    CalendarDays,
    PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Holiday {
    id: number;
    name: string;
    date: string;
    type: string;
    location: string;
}

const UserHoliday = () => {
    const [view, setView] = useState<"calendar" | "list">("calendar");
    const [searchTerm, setSearchTerm] = useState("");
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchHolidays = async (isBackground = false) => {
        try {
            if (!isBackground) setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/holidays`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setHolidays(data);
            }
        } catch (error) {
            console.error("Error fetching holidays:", error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
        const interval = setInterval(() => fetchHolidays(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredHolidays = holidays.filter(holiday =>
        holiday.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getHolidaysByMonth = (month: number) => {
        return filteredHolidays.filter(h => {
            const holidayDate = new Date(h.date);
            return holidayDate.getMonth() === month;
        });
    };

    const getHolidayForDay = (day: number) => {
        return filteredHolidays.find(h => {
            const holidayDate = new Date(h.date);
            return holidayDate.getDate() === day && holidayDate.getMonth() === currentMonth.getMonth();
        });
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-none m-3 mx-auto overflow-x-hidden">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <PartyPopper size={28} className="text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Company Holidays</h1>
                            <p className="text-sm text-muted-foreground mt-1">View all company holidays for the current year.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Card className="bg-card border-primary/10 shadow-sm">
                            <CardContent className="p-3 flex items-center gap-3">
                                <CalendarDays size={20} className="text-primary" />
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Yearly Holidays</p>
                                    <p className="text-lg font-bold text-primary">24</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
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
                                    view === "calendar" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Calendar
                            </button>
                            <button
                                onClick={() => setView("list")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                    view === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                                    <h2 className="text-lg font-bold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
                                    <div className="flex items-center gap-1">
                                        <button onClick={goToPreviousMonth} className="p-1.5 hover:bg-secondary rounded-lg"><ChevronLeft size={18} /></button>
                                        <button onClick={goToNextMonth} className="p-1.5 hover:bg-secondary rounded-lg"><ChevronRight size={18} /></button>
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
                                    {/* Empty cells for days before the first day of the month */}
                                    {[...Array(getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => (
                                        <div key={`empty-${i}`} className="h-24 lg:h-32" />
                                    ))}
                                    {/* Days of the month */}
                                    {[...Array(getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => {
                                        const day = i + 1;
                                        const holiday = getHolidayForDay(day);
                                        const isMandatory = holiday?.type === "Mandatory";
                                        const isOptional = holiday?.type === "Optional";
                                        
                                        return (
                                            <div
                                                key={day}
                                                className={cn(
                                                    "h-24 lg:h-32 border border-border/30 rounded-2xl p-3 transition-all cursor-pointer relative group",
                                                    holiday ? (isMandatory ? "bg-primary/5 border-primary/20 shadow-sm ring-1 ring-primary/10" : "bg-blue-50 border-blue-200") : "bg-muted/5 hover:bg-muted/10"
                                                )}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={cn(
                                                        "text-sm font-black",
                                                        holiday ? "text-accent bg-accent/10 w-7 h-7 flex items-center justify-center rounded-lg" : "text-muted-foreground"
                                                    )}>{day}</span>
                                                </div>

                                                {holiday && (
                                                    <div className="mt-2 space-y-1">
                                                        <span className={cn(
                                                            "block text-[10px] font-semibold leading-tight",
                                                            isMandatory ? "text-accent" : "text-blue-600"
                                                        )}>{holiday.name}</span>
                                                        <span className="block text-[9px] text-muted-foreground font-medium truncate">{holiday.location}</span>
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-[0.02] rounded-2xl transition-opacity" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Side Panel - Upcoming Holidays */}
                        <div className="space-y-6">
                            <div className="bg-card rounded-3xl border border-primary/10 p-6 shadow-sm space-y-4 bg-gradient-to-b from-white to-primary/[0.02]">
                                <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                                    <Info size={16} className="text-primary" />
                                    Holiday Information
                                </h2>
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-foreground/70 leading-relaxed">
                                        Company holidays are set by the admin team. All employees can view the complete list of holidays for the year.
                                    </p>
                                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-2">
                                        <CheckCircle2 size={16} className="text-primary mt-0.5" />
                                        <p className="text-xs font-bold text-primary leading-tight">Holidays are updated in real-time.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Upcoming Holidays */}
                            <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm">
                                <h2 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
                                    <CalendarDays size={16} />
                                    This Month's Holidays
                                </h2>
                                <div className="space-y-3">
                                    {getHolidaysByMonth(currentMonth.getMonth()).length > 0 ? (
                                        getHolidaysByMonth(currentMonth.getMonth()).map(holiday => (
                                            <div key={holiday.id} className="p-3 bg-secondary/50 rounded-xl border border-slate-100">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-foreground">{holiday.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                    </div>
                                                    <Badge variant={holiday.type === "Mandatory" ? "default" : "secondary"} className={
                                                        holiday.type === "Mandatory" 
                                                            ? "bg-primary/10 text-primary" 
                                                            : "bg-blue-100 text-blue-700"
                                                    }>
                                                        {holiday.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-muted-foreground/70 font-medium text-center py-4">No holidays this month</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* List View Implementation */
                    <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        {isLoading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                                <p className="text-sm text-muted-foreground mt-4">Loading holidays...</p>
                            </div>
                        ) : filteredHolidays.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/30">
                                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Holiday name</th>
                                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Date</th>
                                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Type</th>
                                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground">Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {filteredHolidays.map(holiday => (
                                        <tr key={holiday.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-semibold text-foreground">{holiday.name}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-medium text-muted-foreground">{new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <Badge className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-semibold",
                                                    holiday.type === "Mandatory" ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {holiday.type}
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <MapPin size={12} />
                                                    <span className="text-xs font-medium">{holiday.location}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                                    <CalendarDays size={32} className="text-muted-foreground/70" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">No Holidays Found</h3>
                                    <p className="text-sm text-muted-foreground mt-1">No holidays match your search criteria.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserHoliday;



