import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
    Home,
    Users,
    Briefcase,
    Clock,
    FolderOpen,
    Calendar,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Megaphone,
    MapPin,
    ShieldCheck,
    Lock,
    DollarSign,
    Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config";

import { Sidebar, NavItem } from "@/components/Sidebar";

const navItems: NavItem[] = [
    { label: "Admin Console", icon: Home, href: "/admin" },
   
    { label: "Workforce ", icon: FolderOpen, href: "/employees" },
    { label: "Attendance", icon: Calendar, href: "/admin/attendance" },
    { label: "Field Tasks", icon: Navigation, href: "/admin/field-tasks" },
    { label: "Leave list", icon: Clock, href: "/leave-list" },
    { label: "Payroll", icon: Megaphone, href: "/payroll" },
    { label: "Document Hub", icon: Briefcase, href: "/documentation" },
    { label: "Expenses", icon: DollarSign, href: "/expenses-list" },
    { label: "Announcements", icon: Megaphone, href: "/announcements" },
    { label: "Referrals", icon: Users, href: "/admin/referrals" },
    { label: "Tracking", icon: MapPin, href: "/tracking" },
];

const bottomItems: NavItem[] = [
    { label: "Subscription", icon: ShieldCheck, href: "/admin/subscription" },
    { label: "Admin Holidays", icon: Calendar, href: "/admin/holidays" },
    { label: "System Config", icon: Settings, href: "/settings" },
];

export function AdminSidebar({
    isOpen,
    onToggle,
}: {
    isOpen: boolean;
    onToggle: () => void;
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user, hasFeature } = useAuth();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const isActive = (item: NavItem) => {
        if (item.href === location.pathname) return true;
        if (item.children) {
            return item.children.some(child => child.href === location.pathname);
        }
        return false;
    };

    useEffect(() => {
        const activeParents = navItems
            .filter(item => item.children?.some(child => child.href === location.pathname))
            .map(item => item.label);

        if (activeParents.length > 0) {
            setExpandedItems(prev => Array.from(new Set([...prev, ...activeParents])));
        }
    }, [location.pathname]);

    const toggleExpand = (label: string) => {
        setExpandedItems((prev) =>
            prev.includes(label)
                ? prev.filter((i) => i !== label)
                : [...prev, label]
        );
    };

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            const redirectTo = await logout();
            toast.success("Logged out successfully");
            navigate(redirectTo);
        } catch (error) {
            console.error("Logout failed", error);
            navigate("/miraki");
        }
    };

    const rawLogo = (user as any)?.organization?.logo;
    const orgLogo = rawLogo
        ? (rawLogo.startsWith('/') ? `${API_BASE_URL}${rawLogo}` : rawLogo)
        : "/logo.png";

    const getFeatureStatus = (itemLabel: string) => {
        if (itemLabel === "Payroll Assets" || itemLabel === "Payroll" || itemLabel === "Payslip Studio") return hasFeature("payslip");
        if (itemLabel === "Announcements") return hasFeature("announcement");
        if (itemLabel === "Attendance") return hasFeature("attendance");
        if (itemLabel === "Tracking") return hasFeature("tracking");
        if (itemLabel === "Internal Docs") return hasFeature("document");
        return true;
    };

    const enhancedNavItems = navItems.map(item => {
        const isAccessible = getFeatureStatus(item.label);
        return {
            ...item,
            isAccessible,
        };
    });

    return (
        <Sidebar
            isOpen={isOpen}
            onToggle={onToggle}
            logoUrl={orgLogo}
            orgInitial="E"
            homeHref="/admin"
            navItems={enhancedNavItems}
            bottomItems={bottomItems}
            onLogout={handleLogout}
        />
    );
}
