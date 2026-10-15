import { useState, useEffect, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { TopBar } from "@/components/TopBar";

const PageLoader = () => (
    <div className="flex items-center justify-center w-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-emerald-700" />
    </div>
);

export const AdminLayout = ({ children }: { children?: React.ReactNode }) => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex min-h-screen w-full">
            <AdminSidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <main className="flex-1 min-w-0 overflow-y-auto">
                    <Suspense fallback={<PageLoader />}>
                        {children ?? <Outlet />}
                    </Suspense>
                </main>
            </div>
        </div>
    );
};
