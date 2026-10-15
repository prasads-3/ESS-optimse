import { useLocation, useNavigate } from "react-router-dom";
import {
    Home,
    Briefcase,
    FolderOpen,
    Calendar,
    Settings,
    Megaphone,
    Users,
    FileText,
    Navigation,
    CheckSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import { Sidebar, NavItem } from "@/components/Sidebar";

const navItems: NavItem[] = [
    { label: "Dashboard", icon: Home, href: "/user" },
    { label: "Attendance", icon: Calendar, href: "/user/attendance" },
    { label: "Field Tasks", icon: Navigation, href: "/user/field-tasks" },
    { label: "My Leaves", icon: FileText, href: "/user/leaves" },
    { label: "My Payslips", icon: FolderOpen, href: "/user/payslips" },
    { label: "Company Docs", icon: Briefcase, href: "/user/documentation" },
    { label: "My Expenses", icon: Briefcase, href: "/user/expenses" },
    { label: "Announcements", icon: Megaphone, href: "/user/announcements" },
    { label: "Refer & Earn", icon: Users, href: "/user/referrals" },
];

const bottomItems: NavItem[] = [
    { label: "Holidays", icon: Calendar, href: "/user/holidays" },
    { label: "Settings", icon: Settings, href: "/user/settings" },

];

export function UserSidebar({
    isOpen,
    onToggle,
}: {
    isOpen: boolean;
    onToggle: () => void;
    onApplyLeave?: () => void;
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user, hasFeature } = useAuth();

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
        : null;
    const orgName = (user as any)?.organization?.name ?? "";
    const orgInitial = orgName.trim().charAt(0).toUpperCase() || "E";

    const getFeatureStatus = (itemLabel: string) => {
        if (itemLabel === "My Payslips") return hasFeature("payslip");
        if (itemLabel === "Attendance") return hasFeature("attendance");
        if (itemLabel === "Announcements") return hasFeature("announcement");
        if (itemLabel === "Refer & Earn") return hasFeature("referral");
        if (itemLabel === "Company Docs") return hasFeature("document");
        return true;
    };

    // Managers (anyone who has direct reports) get an "Approvals" inbox, inserted
    // right after "My Leaves". isManager is provided by /api/auth/me.
    const isManager = !!(user as any)?.isManager;
    const baseNavItems: NavItem[] = isManager
        ? navItems.flatMap(item =>
            item.href === "/user/leaves"
                ? [item, { label: "Approvals", icon: CheckSquare, href: "/user/approvals" }]
                : [item]
          )
        : navItems;

    const enhancedNavItems = baseNavItems.map(item => ({
        ...item,
        isAccessible: getFeatureStatus(item.label),
    }));

    return (
        <Sidebar
            isOpen={isOpen}
            onToggle={onToggle}
            logoUrl={orgLogo}
            orgInitial={orgInitial}
            homeHref="/user"
            navItems={enhancedNavItems}
            bottomItems={bottomItems}
            onLogout={handleLogout}
        />
    );
}
