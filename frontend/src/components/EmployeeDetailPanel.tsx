import { X, Mail, Phone, MapPin, Linkedin, Briefcase, Calendar, ShieldCheck, Fingerprint, Lock, Globe, RefreshCcw } from "lucide-react";
import { cn, capitalize } from "@/lib/utils";
import { Employee } from "./EmployeeCard";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { useAuth } from "@/contexts/AuthContext";

interface EmployeeDetailPanelProps {
    employee: Employee | null;
    onClose: () => void;
}

export function EmployeeDetailPanel({ employee, onClose }: EmployeeDetailPanelProps) {
    const [isResetting, setIsResetting] = useState(false);
    const [newPassword, setNewPassword] = useState<string | null>(null);
    const { user } = useAuth();

    // The employees LIST endpoint omits heavy/per-employee fields (KYC document
    // URLs, etc.) for payload size. Fetch the full record by id so the
    // documents section can show what the employee uploaded.
    const [details, setDetails] = useState<Employee | null>(employee);
    useEffect(() => {
        setDetails(employee);
        if (employee?.id) {
            fetch(`${API_BASE_URL}/api/employees/${employee.id}`, { credentials: 'include' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (d) setDetails((prev) => ({ ...(prev as Employee), ...d })); })
                .catch(() => {});
        }
    }, [employee?.id]);

    const rawLogo = (user as any)?.organization?.logo;
    const orgLogo = rawLogo
        ? (rawLogo.startsWith('/') ? `${API_BASE_URL}${rawLogo}` : rawLogo)
        : "/logo.png";

    if (!employee) return null;

    const handleResetPassword = async () => {
        setIsResetting(true);
        try {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^";
            let generatedPassword = "";
            for (let i = 0; i < 12; i++) {
                generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            const response = await fetch(`${API_BASE_URL}/api/employees/${employee.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    password: generatedPassword,
                    isTemporaryPassword: true,
                    resetToken: null,
                    resetTokenExpiry: null
                }),
                credentials: 'include',
            });

            if (response.ok) {
                setNewPassword(generatedPassword);
                toast.success('Password reset successfully');
            } else {
                toast.error('Failed to reset password');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            toast.error('Connection error. Please try again.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100000] pointer-events-none">
            {/* Backdrop - Increased depth and blur for focus */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px] animate-in fade-in duration-300 pointer-events-auto"
                onClick={onClose}
            />

            {/* Panel - Full Height with explicit left border and deep shadow for perception */}
            <div className="absolute top-0 right-0 h-full w-full sm:w-[840px] lg:w-[110vw] xl:w-[115vw] lg:min-w-[500px] lg:max-w-[1000px] bg-white border-l border-slate-200/60 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.15)] animate-in slide-in-from-right duration-500 flex flex-col font-sans overflow-hidden pointer-events-auto">


                {/* Header/Banner Section */}
                <div className="relative h-60 bg-slate-50 border-b border-slate-200/60 shrink-0">

                    {/* Decorative Background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute top-1/2 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                    </div>

                    {/* Member Profile Badge */}
                    <div className="absolute top-6 left-6 z-10">
                        <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold tracking-[0.15em] text-slate-600 border border-slate-200/60 shadow-sm uppercase">
                            Member Profile
                        </span>
                    </div>

                    {/* Organization Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <img
                            src={orgLogo}
                            alt="Organization Logo"
                            className="max-h-24 max-w-[60%] object-contain opacity-90"
                        />
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2.5 bg-white/90 hover:bg-white text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200/50 shadow-sm z-20 transition-all active:scale-95 group"
                        title="Close details"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>

                    {/* Profile Photo - Offset positioning */}
                    <div className="absolute -bottom-10 left-10 z-10">
                        <div className="relative group">
                            <div className="absolute -inset-1.5 bg-gradient-to-tr from-emerald-500/20 to-primary/20 rounded-[28px] blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
                            <EmployeeAvatar
                                name={employee.name}
                                photo={employee.photo}
                                size="xl"
                                className="relative w-28 h-28 rounded-[24px] border-4 border-white shadow-xl group-hover:scale-[1.05] transition-all duration-500 ease-out"
                            />
                            <div className={cn(
                                "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center",
                                employee.online ? "bg-emerald-500" : "bg-slate-300"
                            )}>
                                {employee.online && <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 pt-14 px-10 pb-12 space-y-10 overflow-y-auto custom-scrollbar">
                    {/* Identity Heading */}
                    <div className="space-y-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">{employee.name}</h2>
                                <p className="text-base font-bold text-emerald-600 tracking-wide mt-1 uppercase text-[12px]">{employee.title}</p>

                            </div>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase",
                                employee.online ? "bg-emerald-50/80 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                            )}>
                                {employee.online ? "Available" : "Away"}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-[13px] font-semibold text-slate-400">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[11px] font-bold text-slate-500">
                                <Fingerprint size={12} className="text-primary/60" />
                                {employee.employeeId}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-slate-300" />
                                {employee.location}
                            </span>
                        </div>
                    </div>



                    {/* Detailed Information */}
                    <div className="space-y-8">
                        <h3 className="text-[13px] font-bold text-slate-600 uppercase  border-b border-slate-100 pb-4">Professional Profile</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <DetailItem icon={Briefcase} label="Division / Department" value={`${employee.department} / ${employee.team}`} />
                            <DetailItem 
                                icon={ShieldCheck} 
                                label="Operational Lead" 
                                value={employee.reportsToName ? `${employee.reportsToName}${employee.reportsTo ? ` (${employee.reportsTo})` : ''}` : (employee.reportsTo || "Not Assigned")} 
                            />
                            <DetailItem icon={Calendar} label="Member Since" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' }) : "Not Specified"} />
                            <DetailItem icon={Mail} label="Corporate Email" value={employee.email} />
                            <DetailItem icon={Globe} label="Personal Email" value={employee.personalEmail || "Not Provided"} />
                            <DetailItem icon={Phone} label="Contact Number" value={employee.phone} />
                            <DetailItem icon={Briefcase} label="Employment Type" value={capitalize(employee.employmentType) || "Full-time"} />
                            <DetailItem icon={ShieldCheck} label="Work Status" value={capitalize(employee.status) || "Active"} />
                            <DetailItem icon={Linkedin} label="LinkedIn Profile" value={employee.linkedin || "Not Linked"} isLink={!!employee.linkedin} />
                            <DetailItem icon={ShieldCheck} label="Expense Limit" value={employee.expenseLimit > 0 ? `₹${employee.expenseLimit.toLocaleString("en-IN")}` : "No Limit"} />
                        </div>
                    </div>

                    {/* Reset Password Section */}
                    <div className="space-y-6">
                        <h3 className="text-[13px] font-bold text-slate-600 uppercase border-b border-slate-100 pb-4">Account Access</h3>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-xl text-primary border border-slate-100 shadow-sm">
                                        <Lock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Security Control</p>
                                        <p className="text-[13px] font-medium text-slate-700 tracking-tight">System Access Password</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleResetPassword}
                                    disabled={isResetting}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 hover:shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <RefreshCcw size={14} className={cn(isResetting && "animate-spin")} />
                                    {isResetting ? "Resetting..." : "Reset Password"}
                                </button>
                            </div>

                            {newPassword && (
                                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between animate-in zoom-in-95 duration-300">
                                    <div>
                                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1 leading-none">New Generated Password</p>
                                        <p className="text-[15px] font-mono font-bold text-emerald-700 tracking-wider">
                                            {newPassword}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(newPassword);
                                            toast.success('Password copied');
                                        }}
                                        className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-100 transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400 font-medium">Click reset to generate a new temporary password for the employee. The old password will be immediately invalidated.</p>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="space-y-8">
                        <h3 className="text-[13px] font-bold text-slate-600 uppercase  border-b border-slate-100 pb-4">Emergency Contact</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <SmallDetailItem label="Contact Person" value={employee.emergencyContactName || "Not Provided"} />
                            <SmallDetailItem label="Emergency Phone" value={employee.emergencyPhone || "Not Provided"} />
                        </div>
                    </div>

                    {/* Personal Details */}
                    <div className="space-y-8">
                        <h3 className="text-[13px] font-bold text-slate-600 uppercase  border-b border-slate-100 pb-4">Personal Details</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <SmallDetailItem label="Married Status" value={employee.marriedStatus || "Not Specified"} />
                            <SmallDetailItem label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString() : "Not Specified"} />
                            <SmallDetailItem label="Hobbies" value={employee.hobbies || "None listed"} />
                            <SmallDetailItem label="Certifications" value={employee.certification || "None listed"} />
                            <SmallDetailItem label="Asset" value={employee.asset || "Not Assigned"} />
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="space-y-8">
                        <h3 className="text-[13px] font-bold text-slate-600 uppercase  border-b border-slate-100 pb-4">Bank Details</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <SmallDetailItem label="Bank Account" value={employee.bankAccount || "Not Provided"} />
                            <SmallDetailItem label="IFSC Code" value={employee.ifsc || "Not Provided"} />
                            <SmallDetailItem label="Bank Name" value={employee.bankName || "Not Provided"} />
                            <SmallDetailItem label="Bank Branch" value={employee.bankBranch || "Not Provided"} />
                            <SmallDetailItem label="Branch Location" value={employee.bankBranchLocation || "Not Provided"} />
                        </div>
                    </div>

                    {/* Personal Documents */}
                    <div className="space-y-8">
                        <h3 className="text-[13px] font-bold text-slate-600 uppercase  border-b border-slate-100 pb-4">Personal Documents</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {details?.aadhaar && <DocumentItem label="Aadhaar Card" data={details.aadhaar} />}
                            {details?.passport && <DocumentItem label="Passport" data={details.passport} />}
                            {details?.panCard && <DocumentItem label="PAN Card" data={details.panCard} />}
                            {Array.isArray((details as any)?.documents) && (details as any).documents.map((doc: any, i: number) => (
                                <DocumentItem key={`other-${i}`} label={doc.name || `Document ${i + 1}`} data={doc.url} />
                            ))}
                            {!details?.aadhaar && !details?.passport && !details?.panCard &&
                                !(Array.isArray((details as any)?.documents) && (details as any).documents.length > 0) && (
                                <p className="text-[13px] text-slate-400 font-medium">No documents uploaded.</p>
                            )}
                        </div>
                    </div>

                    {/* Social/External Links */}

                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}

function DetailItem({ icon: Icon, label, value, isLink }: { icon: any; label: string; value: string; isLink?: boolean }) {
    return (
        <div className="flex items-start gap-5">
            <div className="mt-1 p-3 bg-slate-50 rounded-2xl text-emerald-600 border border-slate-100/50 shadow-sm">
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
                {isLink ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-primary hover:underline tracking-tight">
                        {value}
                    </a>
                ) : (
                    <p className="text-[13px] font-medium text-slate-700 tracking-tight">{value}</p>
                )}
            </div>
        </div>
    );
}

function SmallDetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
            <p className="text-[12px] font-medium text-slate-700 tracking-tight">{value}</p>
        </div>
    );
}

function DocumentItem({ label, data }: { label: string; data: string }) {
    const isDataUrl = typeof data === 'string' && data.startsWith('data:');
    const handleDownload = () => {
        if (!data) return;
        if (isDataUrl) {
            // Legacy base64-in-DB document → force a download.
            const link = document.createElement('a');
            link.href = data;
            link.download = `${label.replace(/\s+/g, '_')}_document`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }
        // MinIO/stored URL → open in a new tab to view (prefix server origin for
        // relative fallback paths like /uploads/...).
        const href = data.startsWith('/') ? `${API_BASE_URL}${data}` : data;
        window.open(href, '_blank', 'noopener');
    };

    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-100 text-primary shadow-sm">
                    <ShieldCheck size={18} />
                </div>
                <p className="text-[12px] font-medium text-slate-700 tracking-tight">{label}</p>
            </div>
            <button
                onClick={handleDownload}
                className="text-[11px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
            >
                {isDataUrl ? "Download" : "View"}
            </button>
        </div>
    );
}
