import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const location = useLocation();
    const { user, isLoading } = useAuth();

    // Only block first paint when there's no cached user to render. A returning
    // user is hydrated synchronously from localStorage, so we render the route
    // immediately and let background verifyAuth() redirect *if* the session turns
    // out to be invalid. This removes the serialized /api/auth/me round-trip from
    // the LCP critical path — the dashboard (and its data fetch) can start at once.
    if (isLoading && !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        // Single global login page for all tenants. Org-specific login URLs are gone.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRole = user.role?.toLowerCase() || "user";

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        // Role not allowed
        if (userRole === "user") {
            return <Navigate to="/user" replace />;
        }
        // Default fallback
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
