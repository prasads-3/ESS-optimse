import React from "react";
import {
    X,
    Receipt,
    Calendar,
    User,
    Tag,
    IndianRupee,
    Clock,
    Download,
    Eye,
    FileText,
    ExternalLink
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ExpenseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense: {
        id: number;
        employee: string;
        title: string;
        date: string;
        amount: string;
        status: string;
        type: string;
    } | null;
}

const ExpenseDetailModal = ({ isOpen, onClose, expense }: ExpenseDetailModalProps) => {
    if (!isOpen || !expense) return null;

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "Rejected": return "bg-rose-50 text-rose-700 border-rose-100";
            case "Pending": return "bg-amber-50 text-amber-700 border-amber-100";
            default: return "bg-slate-50 text-slate-700 border-slate-100";
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{expense.title}</h2>
                            <p className="text-xs text-slate-500 font-medium">Claim ID: EXP-{expense.id.toString().padStart(4, '0')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</span>
                        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase tracking-wider py-1 px-3 border", getStatusStyles(expense.status))}>
                            {expense.status}
                        </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <User size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Employee</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{expense.employee}</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Tag size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Category</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{expense.type}</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <Calendar size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Date</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{expense.date}</p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-400">
                                <IndianRupee size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Amount</span>
                            </div>
                            <p className="text-lg font-extrabold text-slate-900">{expense.amount}</p>
                        </div>
                    </div>

                    {/* Receipt Preview (Mock) */}
                    <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Attached Receipt</span>
                        <div className="relative group rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 flex flex-col items-center justify-center gap-4 hover:bg-slate-100 hover:border-primary/20 transition-all cursor-pointer">
                            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                                <FileText size={32} className="text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-700">receipt-102.pdf</p>
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">Click to view full document</p>
                            </div>
                            <div className="absolute top-4 right-4 bg-white p-1.5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink size={12} className="text-primary" />
                                <span className="text-[8px] font-bold uppercase text-primary">Open</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl border-slate-200 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        onClick={onClose}
                    >
                        <X size={16} />
                        Close Details
                    </Button>
                </div>

            </div>
        </div>
    );
};

export default ExpenseDetailModal;
