import { IndianRupee, Megaphone, Calendar, MapPin, ShieldAlert, FileText, Gift } from 'lucide-react';

interface NoAccessBlockProps {
    feature: string;
}

const NoAccessBlock: React.FC<NoAccessBlockProps> = ({ feature }) => {
    const getIcon = () => {
        const feat = feature.toLowerCase();
        if (feat.includes('payslip') || feat.includes('payroll')) return <IndianRupee className="text-rose-500" size={32} />;
        if (feat.includes('announcement')) return <Megaphone className="text-rose-500" size={32} />;
        if (feat.includes('attendance')) return <Calendar className="text-rose-500" size={32} />;
        if (feat.includes('tracking')) return <MapPin className="text-rose-500" size={32} />;
        if (feat.includes('document') || feat.includes('policy')) return <FileText className="text-rose-500" size={32} />;
        if (feat.includes('referral')) return <Gift className="text-rose-500" size={32} />;
        return <ShieldAlert className="text-rose-500" size={32} />;
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 min-h-[60vh]">
            <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl shadow-rose-200/20 flex flex-col items-center max-w-md text-center transform transition-all">
                <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-8 border border-rose-100 shadow-inner">
                    {getIcon()}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
                <p className="text-sm text-slate-500 mt-4 leading-relaxed font-medium">
                    Your current subscription plan does not include the <strong>{feature} Management</strong> feature.
                    Please upgrade your plan to unlock this module for your organization.
                </p>
                <button
                    onClick={() => window.location.href = '/admin/subscription'}
                    className="mt-10 px-8 py-3.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                    View Upgrade Plans
                </button>
                <div className="mt-8 pt-8 border-t border-slate-100 w-full">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Standard Security Protocol</p>
                </div>
            </div>
        </div>
    );
};

export default NoAccessBlock;
