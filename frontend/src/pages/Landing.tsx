import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  LayoutDashboard,
  BarChart3,
  Wallet,
  Bell,
  Receipt,
  Wrench,
  MessageSquare,
  FileText,
  HelpCircle,
  Settings,
  Sun,
  LogOut,
  Download,
  ChevronDown,
  Search,
  Lock,
  ArrowLeft,
  RotateCw,
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-50/60 via-white to-white font-sans">
      {/* ───── Top navigation ───── */}
      <header className="w-full px-5 py-5">
        <nav className="w-full flex items-center justify-between">
          <Link to="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="Miraki Labs" className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain" />
          </Link>

          <ul className="hidden md:flex items-center gap-7 text-[13px] text-slate-600 font-medium">
            {["Overview", "Features", "Pricing", "Resources", "News", "Contact"].map((i) => (
              <li key={i} className="hover:text-slate-900 cursor-pointer">
                {i}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm"
            >
              Login
            </Link>
            <button className="md:hidden text-slate-700" aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </nav>
      </header>

      {/* ───── Hero ───── */}
      <section className="px-5 pt-10 lg:pt-16 pb-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex flex-wrap items-center justify-center gap-2 bg-white border border-slate-200 rounded-full py-1.5 pl-3 pr-1 text-[11px] sm:text-[12px] text-slate-600 shadow-sm max-w-full"
        >
          <span className="font-semibold text-slate-900">Miraki ESS 4.0</span>
          <span className="h-3 w-px bg-slate-300 hidden sm:inline-block" />
          <span className="hidden sm:inline">Manage your workforce easily</span>
          <a href="#" className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full transition-colors">
            Read More <ArrowRight size={12} />
          </a>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-7 text-[28px] sm:text-[38px] md:text-[46px] lg:text-[56px] font-extrabold text-slate-900 leading-[1.1] tracking-tight max-w-4xl mx-auto"
        >
          Track Attendance and Analyze Workforce Performance Data
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 text-[15px] text-slate-500 leading-relaxed max-w-xl mx-auto"
        >
          Easily track attendance, run payroll, and analyze performance data to make
          informed decisions and optimize workforce management.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8"
        >
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[14px] font-semibold transition-colors shadow-md shadow-emerald-600/20"
          >
            Get Started
          </Link>
        </motion.div>
      </section>

      {/* ───── Browser-framed dashboard mockup ───── */}
      <section className="px-5 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-[1280px] mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ArrowLeft size={14} />
              <ArrowRight size={14} />
              <RotateCw size={13} />
            </div>
            <div className="flex-1 flex items-center gap-2 mx-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] sm:text-[12px] text-slate-600 min-w-0">
              <Lock size={11} className="text-slate-400 shrink-0" />
              <span className="truncate">ess.miraki.in/dashboard</span>
            </div>
          </div>

          {/* Mini dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] min-h-[560px]">
            {/* Sidebar (hidden on mobile) */}
            <aside className="hidden md:flex bg-white border-r border-slate-200 p-3 flex-col">
              <div className="flex items-center gap-2 px-2 py-2">
                <img src="/logo.png" alt="" className="h-5 w-auto" />
                <span className="text-[13px] font-bold text-slate-900">Miraki ESS</span>
              </div>

              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-4 mb-2 px-2">
                Main Menu
              </p>
              <SidebarItem icon={<LayoutDashboard size={14} />} label="Dashboard" active />
              <SidebarItem icon={<BarChart3 size={14} />} label="Attendance" />
              <SidebarItem icon={<Wallet size={14} />} label="Payroll" />
              <SidebarItem icon={<Bell size={14} />} label="Leaves" />
              <SidebarItem icon={<Receipt size={14} />} label="Employees" />
              <SidebarItem icon={<Wrench size={14} />} label="Reports" />

              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-4 mb-2 px-2">
                Main Menu
              </p>
              <SidebarItem icon={<MessageSquare size={14} />} label="Feedback" />
              <SidebarItem icon={<FileText size={14} />} label="Documents" />
              <SidebarItem icon={<HelpCircle size={14} />} label="Help" />
              <SidebarItem icon={<Settings size={14} />} label="Settings" />

              <div className="mt-auto">
                <div className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-emerald-700 font-semibold">
                  <Sun size={14} />
                  Light Mode
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 text-[12px] text-slate-500">
                  <LogOut size={14} />
                  Log Out
                </div>
              </div>
            </aside>

            {/* Main area */}
            <main className="bg-slate-50 p-5">
              {/* Mini top nav */}
              <div className="flex items-center justify-between mb-5 text-[12px]">
                <span className="text-slate-400 font-medium">Overview</span>
                <div className="hidden md:flex items-center gap-5 text-slate-600 font-medium">
                  <span>Attendance</span>
                  <span>Payroll</span>
                  <span>Leaves</span>
                  <span>Employees</span>
                  <span>Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-md bg-emerald-600 text-white font-semibold">Login</button>
                </div>
              </div>

              {/* Section heading */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">Monitor your workforce</h3>
                  <p className="text-[12px] text-slate-500">
                    Track and manage your team&apos;s performance efficiently.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[12px] font-medium px-3 py-1.5 rounded-md">
                    Sep 11 – Sep 13 2024
                    <ChevronDown size={12} />
                  </button>
                  <button className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[12px] font-medium px-3 py-1.5 rounded-md">
                    <Download size={12} />
                    Export
                  </button>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Total Employees" value="128" delta="+4.5%" />
                <StatCard label="Total Payroll" value="₹48.2L" delta="+7.21%" />
                <StatCard label="Present Today" value="112" delta="+4.9%" />
                <StatCard label="Leave Requests" value="23" delta="+12.0%" />
              </div>

              {/* Team panel */}
              <div className="mt-5 bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-bold text-slate-900">My Team</h4>
                  <Search size={13} className="text-slate-400" />
                </div>

                <div className="flex items-center gap-4 text-[11px] font-semibold border-b border-slate-100 pb-2 mb-3">
                  <span className="text-emerald-700 border-b-2 border-emerald-600 pb-2 -mb-2">All</span>
                  <span className="text-slate-500">Active</span>
                  <span className="text-slate-500">On Leave</span>
                  <span className="text-slate-500">Remote</span>
                  <span className="text-slate-500">Onsite</span>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Employee rows */}
                  <div className="space-y-2">
                    {[
                      { name: "Ananya Sharma", role: "Senior Engineer · Bengaluru", status: "Active" },
                      { name: "Rahul Verma", role: "Product Designer · Mumbai", status: "Active" },
                      { name: "Priya Nair", role: "HR Manager · Pune", status: "Active" },
                      { name: "Karthik Menon", role: "Data Analyst · Hyderabad", status: "Active" },
                    ].map((e) => (
                      <div
                        key={e.name}
                        className="flex items-center gap-3 p-2 rounded-md border border-slate-100 hover:bg-slate-50"
                      >
                        <div className="h-9 w-9 rounded-md bg-gradient-to-br from-emerald-200 to-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-slate-900 truncate">{e.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{e.role}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Map placeholder */}
                  <div className="relative rounded-md border border-slate-200 bg-gradient-to-br from-emerald-50 via-slate-50 to-white min-h-[220px] overflow-hidden">
                    <svg
                      className="absolute inset-0 w-full h-full opacity-60"
                      viewBox="0 0 200 140"
                      preserveAspectRatio="none"
                    >
                      <path d="M0,90 C40,70 70,100 110,80 C140,65 170,95 200,75" stroke="#10B981" strokeWidth="0.6" fill="none" />
                      <path d="M0,60 C50,40 90,70 140,50 C170,40 190,55 200,50" stroke="#10B981" strokeWidth="0.6" fill="none" />
                      <path d="M0,30 C60,20 100,40 150,25 C180,18 190,30 200,28" stroke="#10B981" strokeWidth="0.6" fill="none" />
                    </svg>
                    <div className="absolute top-4 left-5 h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <div className="absolute top-16 left-24 h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <div className="absolute top-28 left-12 h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <div className="absolute top-10 right-16 h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <div className="absolute bottom-8 right-10 h-2 w-2 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/80 text-[10px] px-2 py-1 rounded-md border border-slate-200">
                      Team locations
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </motion.div>
      </section>

      {/* ───── Logos strip ───── */}
      <section className="px-5 pb-20">
        <p className="text-center text-[13px] text-slate-500 font-medium">
          Join 500+ organizations already growing
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-slate-400">
          {["Acme Corp", "Globex", "Initech", "Umbrella", "Wayne Ent.", "Hooli"].map((l) => (
            <span key={l} className="text-[18px] font-bold tracking-tight">
              {l}
            </span>
          ))}
        </div>
      </section>

      <footer className="w-full px-5 py-6 border-t border-slate-100 text-center text-[12px] text-slate-400">
        © {new Date().getFullYear()} Miraki Labs. All rights reserved.
      </footer>
    </div>
  );
};

const SidebarItem = ({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) => (
  <div
    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] ${active
        ? "bg-emerald-50 text-emerald-700 font-semibold"
        : "text-slate-600 hover:bg-slate-50 font-medium"
      }`}
  >
    {icon}
    {label}
  </div>
);

const StatCard = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta: string;
}) => (
  <div className="bg-white rounded-lg border border-slate-200 p-3">
    <p className="text-[11px] text-slate-500 font-medium">{label}</p>
    <div className="mt-1 flex items-center justify-between">
      <div>
        <p className="text-[18px] font-extrabold text-slate-900 leading-tight">{value}</p>
        <p className="text-[10px] text-slate-400">Last Month</p>
      </div>
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
        <ArrowUpRight size={10} />
        {delta}
      </span>
    </div>
  </div>
);

export default Landing;
