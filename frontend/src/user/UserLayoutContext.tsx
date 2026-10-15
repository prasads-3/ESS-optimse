import { createContext, useContext } from "react";

interface UserLayoutContextType {
    openLeaveModal: () => void;
    refreshDashboard: () => void;
    refreshTrigger: number;
}

export const UserLayoutContext = createContext<UserLayoutContextType | undefined>(undefined);

export const useUserLayout = () => {
    const context = useContext(UserLayoutContext);
    if (!context) throw new Error("useUserLayout must be used within a UserLayout");
    return context;
};
