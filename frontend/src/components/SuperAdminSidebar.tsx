import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  RefreshCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Shield,
  MessageSquare,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SuperAdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const navSections = [
  {
    section: 'Management',
    items: [
      { icon: LayoutDashboard, label: 'Global Overview', href: '/super-admin/dashboard' },
      { icon: Building2, label: 'Organizations', href: '/super-admin/organizations' },
      { icon: CreditCard, label: 'Subscription Plans', href: '/super-admin/plans' },
      { icon: MessageSquare, label: 'Custom Requests', href: '/super-admin/custom-requests' },
      { icon: Mail, label: 'Organization Email', href: '/super-admin/organization-email' },
    ],
  },
  {
    section: 'System',
    items: [
      { icon: RefreshCcw, label: 'Lifecycle Engine', href: '/super-admin/lifecycle' },
      { icon: FileText, label: 'Event Audit Log', href: '/super-admin/audit' },
    ],
  },
];

function SideItem({
  icon: Icon,
  label,
  href,
  collapsed,
}: {
  icon: any;
  label: string;
  href: string;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={href}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-blue-200/70 hover:bg-white/8 hover:text-white'
        } ${collapsed ? 'justify-center' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active left accent bar */}
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-white rounded-r-full" />
          )}
          <Icon
            size={17}
            className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-300/70 group-hover:text-white'}`}
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden text-[13px] font-semibold"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Tooltip in collapsed mode */}
          {collapsed && (
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[200] shadow-xl">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

export function SuperAdminSidebar({ collapsed, setCollapsed }: SuperAdminSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/miraki');
    } catch {
      navigate('/miraki');
    }
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="sticky left-0 top-0 h-screen flex flex-col z-50 overflow-hidden shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.15)]"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)' }}
    >
      {/* Brand */}
      <div className={`py-5 flex items-center border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        <Link to="/super-admin" className="w-full flex justify-center group">
          <div className={`flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl shadow-black/20 w-full transition-all group-hover:bg-white/80 group-hover:scale-[1.02] ${collapsed ? 'py-3 px-2' : 'py-4 px-5'}`}>
            <img
              src="/logo.png"
              alt="Miraki Labs"
              className={`${collapsed ? 'h-8' : 'h-16 w-full'} object-contain transition-all`}
            />
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6 scrollbar-hide">
        {navSections.map((section) => (
          <div key={section.section}>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-blue-300/50 uppercase tracking-[0.15em] px-3 mb-2"
                >
                  {section.section}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SideItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/8 p-3 space-y-1 shrink-0">
        {/* User card */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-bold">SA</span>
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="text-[13px] font-semibold text-white truncate leading-tight">Super Admin</p>
                <p className="text-[10px] text-blue-300/60 font-medium truncate">System Master</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Log Out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200/60 hover:bg-red-500/15 hover:text-red-300 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-[13px] font-semibold whitespace-nowrap overflow-hidden"
              >
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-blue-300/40 hover:bg-white/8 hover:text-white transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? <ChevronRight size={15} /> : (
            <>
              <ChevronLeft size={15} />
              <span className="text-[11px] font-semibold whitespace-nowrap">Collapse</span>
            </>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}` }} />
    </motion.aside>
  );
}
