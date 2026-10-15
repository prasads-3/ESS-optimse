import { useState, useEffect, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { UserSidebar } from "./UserSidebar";
import { UserTopBar } from "./UserTopBar";
import ApplyLeaveModal from "./ApplyLeaveModal";
import { UserLayoutContext } from "./UserLayoutContext";

const PageLoader = () => (
    <div className="flex items-center justify-center w-full py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-emerald-700" />
    </div>
);

export const UserLayout = ({ children }: { children?: React.ReactNode }) => {
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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

    const openLeaveModal = () => setLeaveModalOpen(true);
    const refreshDashboard = () => setRefreshTrigger(prev => prev + 1);

    return (
        <UserLayoutContext.Provider value={{ openLeaveModal, refreshDashboard, refreshTrigger }}>
            <div className="flex min-h-screen w-full bg-background font-sans">
                <UserSidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    onApplyLeave={openLeaveModal}
                />
                <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                    <UserTopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                    <main className="flex-1 min-w-0 overflow-y-auto">
                        <Suspense fallback={<PageLoader />}>
                            {children ?? <Outlet />}
                        </Suspense>
                    </main>
                </div>
                <ApplyLeaveModal
                    isOpen={leaveModalOpen}
                    onClose={() => setLeaveModalOpen(false)}
                />
            </div>
        </UserLayoutContext.Provider>
    );
};
