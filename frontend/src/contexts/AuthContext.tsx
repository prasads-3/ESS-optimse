import { API_BASE_URL } from '@/config';
import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
    id: string | number;
    name: string;
    role: string;
    email?: string;
    photo?: string;
    title?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => Promise<string>;
    updateUser: (updates: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    hasFeature: (featureName: string) => boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const saved = localStorage.getItem("user");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [lastLocation, setLastLocation] = useState<{ latitude: number, longitude: number } | null>(() => {
        try {
            const saved = localStorage.getItem("lastKnownLocation");
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Helper to capture location silently
    const refreshLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                setLastLocation(loc);
                localStorage.setItem("lastKnownLocation", JSON.stringify(loc));
            },
            undefined,
            { maximumAge: 300000 } // Use cached data up to 5 mins old
        );
    };

    useEffect(() => {
        // Initial location refresh
        refreshLocation();
        // Periodically refresh location every 10 mins
        const interval = setInterval(refreshLocation, 600000);
        return () => clearInterval(interval);
    }, []);

    // Activity heartbeat: while a logged-in employee is actually using the app
    // (interacting + tab visible) we ping the backend so the Employee Status
    // board keeps them "Active". When they stop interacting (or hide/close the
    // tab) for 5 minutes the pings stop and they fall back to "Idle". The login
    // itself counts as activity, so a user shows Active the moment they log in.
    useEffect(() => {
        if (!user?.id && user?.id !== 0) return;
        if (user?.role === "super-admin") return;

        const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // match backend IDLE_MINUTES
        let lastActivity = Date.now();           // logging in / mounting = active
        const markActivity = () => { lastActivity = Date.now(); };

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
        events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

        const ping = () => {
            // Only report presence if recently active and the tab is visible.
            if (document.visibilityState !== "visible") return;
            if (Date.now() - lastActivity > ACTIVE_WINDOW_MS) return;
            fetch(`${API_BASE_URL}/api/dashboard/heartbeat`, {
                method: "POST",
                credentials: "include",
            }).catch(() => { /* best-effort; ignore transient failures */ });
        };

        ping();                                  // immediate, so login → Active now
        const hb = setInterval(ping, 60000);     // then every minute while active
        return () => {
            clearInterval(hb);
            events.forEach((e) => window.removeEventListener(e, markActivity));
        };
    }, [user?.id, user?.role]);

    const verifyAuth = async () => {
        // Skip the call entirely if there's no stored user — avoids a 401 on the
        // login page where no auth cookie is present yet.
        if (!localStorage.getItem("user")) {
            setUser(null);
            setIsLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                localStorage.setItem("user", JSON.stringify(data.user));
            } else {
                setUser(null);
                localStorage.removeItem("user");
            }
        } catch (error) {
            console.error("Auth verification failed", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshUser = async () => {
        await verifyAuth();
    };

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "user" && !e.newValue) {
                // If "user" was removed from localStorage in another tab
                setUser(null);
            }
        };

        window.addEventListener("storage", handleStorageChange);
        verifyAuth();

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));

        // Auto-mark attendance on login for employee/admin roles. Fire-and-forget
        // so login UX is not blocked. Server enforces "already marked today" so
        // multiple logins in a single day are idempotent.
        const role = (userData?.role || "").toLowerCase();
        if (role === "user" || role === "admin") {
            autoMarkAttendance(userData);
        }
    };

    const autoMarkAttendance = (userData: User) => {
        const fire = (latitude: number | null, longitude: number | null) => {
            fetch(`${API_BASE_URL}/api/attendance/mark`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    userId: userData.id,
                    shift: "General",
                    location: "Office",
                    remarks: "Auto-marked on login",
                    latitude,
                    longitude,
                }),
            }).catch((err) => {
                console.warn("[AUTH] Auto-mark attendance failed:", err);
            });
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fire(pos.coords.latitude, pos.coords.longitude),
                () => fire(null, null),
                { timeout: 4000, maximumAge: 60_000 }
            );
        } else {
            fire(null, null);
        }
    };

    const logout = async (): Promise<string> => {
        // Use last known location immediately — no GPS wait so logout is instant
        const locationData = lastLocation;

        // Await the API call so the cookie is cleared before we navigate
        try {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: locationData }),
                credentials: 'include',
            });
        } catch (e) {
            console.error("[AUTH] Logout fetch failed", e);
        }

        // Clear local state
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("lastOrgSlug");
        localStorage.removeItem("loginEntryPath");

        // All tenants share the single global login page.
        const redirectTo = "/login";

        // Hard-navigate to fully reset router/state.
        window.location.replace(redirectTo);
        return redirectTo;
    };

    const updateUser = (updates: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
    };

    const hasFeature = (featureName: string): boolean => {
        if (!user) return false;
        
        const normalizedInput = featureName.toLowerCase().trim();
        
        // Referral is always accessible by default
        if (
            normalizedInput === 'referral' || 
            normalizedInput === 'refer' || 
            normalizedInput === 'refer & earn'
        ) return true;

        if (user.role === 'super-admin') return true;

        // System admin (seeded, no organization attached) bypasses plan gating entirely.
        if (
            user.email?.toLowerCase() === 'admin@mirakilabs.com' ||
            (user.role === 'admin' && !user.organizationId)
        ) return true;

        if (user.role === 'admin') {
            // admins always have access (plan is checked at org level)
            const plan = user.organization?.subscriptionPlan;
            if (!plan) return false;
        }

        const plan = user.organization?.subscriptionPlan;
        if (!plan) return false;

        const features = plan.features || [];
        const featuresArray = typeof features === 'string' ? (features.startsWith('[') ? JSON.parse(features) : [features]) : features;


        return (Array.isArray(featuresArray) ? featuresArray : []).some((f: string) => {
            if (typeof f !== 'string') return false;
            const normalizedF = f.toLowerCase().trim();

            // Direct inclusion check (either direction)
            if (normalizedF.includes(normalizedInput)) return true;
            if (normalizedInput.includes(normalizedF)) return true;

            // --- Payslip / Payroll / Assets ---
            if (normalizedInput === 'payslip' && (
                normalizedF.includes('payroll') ||
                normalizedF.includes('salary') ||
                normalizedF.includes('asset') ||
                normalizedF.includes('payslip')
            )) return true;

            // --- Announcement ---
            if (normalizedInput === 'announcement' && (
                normalizedF.includes('announcment') ||
                normalizedF.includes('announcement')
            )) return true;

            // --- Tracking ---
            if (normalizedInput === 'tracking' && normalizedF.includes('track')) return true;

            // --- Attendance ---
            if (normalizedInput === 'attendance' && (
                normalizedF.includes('attendence') ||
                normalizedF.includes('attend') ||
                normalizedF.includes('tracking')
            )) return true;

            // --- Document ---
            if (normalizedInput === 'document' && (
                normalizedF.includes('documentation') ||
                normalizedF.includes('internal') ||
                normalizedF.includes('doc')
            )) return true;

            // --- Referral ---
            if (normalizedInput === 'referral' && (
                normalizedF.includes('refer') ||
                normalizedF.includes('referral')
            )) return true;

            return false;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser, hasFeature, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

