import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leaveDays } from "@/lib/leaveDays";
import { API_BASE_URL } from "@/config";
import { FilePreviewModal } from "@/components/FilePreviewModal";

interface LeaveDetailModalProps {
    leave: any;
    isOpen: boolean;
    onClose: () => void;
    onAction: (id: number, action: 'Approve' | 'Reject') => Promise<void>;
}

export const LeaveDetailModal: React.FC<LeaveDetailModalProps> = ({
    leave,
    isOpen,
    onClose,
    onAction
}) => {
    const [proofOpen, setProofOpen] = useState(false);

    if (!leave) return null;

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    const diffDays = leaveDays(leave.startDate, leave.endDate, leave.isHalfDay);

    const statusConfig = {
        Approved: {
            bg: "bg-emerald-50",
            text: "text-emerald-600",
            border: "border-emerald-100",
            dot: "bg-emerald-500"
        },
        Rejected: {
            bg: "bg-rose-50",
            text: "text-rose-600",
            border: "border-rose-100",
            dot: "bg-rose-500"
        },
        Pending: {
            bg: "bg-amber-50",
            text: "text-amber-600",
            border: "border-amber-100",
            dot: "bg-amber-500"
        }
    };

    const currentStatus = statusConfig[leave.status as keyof typeof statusConfig] || statusConfig.Pending;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden rounded-[20px] border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] font-sans">
                {/* Header Section */}
                <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            {leave.type}
                        </Badge>
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                            currentStatus.bg,
                            currentStatus.text,
                            currentStatus.border
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", currentStatus.dot)} />
                            {leave.status}
                        </div>
                    </div>

                    <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                        Leave Application Details
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-2 text-[13px] text-slate-500">
                        <span>Application ID: <span className="text-slate-700 font-medium">#{leave.id}</span></span>
                        <span className="text-slate-300">•</span>
                        <span>Applied on {new Date(leave.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                <div className="px-8 py-8 space-y-8 bg-white overflow-y-auto max-h-[70vh]">
                    {/* Requested By Section */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            {leave.employee?.photo ? (
                                <img src={leave.employee.photo} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User size={22} />
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] leading-none mb-1.5">Requested By</p>
                            <p className="text-[15px] font-bold text-slate-900 tracking-tight">{leave.employee?.name || "System User"}</p>
                        </div>
                    </div>

                    {/* Leave Information Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-4">
                            <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 shadow-sm">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Range</p>
                                <p className="text-[14px] font-semibold text-slate-700 leading-tight">
                                    {startDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} - {endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-4">
                            <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 shadow-sm">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                                <p className="text-[14px] font-semibold text-slate-700 leading-tight">
                                    {diffDays} {diffDays === 1 ? 'Day' : 'Days'}
                                    {leave.isHalfDay && <span className="text-emerald-500 ml-1.5 text-[11px] font-bold tracking-tight">(Half Day)</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reason Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Reason / Description</h3>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                            <p className="text-[14px] text-slate-600 leading-relaxed">
                                {leave.reason || "No reason provided with this application."}
                            </p>
                        </div>
                    </div>

                    {/* Attached proof (image preview or document link) — opens in a popup */}
                    {leave.document && (() => {
                        const raw: string = leave.document;
                        const href = raw.startsWith('/') ? `${API_BASE_URL}${raw}` : raw;
                        const isImage = /^data:image/i.test(raw) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(raw);
                        return (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Attached Proof</h3>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>
                                {isImage ? (
                                    <button type="button" onClick={() => setProofOpen(true)} className="block w-fit text-left">
                                        <img
                                            src={href}
                                            alt="Leave proof"
                                            className="max-h-72 rounded-2xl border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition"
                                        />
                                        <span className="mt-2 inline-block text-[11px] font-semibold text-primary hover:underline">View full image</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setProofOpen(true)}
                                        className="inline-flex items-center gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-semibold text-primary hover:bg-slate-100 transition-colors"
                                    >
                                        <FileText size={16} /> View attached document
                                    </button>
                                )}
                            </div>
                        );
                    })()}

                    {leave.status === 'Pending' && (
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-3">
                            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[12px] font-medium text-amber-700/80 leading-relaxed">
                                This request is waiting for administrative review. You can take action below.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-[13px] px-6 h-10 transition-all rounded-xl"
                    >
                        Close
                    </Button>

                    {leave.status === 'Pending' && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onAction(leave.id, 'Reject')}
                                className="border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-semibold text-[13px] px-5 h-10 transition-all rounded-xl"
                            >
                                Reject
                            </Button>
                            <Button
                                variant="default"
                                onClick={() => onAction(leave.id, 'Approve')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50 font-semibold text-[13px] px-5 h-10 transition-all rounded-xl"
                            >
                                Approve Request
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>

            <FilePreviewModal
                src={leave.document}
                open={proofOpen}
                onClose={() => setProofOpen(false)}
                title="Leave Proof"
            />
        </Dialog>
    );
};
