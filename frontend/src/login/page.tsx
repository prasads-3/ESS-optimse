import { API_BASE_URL } from '@/config';
import { useState, useEffect, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
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

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, user: authUser } = useAuth();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [logoFailed, setLogoFailed] = useState(false);
    const [orgBranding, setOrgBranding] = useState<{ name: string; logo: string | null } | null>(null);

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
    }, [authUser, navigate, from, location.pathname]);

    const getLocation = (): Promise<{ latitude: number; longitude: number } | null> =>
        new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => resolve(null),
                { timeout: 5000 }
            );
        });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const normalizedEmail = email.trim().toLowerCase();
        const locationData = await getLocation();
        if (locationData) localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    password,
                    location: locationData,
                }),
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Login successful!");
                localStorage.setItem("loginEntryPath", "/login");
                login(data.user);
                // /login is the global entry — don't retain org context here.
                localStorage.removeItem("lastOrgSlug");
                if (data.isTemporaryPassword) {
                    toast.info('Please change your temporary password in Settings.');
                }
            } else {
                toast.error(data.error || "Invalid credentials.");
            }
        } catch (error) {
            toast.error("Connection failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const lookupOrgByEmail = async (rawEmail: string) => {
        const normalized = rawEmail.trim().toLowerCase();
        if (!normalized || !/.+@.+\..+/.test(normalized)) {
            setOrgBranding(null);
            return;
        }
        try {
            const r = await fetch(`${API_BASE_URL}/api/org/by-email?email=${encodeURIComponent(normalized)}`);
            if (!r.ok) { setOrgBranding(null); return; }
            const data = await r.json();
            setOrgBranding({ name: data.name, logo: data.logo || null });
            setLogoFailed(false);
        } catch {
            setOrgBranding(null);
        }
    };

    // Login page logo is FIXED to the Miraki Labs brand — it must not change
    // per organization. Org branding (logo) appears only on the dashboard
    // after login (UserSidebar/AdminSidebar). orgBranding is still used for
    // the "Login to <org>" greeting text below.
    const logoSrc = '/logo.png';
    const logoAlt = 'Miraki Labs';

    const renderLogo = (variant: 'hero' | 'card') => {
        const imgClass = variant === 'hero'
            ? 'relative h-20 lg:h-28 w-auto object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)]'
            : 'h-24 lg:h-32 w-auto object-contain';
        if (logoSrc && !logoFailed) {
            return (
                <img
                    src={logoSrc}
                    alt={logoAlt}
                    className={imgClass}
                    onError={() => {
                        console.warn(`[Login] Logo failed to load: ${logoSrc}`);
                        setLogoFailed(true);
                    }}
                />
            );
        }
        return (
            <div className="inline-flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-black">M</span>
                </div>
                <span className="text-sm font-bold text-slate-800">Miraki Labs</span>
            </div>
        );
    };

    const sparkles = useMemo(
        () => Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: 2 + Math.random() * 4,
            duration: 4 + Math.random() * 6,
            delay: Math.random() * 8,
            drift: (Math.random() - 0.5) * 60,
            opacity: 0.4 + Math.random() * 0.6,
        })),
        []
    );

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-white">
            <style>{`
                @keyframes hero-fadein {
                    from { opacity: 0; transform: scale(1.05); }
                    to { opacity: 1; transform: scale(1); }
                }
                .hero-fadein { animation: hero-fadein 0.8s ease-out both; }
                @keyframes sparkle-fall {
                    0% {
                        transform: translate3d(0, -10vh, 0) scale(0.6);
                        opacity: 0;
                    }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% {
                        transform: translate3d(var(--drift, 0px), 110vh, 0) scale(1);
                        opacity: 0;
                    }
                }
                @keyframes sparkle-twinkle {
                    0%, 100% { filter: brightness(1) blur(0.3px); }
                    50% { filter: brightness(1.8) blur(0px); }
                }
                .sparkle-rain {
                    position: absolute;
                    top: 0;
                    border-radius: 9999px;
                    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,236,179,0.9) 40%, rgba(255,200,120,0) 100%);
                    box-shadow: 0 0 6px rgba(255,236,179,0.9), 0 0 12px rgba(255,200,120,0.5);
                    animation: sparkle-fall linear infinite, sparkle-twinkle ease-in-out infinite;
                    will-change: transform, opacity;
                    pointer-events: none;
                }
            `}</style>

            {/* ── Left: Hero Image Panel ── */}
            <div className="relative w-full lg:w-1/2 min-h-[320px] lg:min-h-screen overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-[5]">
                    {sparkles.map((s) => (
                        <span
                            key={`l-${s.id}`}
                            className="sparkle-rain"
                            style={{
                                left: `${s.left}%`,
                                width: `${s.size}px`,
                                height: `${s.size}px`,
                                opacity: s.opacity,
                                animationDuration: `${s.duration}s, ${1.5 + Math.random()}s`,
                                animationDelay: `${s.delay}s, ${Math.random()}s`,
                                ['--drift' as any]: `${s.drift}px`,
                            }}
                        />
                    ))}
                </div>
                <img
                    src="/bg.jpg"
                    alt=""
                    // React 18.3 doesn't normalize the camelCase `fetchPriority`
                    // and warns; emit the lowercase HTML attribute instead.
                    {...({ fetchpriority: 'high' } as any)}
                    decoding="sync"
                    width={960}
                    height={1080}
                    className="absolute inset-0 w-full h-full object-cover hero-fadein"
                />
                <div className="absolute inset-0 bg-emerald-600/25 mix-blend-multiply" />
                <div className="absolute inset-0 bg-emerald-400/10 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/50 via-transparent to-transparent" />

                <div className="absolute top-0 left-0 right-0 px-8 lg:px-12 py-6 lg:py-8 flex items-center justify-between z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                        className="relative inline-flex items-center justify-center"
                    >
                        <div
                            className="absolute inset-0 -m-16 lg:-m-24 pointer-events-none animate-pulse"
                            style={{
                                background:
                                    'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,236,179,0.55) 25%, rgba(255,200,120,0.25) 45%, rgba(255,255,255,0) 70%)',
                                filter: 'blur(8px)',
                            }}
                        />
                        <div
                            className="absolute inset-0 -m-20 lg:-m-28 pointer-events-none opacity-70 mix-blend-screen"
                            style={{
                                background:
                                    'conic-gradient(from 0deg, rgba(255,255,255,0.0) 0deg, rgba(255,255,255,0.45) 18deg, rgba(255,255,255,0) 36deg, rgba(255,255,255,0) 90deg, rgba(255,255,255,0.35) 108deg, rgba(255,255,255,0) 126deg, rgba(255,255,255,0) 180deg, rgba(255,255,255,0.45) 198deg, rgba(255,255,255,0) 216deg, rgba(255,255,255,0) 270deg, rgba(255,255,255,0.35) 288deg, rgba(255,255,255,0) 306deg)',
                                WebkitMaskImage:
                                    'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
                                maskImage:
                                    'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
                                filter: 'blur(2px)',
                            }}
                        />
                        <div className="relative">
                            {renderLogo('hero')}
                        </div>
                    </motion.div>
                    <a
                        href="https://www.mirakilabs.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors"
                    >
                        View Website
                        <ArrowRight size={16} />
                    </a>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 z-10">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-white text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight"
                    >
                        Employee
                        <br />
                        <span className="bg-gradient-to-r from-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                            Self Service
                        </span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.6 }}
                        className="mt-4 text-white/85 text-sm lg:text-base max-w-md leading-relaxed"
                    >
                        Experience the next generation of enterprise management with minimalist
                        design, seamless interactions, and powerful features.
                    </motion.p>
                </div>
            </div>

            {/* ── Right: Login Form Panel ── */}
            <div className="relative w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 bg-gradient-to-br from-slate-50 via-white to-amber-50/40 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-[5]">
                    {sparkles.map((s) => (
                        <span
                            key={`r-${s.id}`}
                            className="sparkle-rain"
                            style={{
                                left: `${(s.left + 37) % 100}%`,
                                width: `${s.size}px`,
                                height: `${s.size}px`,
                                opacity: s.opacity * 0.7,
                                animationDuration: `${s.duration}s, ${1.5 + Math.random()}s`,
                                animationDelay: `${s.delay + 1}s, ${Math.random()}s`,
                                ['--drift' as any]: `${s.drift}px`,
                            }}
                        />
                    ))}
                </div>
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none animate-pulse"
                    style={{
                        background:
                            'radial-gradient(circle, rgba(255,236,179,0.85) 0%, rgba(255,200,120,0.45) 25%, rgba(255,180,90,0.18) 45%, rgba(255,255,255,0) 70%)',
                        filter: 'blur(10px)',
                    }}
                />
                <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-60 mix-blend-multiply"
                    style={{
                        background:
                            'conic-gradient(from 0deg, rgba(217,119,6,0) 0deg, rgba(217,119,6,0.18) 18deg, rgba(217,119,6,0) 36deg, rgba(217,119,6,0) 90deg, rgba(217,119,6,0.14) 108deg, rgba(217,119,6,0) 126deg, rgba(217,119,6,0) 180deg, rgba(217,119,6,0.18) 198deg, rgba(217,119,6,0) 216deg, rgba(217,119,6,0) 270deg, rgba(217,119,6,0.14) 288deg, rgba(217,119,6,0) 306deg)',
                        WebkitMaskImage:
                            'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
                        maskImage:
                            'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
                        filter: 'blur(3px)',
                    }}
                />
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="relative z-10 w-full max-w-[min(540px,100%)] bg-white/90 backdrop-blur-xl rounded-3xl border border-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.12)] p-6 sm:p-8 md:p-10 lg:p-14"
                >
                    <motion.div variants={itemVariants} className="mb-6 flex justify-start">
                        {renderLogo('card')}
                    </motion.div>

                    <motion.div variants={itemVariants} className="mb-8">
                        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight break-words">
                            Login 
                        </h1>
                        <p className="mt-3 text-slate-500 text-sm sm:text-base">
                            Sign in to your account to continue.
                        </p>
                    </motion.div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-[11px] font-bold tracking-wider text-slate-700 block uppercase">
                                Work Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 transition-colors" size={16} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={(e) => lookupOrgByEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full h-[56px] bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="space-y-2">
                            <label className="text-[11px] font-bold tracking-wider text-slate-700 block uppercase">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-700 transition-colors" size={16} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-[56px] bg-white border border-slate-200 rounded-xl pl-10 pr-10 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-[58px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[15px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
                            >
                                {isLoading ? (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Sign in
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;
