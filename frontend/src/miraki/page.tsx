import { API_BASE_URL } from '@/config';
import { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const MirakiLoginPage = () => {
    const navigate = useNavigate();
    const { login, user: authUser } = useAuth();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const from = location.state?.from?.pathname || null;

    useEffect(() => {
        if (authUser) {
            let destination = from;
            if (!destination) {
                if (authUser.role === "super-admin") destination = "/super-admin";
                else if (authUser.role === "admin") destination = "/admin";
                else destination = "/user";
            }
            navigate(destination, { replace: true });
            return;
        }

        // Always show Miraki login, ignore lastOrgSlug auto-redirect as this is the branded path
        // (Removing the auto-redirect logic here since this folder is explicitly for Miraki)
    }, [authUser, navigate, from, location.pathname]);

    const getLocation = (): Promise<{ data: { latitude: number, longitude: number } | null, error?: string }> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ data: null, error: "Geolocation is not supported by your browser." });
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        data: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        }
                    });
                },
                (error) => {
                    let msg = "Unable to retrieve location.";
                    if (error.code === error.PERMISSION_DENIED) {
                        msg = "Access Denied: You must grant location access to sign in to the portal.";
                    } else if (error.code === error.TIMEOUT) {
                        msg = "Location Timeout: Please ensure your GPS is on and try again.";
                    }
                    resolve({ data: null, error: msg });
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const normalizedEmail = email.trim().toLowerCase();

        let locationData = null;
        try {
            const geo = await getLocation();
            locationData = geo.data;
            if (geo.error) {
                console.warn("[GEO] Optional location skip:", geo.error);
            }
        } catch (e) {
            console.warn("[GEO] Critical location skip:", e);
        }

        if (locationData) {
            localStorage.setItem("lastKnownLocation", JSON.stringify(locationData));
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: normalizedEmail, 
                    password,
                    location: locationData
                }),
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Login successful!");
                login(data.user);
            } else {
                toast.error(data.error || "Invalid credentials.");
            }
        } catch (error) {
            toast.error("Connection failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 lg:p-8 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[1100px] lg:min-h-[660px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col lg:flex-row"
            >
                {/* ── Left: Login Section ── */}
                <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col">
                    {/* Logo */}
                    <div className="flex items-center mb-8">
                        <img src="/logo.png" alt="Miraki Labs" className="h-20 w-auto object-contain" />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="max-w-[400px] w-full mx-auto"
                    >
                        <motion.div variants={itemVariants} className="mb-8">
                            <h1 className="text-[28px] lg:text-[32px] font-extrabold text-slate-900 tracking-tight mb-2 leading-tight">
                                Miraki Labs Portal
                            </h1>
                            <p className="text-slate-500 text-[14px] font-medium leading-relaxed">
                                Please sign in to access the Miraki Labs ESS ecosystem
                            </p>
                        </motion.div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-700 block">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors" size={16} />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Your email"
                                        className="w-full h-[46px] bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700/40 focus:bg-white transition-all"
                                    />
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-700 block">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors" size={16} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Your password"
                                        className="w-full h-[46px] bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 focus:border-emerald-700/40 focus:bg-white transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-[46px] bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-[14px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
                                >
                                    {isLoading ? (
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : "Sign In"}
                                </button>
                            </motion.div>
                        </form>
                    </motion.div>
                </div>

                {/* ── Right: Image Panel ── */}
                <div className="hidden lg:block w-1/2 relative">
                    <motion.img
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        src="/gen.png"
                        alt="ESS Application Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default MirakiLoginPage;
