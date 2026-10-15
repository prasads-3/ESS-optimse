import { useAuth } from "@/contexts/AuthContext";
import { Search, Menu } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import EmployeeAvatar from "@/components/EmployeeAvatar";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    const target = trimmed
      ? `${location.pathname}?q=${encodeURIComponent(trimmed)}`
      : location.pathname;
    navigate(target, { replace: false });
  };

  return (
    <header className="h-16 bg-[#F7F7F8] border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 bespoke-shadow min-w-0 font-sans sticky top-0 z-40">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary active:scale-95"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <form onSubmit={handleSubmit} className="relative max-w-sm w-full hidden md:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees, documents..."
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border/80 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-sans"
          />
        </form>
      </div>

      {/* Right: icons + profile */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />

        <div className="h-6 w-px bg-border mx-2 hidden md:block" />

        <div 
          onClick={() => navigate(user?.role === 'admin' ? '/settings' : '/user/settings')}
          className="flex items-center gap-3 pl-2 group cursor-pointer hover:bg-secondary/50 p-1.5 rounded-xl transition-colors"
        >
          <div className="relative">
            <EmployeeAvatar
              name={user?.name || "User"}
              photo={user?.photo}
              size="sm"
              className="ring-2 ring-primary/10"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors font-sans truncate max-w-[120px]">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider font-sans">
              {user?.role === 'admin' ? 'Administrator' : (user?.title || 'Employee')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
