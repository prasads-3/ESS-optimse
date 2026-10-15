import { API_BASE_URL } from '@/config';
import React, { useState } from 'react';
import { X, Loader2, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REASONS = [
    'Project-related expenses',
    'Client entertainment',
    'Training & development',
    'Emergency travel',
    'Equipment purchase',
    'Medical reimbursement',
    'Other',
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AdditionalMoneyRequestModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const [reason, setReason] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [urgency, setUrgency] = useState<'Normal' | 'Medium' | 'High'>('Normal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const reset = () => {
        setReason('');
        setAmount('');
        setDescription('');
        setUrgency('Normal');
        setSubmitted(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !amount) {
            toast.error('Please fill in all required fields.');
            return;
        }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Please enter a valid amount greater than 0.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/money-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason, amount: parsedAmount, description, urgency }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitted(true);
                if (onSuccess) onSuccess();
                toast.success('Request submitted! Check your email for confirmation.');
            } else {
                toast.error(data.error || 'Failed to submit request.');
            }
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const urgencyOptions: { value: 'Normal' | 'Medium' | 'High'; label: string; color: string }[] = [
        { value: 'Normal', label: 'Normal', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
        { value: 'Medium', label: 'Medium', color: 'border-amber-300 bg-amber-50 text-amber-700' },
        { value: 'High', label: 'High', color: 'border-red-300 bg-red-50 text-red-700' },
    ];

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                            <DollarSign size={16} className="text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Request Additional Funds</h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">A confirmation email will be sent to you</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
                    {submitted ? (
                        /* ── Success State ── */
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                <CheckCircle2 size={28} className="text-emerald-600" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mt-1">Request Submitted!</h3>
                            <p className="text-xs text-slate-500 max-w-[280px]">
                                Your additional money request has been sent. A confirmation email has been delivered to your inbox and the admin has been notified.
                            </p>
                            <button
                                onClick={handleClose}
                                className="mt-3 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        /* ── Form ── */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-600">
                                    Reason <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-500 transition-all"
                                >
                                    <option value="" disabled>Select a reason…</option>
                                    {REASONS.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-600">
                                    Amount (₹) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        placeholder="Enter amount"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Urgency */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-600">Urgency Level</label>
                                <div className="flex gap-2">
                                    {urgencyOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setUrgency(opt.value)}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg border text-[12px] font-semibold transition-all',
                                                urgency === opt.value
                                                    ? opt.color
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-600">
                                    Additional Details <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Provide any extra context for the admin…"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Info banner */}
                            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                                <AlertCircle size={13} className="text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-600">
                                    On submission, you'll receive a confirmation email and the admin will be notified to review your request.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-sm shadow-emerald-700/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                                    ) : (
                                        'Submit Request'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdditionalMoneyRequestModal;
