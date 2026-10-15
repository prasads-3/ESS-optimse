import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Bell,
    CheckCircle2,
    AlertCircle,
    Info,
    ChevronRight,
    Loader2,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
    id: string;
    title: string;
    desc: string;
    time: string;
    updatedAt: string;
    type: 'success' | 'alert' | 'info';
}

export function NotificationDropdown() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        if (!user?.id && user?.id !== 0) return;
        
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/user/stats/${user.id}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data.notifications) {
                    setNotifications(data.notifications);
                }
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on mount and poll so the unread dot appears as soon as a new request
    // (e.g. a leave awaiting this manager's approval) arrives — not just on open.
    useEffect(() => {
        if (!user?.id && user?.id !== 0) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [user?.id]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-10 w-10 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                >
                    <Bell size={20} />
                    {notifications.length > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 rounded-2xl border-slate-200 shadow-xl overflow-hidden" align="end">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                        {notifications.length} New
                    </Badge>
                </div>
                
                <ScrollArea className="h-[350px]">
                    <div className="p-2 space-y-1">
                        {isLoading && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <p className="text-[11px] text-slate-400 font-medium tracking-tight">Updating alerts...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group/item"
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg h-fit group-hover/item:scale-110 transition-transform",
                                        notif.type === 'success' ? "bg-emerald-50 text-emerald-600" :
                                            notif.type === 'alert' ? "bg-rose-50 text-rose-600" :
                                                "bg-blue-50 text-blue-600"
                                    )}>
                                        {notif.type === 'success' ? <CheckCircle2 size={14} /> :
                                            notif.type === 'alert' ? <AlertCircle size={14} /> :
                                                <Info size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="flex-1 min-w-0 text-[12px] font-bold text-slate-900 truncate">
                                                {notif.title}
                                            </h4>
                                            <span className="shrink-0 text-[9px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                                                <Clock size={10} />
                                                {notif.time}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2">
                                            {notif.desc}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="p-3 bg-slate-50 rounded-full mb-3 text-slate-300">
                                    <Bell size={24} />
                                </div>
                                <p className="text-sm font-bold text-slate-900">All caught up!</p>
                                <p className="text-[11px] font-medium text-slate-400 mt-1">
                                    No new notifications at the moment.
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button className="w-full text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1.5 py-1.5">
                        View All Activity
                        <ChevronRight size={14} />
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

