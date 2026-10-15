import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string }[];
  isAccessible?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  logoUrl?: string | null;
  orgInitial?: string;
  homeHref: string;
  navItems: NavItem[];
  bottomItems: NavItem[];
  onLogout: (e: React.MouseEvent) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  logoUrl,
  orgInitial,
  homeHref,
  navItems,
  bottomItems,
  onLogout,
}: SidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const isActive = (item: NavItem) => {
    if (item.href === location.pathname) return true;
    if (item.children) {
      return item.children.some((child) => child.href === location.pathname);
    }
    return false;
  };

  useEffect(() => {
    const activeParents = navItems
      .filter((item) =>
        item.children?.some((child) => child.href === location.pathname),
      )
      .map((item) => item.label);

    if (activeParents.length > 0) {
      setExpandedItems((prev) =>
        Array.from(new Set([...prev, ...activeParents])),
      );
    }
  }, [location.pathname, navItems]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label],
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:z-auto shrink-0 overflow-x-hidden",
          isOpen ? "left-0 w-64 shadow-2xl" : "-left-full w-64",
          "lg:left-0 lg:translate-x-0 lg:shadow-none",
          isOpen ? "lg:w-60" : "lg:w-[4.5rem]",
        )}
      >
        <div
          className={cn(
            "flex items-center min-h-[64px] h-auto py-3 shrink-0 border-b border-sidebar-border transition-all duration-300 overflow-hidden",
            isOpen ? "px-6 justify-between" : "px-2 justify-center",
          )}
        >
          {isOpen ? (
            <Link
              to={homeHref}
              className="flex flex-1 items-center gap-2.5 transition-all duration-300 h-full justify-center overflow-hidden"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  className="max-w-[180px] max-h-[80px] w-full h-full object-contain"
                  style={{ display: "block" }}
                  alt="Full Logo"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-sm shrink-0 text-base">
                  {orgInitial}
                </div>
              )}
            </Link>
          ) : (
            <Link
              to={homeHref}
              className="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-xl transition-all duration-300 overflow-hidden shrink-0"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  className="max-w-[40px] max-h-[40px] w-full h-full object-contain"
                  style={{ display: "block" }}
                  alt="Small Logo"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-sm shrink-0 text-sm">
                  {orgInitial}
                </div>
              )}
            </Link>
          )}
          {isOpen && (
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="text-muted-foreground hover:text-primary p-2 rounded-lg hover:bg-secondary transition-all duration-300"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
        {!isOpen && (
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="mx-auto mt-3 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-all duration-300"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Main Nav */}
        <nav
          className={cn(
            "flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar transition-all duration-300",
            !isOpen && "px-2 lg:px-3",
          )}
        >
          {navItems.map((item) => {
            const isAccessible = item.isAccessible !== false;

            return (
              <div key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.label)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive(item)
                          ? "bg-primary/5 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        !isOpen && "justify-center px-0 lg:px-0",
                      )}
                      title={!isOpen ? item.label : undefined}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {isOpen && (
                        <>
                          <span className="flex-1 text-left transition-all duration-300">
                            {item.label}
                          </span>
                          {expandedItems.includes(item.label) ? (
                            <ChevronLeft
                              className="-rotate-90 text-primary/40"
                              size={16}
                            />
                          ) : (
                            <ChevronRight
                              className="text-muted-foreground/40"
                              size={16}
                            />
                          )}
                        </>
                      )}
                    </button>
                    {isOpen && expandedItems.includes(item.label) && (
                      <div className="ml-9 mt-1 space-y-1 transition-all">
                        {item.children.map((child) => (
                          <Link
                            key={child.label}
                            to={child.href}
                            className={cn(
                              "block px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                              location.pathname === child.href
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-primary hover:bg-secondary",
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : item.onClick ? (
                  <button
                    onClick={isAccessible ? item.onClick : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      !isAccessible && "opacity-60",
                      !isOpen && "justify-center px-0 lg:px-0",
                    )}
                    title={
                      !isOpen
                        ? `${item.label}${!isAccessible ? " (Locked)" : ""}`
                        : undefined
                    }
                  >
                    <item.icon size={18} className="shrink-0" />
                    {isOpen && (
                      <span className="flex-1 text-left transition-all duration-300">
                        {item.label}
                      </span>
                    )}
                    {isOpen && !isAccessible && (
                      <Lock size={12} className="text-muted-foreground/50" />
                    )}
                  </button>
                ) : (
                  <Link
                    to={item.href || "#"}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      location.pathname === item.href
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      !isAccessible && "opacity-60 grayscale-[0.5]",
                      !isOpen && "justify-center px-0 lg:px-0",
                    )}
                    title={
                      !isOpen
                        ? `${item.label}${!isAccessible ? " (Locked)" : ""}`
                        : undefined
                    }
                  >
                    <item.icon size={18} className="shrink-0" />
                    {isOpen && (
                      <span className="flex-1 text-left transition-all duration-300">
                        {item.label}
                      </span>
                    )}
                    {isOpen && !isAccessible && (
                      <Lock size={12} className="text-muted-foreground/50" />
                    )}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Nav */}
        <div
          className={cn(
            "px-4 py-4 border-t border-sidebar-border mt-auto transition-all",
            !isOpen && "px-2 lg:px-0",
          )}
        >
          {bottomItems.map((item) => (
            <Link
              key={item.label}
              to={item.href || "#"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === item.href
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                !isOpen && "justify-center px-0",
              )}
              title={!isOpen ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {isOpen && (
                <span className="transition-all duration-300">
                  {item.label}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Logout Section */}
        <div
          className={cn(
            "px-4 py-4 border-t border-sidebar-border transition-all",
            !isOpen && "px-2 lg:px-0",
          )}
        >
          <button
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-destructive hover:bg-destructive/5 transition-all group",
              !isOpen && "justify-center px-0",
            )}
            title={!isOpen ? "Log Out" : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {isOpen && (
              <span className="transition-all duration-300">Log Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
