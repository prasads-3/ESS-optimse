import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Bell,
    CheckCircle2,
    AlertCircle,
    Info,
    ChevronRight,
    Loader2,
    Clock,
    CheckCheck
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
import { toast } from "sonner";

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    link: string;
    createdAt: string;
    updatedAt: string;
    customPlanRequest?: {
        id: number;
        organization: { name: string };
        status: string;
    };
}

export function SuperAdminNotificationDropdown() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/super-admin/notifications?page=1&limit=20`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/super-admin/notifications/unread-count`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/super-admin/notifications/${notificationId}`, {
                method: 'PATCH',
                credentials: 'include'
            });
            if (response.ok) {
                setNotifications(prev => 
                    prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        const loadingToast = toast.loading('Marking all as read...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/super-admin/notifications/mark-all-read`, {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                setUnreadCount(0);
                toast.success('All notifications marked as read', { id: loadingToast });
            }
        } catch (error) {
            console.error("Error marking all as read:", error);
            toast.error('Failed to mark all as read', { id: loadingToast });
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        fetchUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'custom_plan_request':
                return <CheckCircle2 size={14} />;
            case 'alert':
                return <AlertCircle size={14} />;
            default:
                return <Info size={14} />;
        }
    };

    const getNotificationColor = (type: string, isRead: boolean) => {
        if (isRead) return "bg-slate-50 text-slate-400";
        switch (type) {
            case 'custom_plan_request':
                return "bg-emerald-50 text-emerald-600";
            case 'alert':
                return "bg-rose-50 text-rose-600";
            default:
                return "bg-blue-50 text-blue-600";
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleTimeString();
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-10 w-10 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 rounded-2xl border-slate-200 shadow-xl overflow-hidden" align="end">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                            {unreadCount} New
                        </Badge>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                title="Mark all as read"
                            >
                                <CheckCheck size={12} />
                                Mark all
                            </button>
                        )}
                    </div>
                </div>

                <ScrollArea className="h-[350px]">
                    <div className="p-2 space-y-1">
                        {isLoading && notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                <p className="text-[11px] text-slate-400 font-medium tracking-tight">Loading notifications...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={cn(
                                        "flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group/item",
                                        !notif.isRead && "bg-blue-50/50"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg h-fit group-hover/item:scale-110 transition-transform",
                                        getNotificationColor(notif.type, notif.isRead)
                                    )}>
                                        {getNotificationIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="flex-1 min-w-0 text-[12px] font-bold text-slate-900 truncate">
                                                {notif.title}
                                            </h4>
                                            {!notif.isRead && (
                                                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2">
                                            {notif.message}
                                        </p>
                                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatTime(notif.createdAt)}
                                        </span>
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
                                    No notifications at the moment.
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={() => window.location.href = '/super-admin/custom-requests'}
                        className="w-full text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1.5 py-1.5"
                    >
                        View All Custom Requests
                        <ChevronRight size={14} />
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
