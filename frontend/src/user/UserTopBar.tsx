import { useAuth } from "@/contexts/AuthContext";
import { Menu, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import EmployeeAvatar from "@/components/EmployeeAvatar";

interface UserTopBarProps {
    onMenuClick: () => void;
}

export function UserTopBar({ onMenuClick }: UserTopBarProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <header className="h-16 bg-[#F7F7F8] border-b border-border/60 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-40 font-sans">
            {/* AI Accents */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

            {/* Left Section: Menu & Search */}
            <div className="flex items-center gap-6 flex-1 max-w-xl">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-primary active:scale-95"
                    title="Toggle Sidebar"
                >
                    <Menu size={20} />
                </button>


            </div>

            {/* Right Section: Actions & Profile */}
            <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { window.location.href = "mailto:"; }}
                        className="p-2 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-primary active:scale-95"
                        title="Email"
                    >
                        <Mail size={20} />
                    </button>

                    <NotificationDropdown />

                </div>

                <div className="h-8 w-px bg-border mx-1 hidden md:block" />

                <button 
                    onClick={() => navigate(user?.role === 'admin' ? '/settings' : '/user/settings')}
                    className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-secondary transition-all duration-300 group border border-transparent hover:border-border text-left"
                >
                    <div className="text-right hidden lg:block pr-1">
                        <p className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors font-sans truncate max-w-[150px]">
                            {user?.name || "Member User"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-sans truncate">
                            {user?.role === 'admin' ? 'System Administrator' : (user?.title || "Team Member")}
                        </p>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-5 group-hover:opacity-30 transition duration-500"></div>
                        <div className="relative h-9 w-9 rounded-full overflow-hidden border-2 border-card shadow-sm transition-transform group-active:scale-95">
                            <EmployeeAvatar
                                name={user?.name || "User"}
                                photo={user?.photo}
                                size="sm"
                                className="w-full h-full"
                            />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
                    </div>
                </button>
            </div>
        </header>
    );
}
