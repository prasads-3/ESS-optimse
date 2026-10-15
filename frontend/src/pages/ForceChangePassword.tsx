import { API_BASE_URL } from "@/config";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Forced first-login password change. The hard gate in ProtectedRoute routes
 * any authenticated user whose `isTemporaryPassword` is still true here and
 * blocks the rest of the app until they replace the temporary password. The
 * backend (POST /api/auth/change-password) clears `isTemporaryPassword` on
 * success, so refreshUser() lifts the gate.
 */
const roleHome = (role?: string) => {
    switch ((role || "").toLowerCase()) {
        case "super-admin": return "/super-admin";
        case "admin": return "/admin";
        default: return "/user";
    }
};

const ForceChangePassword = () => {
    const navigate = useNavigate();
    const { user, refreshUser, logout } = useAuth();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) return toast.error("New password must be at least 6 characters.");
        if (newPassword !== confirm) return toast.error("Passwords do not match.");
        if (newPassword === currentPassword) return toast.error("New password must be different from the temporary one.");

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId: user?.id, currentPassword, newPassword }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Failed to change password");
            toast.success("Password updated. Welcome aboard!");
            await refreshUser(); // re-fetches /api/auth/me → isTemporaryPassword:false → gate lifts
            navigate(roleHome(user?.role), { replace: true });
        } catch (err: any) {
            toast.error(err?.message || "Failed to change password");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                        <ShieldCheck className="text-emerald-600" size={28} />
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900">Set a new password</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        You're signed in with a temporary password. Choose a new password to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                        label="Temporary password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        placeholder="Enter the temporary password"
                        autoFocus
                    />
                    <Field
                        label="New password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="At least 6 characters"
                    />
                    <Field
                        label="Confirm new password"
                        value={confirm}
                        onChange={setConfirm}
                        placeholder="Re-enter new password"
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                        Update password
                    </button>
                </form>

                <button
                    onClick={() => void logout()}
                    className="mt-4 w-full text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
};

function Field({
    label, value, onChange, placeholder, autoFocus,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">{label}</label>
            <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                    type="password"
                    required
                    autoFocus={autoFocus}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                />
            </div>
        </div>
    );
}

export default ForceChangePassword;
