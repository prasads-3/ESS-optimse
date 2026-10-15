import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Camera, RefreshCw, Eye, EyeOff, X, Users, Check, ChevronLeft, ChevronRight, User, Briefcase, Mail, Landmark, FileText } from "lucide-react";
import { toast } from "sonner";
import { Employee } from "./EmployeeCard";
import { cn } from "@/lib/utils";
import { DEPARTMENT_TEAMS, ADD_DEPARTMENT_VALUE, ADD_TEAM_VALUE } from "@/lib/departments";
import { DocumentUpload } from "./DocumentUpload";

interface AddEmployeeDialogProps {
    children?: React.ReactNode;
    onSuccess?: () => void;
}

const STEPS = [
    { id: 1, title: "Basic Info", icon: User },
    { id: 2, title: "Employment", icon: Briefcase },
    { id: 3, title: "Contact", icon: Mail },
    { id: 4, title: "Bank Details", icon: Landmark },
    { id: 5, title: "Documents", icon: FileText },
];

export function AddEmployeeDialog({ children, onSuccess }: AddEmployeeDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [addingDepartment, setAddingDepartment] = useState(false);
    const [addingTeam, setAddingTeam] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: "",
        name: "",
        title: "",
        department: "Development",
        team: "",
        employmentType: "fulltime",
        status: "active",
        joiningDate: "",
        location: "office",
        email: "",
        phone: "",
        personalEmail: "",
        emergencyContactName: "",
        emergencyPhone: "",
        reportsTo: "",
        reportsToName: "",
        password: "",
        linkedin: "",
        marriedStatus: "",
        dob: "",
        hobbies: "",
        certification: "",
        bankAccount: "",
        ifsc: "",
        bankName: "",
        bankBranch: "",
        bankBranchLocation: "",
        expenseLimit: 0,
        asset: ""
    });

    const validateStep = (step: number): boolean => {
        if (step === 1) {
            if (!formData.employeeId.trim()) { toast.error("Employee ID is required"); return false; }
            if (!formData.name.trim()) { toast.error("Full Name is required"); return false; }
            if (!formData.title.trim()) { toast.error("Job Title is required"); return false; }
        }
        if (step === 3) {
            if (!formData.email.trim()) { toast.error("Office Email is required"); return false; }
        }
        return true;
    };

    const handleNext = () => {
        if (!validateStep(currentStep)) return;
        if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const [aadhaarBase64, setAadhaarBase64] = useState<string | null>(null);
    const [passportBase64, setPassportBase64] = useState<string | null>(null);
    const [panCardBase64, setPanCardBase64] = useState<string | null>(null);
    const [chequeBase64, setChequeBase64] = useState<string | null>(null);
    const [orgStats, setOrgStats] = useState<{ limit: number, used: number, name: string } | null>(null);

    useEffect(() => {
        if (open) {
            fetch(`${API_BASE_URL}/api/dashboard/stats`, { credentials: 'include' })
                .then(r => r.json())
                .then(data => {
                    if (data.organization) {
                        const orgLimit = data.organization.limit || data.organization.subscriptionPlan?.userLimit || 35;
                        setOrgStats({ 
                            limit: orgLimit, 
                            used: data.totalEmployees || 0,
                            name: data.organization.name || ''
                        });
                    }
                })
                .catch(err => console.error('Error fetching org stats:', err));
        }
    }, [open]);

    const generatePassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
        let newPassword = "";
        for (let i = 0; i < 12; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPassword);
        setFormData(prev => ({ ...prev, password: newPassword }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'aadhaar' | 'passport' | 'panCard' | 'cheque') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                if (type === 'aadhaar') setAadhaarBase64(base64);
                if (type === 'passport') setPassportBase64(base64);
                if (type === 'panCard') setPanCardBase64(base64);
                if (type === 'cheque') setChequeBase64(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveDocument = (type: 'aadhaar' | 'passport' | 'panCard' | 'cheque') => {
        if (type === 'aadhaar') setAadhaarBase64(null);
        if (type === 'passport') setPassportBase64(null);
        if (type === 'panCard') setPanCardBase64(null);
        if (type === 'cheque') setChequeBase64(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const dataToSubmit = {
                ...formData,
                photo: photoBase64,
                aadhaar: aadhaarBase64,
                passport: passportBase64,
                panCard: panCardBase64,
                chequeImage: chequeBase64,
                password: password
            };

            const response = await fetch(`${API_BASE_URL}/api/employees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSubmit),
                credentials: 'include',
            });

            if (response.ok) {
                toast.success('Employee registered successfully');
                setOpen(false);
                setFormData({
                    employeeId: "", name: "", title: "", department: "Development", team: "", employmentType: "fulltime",
                    status: "active", joiningDate: "", location: "office", email: "", phone: "", personalEmail: "",
                    emergencyContactName: "", emergencyPhone: "", reportsTo: "", reportsToName: "", password: "", linkedin: "",
                    marriedStatus: "", dob: "", hobbies: "", certification: "", bankAccount: "",
                    ifsc: "", bankName: "", bankBranch: "", bankBranchLocation: "", expenseLimit: 0, asset: ""
                });
                setPhotoBase64(null);
                setAadhaarBase64(null);
                setPassportBase64(null);
                setPanCardBase64(null);
                setChequeBase64(null);
                setPassword("");
                setCurrentStep(1);
                setAddingDepartment(false);
                setAddingTeam(false);

                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.reload();
                }
            } else {
                let errorMessage = 'Failed to register employee';
                try {
                    const error = await response.json();
                    errorMessage = error.error || error.message || errorMessage;
                } catch (e) {
                    errorMessage = `Server Error (${response.status}): ${response.statusText}`;
                }
                toast.error(errorMessage);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            toast.error('Connection refused. Is the backend server running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCurrentStep(1); }}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/95 shadow-lg shadow-primary/10 transition-all shrink-0">
                        <Plus size={16} />
                        Add new employee
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto p-0 border-none bespoke-shadow">
                <DialogHeader className="p-8 border-b border-border/60 bg-secondary/30">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground/90">New employee profile</DialogTitle>
                            <DialogDescription className="text-xs font-semibold text-primary uppercase tracking-wider mt-1">Official workspace registration</DialogDescription>
                        </div>
                        {orgStats && (
                            <div className="flex flex-col items-end gap-1.5">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 scale-90 origin-right opacity-70">Subscription Capacity</div>
                                <div className={cn(
                                    "px-4 py-2 rounded-xl border flex items-center gap-3 transition-all shadow-sm",
                                    orgStats.used >= orgStats.limit 
                                        ? "bg-rose-50 border-rose-100 text-rose-600" 
                                        : "bg-white border-primary/10 text-slate-700"
                                )}>
                                    <div className="flex flex-col items-end leading-none">
                                        <span className="text-lg font-black tracking-tight">{orgStats.used} <span className="text-[10px] text-muted-foreground/50 font-bold">/ {orgStats.limit}</span></span>
                                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">Licenses used</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-current/5 flex items-center justify-center">
                                        <Users size={16} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <form className="p-8 space-y-8">
                    {/* Stepper indicator */}
                    <div className="flex items-center justify-between gap-2 pb-2">
                        {STEPS.map((step, idx) => {
                            const StepIcon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            return (
                                <React.Fragment key={step.id}>
                                    <button
                                        type="button"
                                        onClick={() => { if (isCompleted) setCurrentStep(step.id); }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 flex-shrink-0 group",
                                            isCompleted && "cursor-pointer",
                                            !isCompleted && !isActive && "cursor-not-allowed"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2",
                                            isActive && "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110",
                                            isCompleted && "bg-primary/10 text-primary border-primary/40",
                                            !isActive && !isCompleted && "bg-secondary/40 text-muted-foreground border-border"
                                        )}>
                                            {isCompleted ? <Check size={16} /> : <StepIcon size={16} />}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                            isActive && "text-primary",
                                            isCompleted && "text-primary/70",
                                            !isActive && !isCompleted && "text-muted-foreground"
                                        )}>
                                            {step.title}
                                        </span>
                                    </button>
                                    {idx < STEPS.length - 1 && (
                                        <div className={cn(
                                            "h-0.5 flex-1 rounded-full transition-colors -mt-5",
                                            currentStep > step.id ? "bg-primary/40" : "bg-border"
                                        )} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className="min-h-[420px] space-y-8">
                    {/* Profile Photo Section - shown on step 1 */}
                    {currentStep === 1 && (
                    <div className="flex items-center gap-8 py-4 px-6 bg-secondary/20 rounded-xl border border-border/40">
                        <div className="relative group cursor-pointer">
                            <div className="w-20 h-20 rounded-xl bg-card flex items-center justify-center border-2 border-dashed border-border group-hover:border-primary/50 transition-all overflow-hidden shadow-sm">
                                {photoBase64 ? (
                                    <img src={photoBase64} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera size={28} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                )}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                <span className="text-[10px] text-primary font-semibold">Upload</span>
                            </div>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={handlePhotoChange}
                            />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground/80">Profile picture</h4>
                            {photoBase64 && <p className="text-[10px] text-primary font-semibold mt-1">Image selected</p>}
                            <p className="text-[11px] text-muted-foreground font-medium mt-1">Recommended: Square image, max 2MB.</p>
                        </div>
                    </div>
                    )}

                    <div className="space-y-8">
                        {/* Basic Info */}
                        {currentStep === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Basic Information</h3>
                            <div className="space-y-2.5 pb-4">
                                <Label htmlFor="title" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Job Title <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Software Engineer"
                                    required
                                    className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="employeeId" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Employee ID <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="employeeId"
                                        placeholder="e.g. ML109"
                                        required
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="fullname" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Full Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="fullname"
                                        placeholder="e.g. John Doe"
                                        required
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="department" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Department</Label>
                                    {addingDepartment ? (
                                        <div className="flex gap-2">
                                            <Input
                                                id="department"
                                                autoFocus
                                                placeholder="New department name"
                                                className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                                value={formData.department}
                                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="shrink-0"
                                                title="Choose from list"
                                                onClick={() => { setAddingDepartment(false); setAddingTeam(false); setFormData(prev => ({ ...prev, department: "", team: "" })); }}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Select
                                            value={formData.department}
                                            onValueChange={(val) => {
                                                setAddingTeam(false);
                                                if (val === ADD_DEPARTMENT_VALUE) {
                                                    setAddingDepartment(true);
                                                    setFormData(prev => ({ ...prev, department: "", team: "" }));
                                                    return;
                                                }
                                                setFormData(prev => ({ ...prev, department: val, team: "" }));
                                            }}
                                        >
                                            <SelectTrigger id="department" className="bg-secondary/30 border-border/80">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(DEPARTMENT_TEAMS).map((dept) => (
                                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                                ))}
                                                <SelectItem value={ADD_DEPARTMENT_VALUE}>+ Add new department…</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="team" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Team</Label>
                                    {DEPARTMENT_TEAMS[formData.department] && !addingTeam ? (
                                        <Select
                                            value={formData.team}
                                            onValueChange={(val) => {
                                                if (val === ADD_TEAM_VALUE) {
                                                    setAddingTeam(true);
                                                    setFormData(prev => ({ ...prev, team: "" }));
                                                    return;
                                                }
                                                setFormData(prev => ({ ...prev, team: val }));
                                            }}
                                        >
                                            <SelectTrigger id="team" className="bg-secondary/30 border-border/80">
                                                <SelectValue placeholder={DEPARTMENT_TEAMS[formData.department]?.length ? "Select team" : "Select or add a team"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(DEPARTMENT_TEAMS[formData.department] || []).map((team) => (
                                                    <SelectItem key={team} value={team}>{team}</SelectItem>
                                                ))}
                                                <SelectItem value={ADD_TEAM_VALUE}>+ Add new team…</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : addingTeam ? (
                                        <div className="flex gap-2">
                                            <Input
                                                id="team"
                                                autoFocus
                                                placeholder="New team name"
                                                className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                                value={formData.team}
                                                onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="shrink-0"
                                                title="Choose from list"
                                                onClick={() => { setAddingTeam(false); setFormData(prev => ({ ...prev, team: "" })); }}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Input
                                            id="team"
                                            placeholder="Team name"
                                            className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                            value={formData.team}
                                            onChange={(e) => setFormData(prev => ({ ...prev, team: e.target.value }))}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="marriedStatus" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Married Status</Label>
                                    <Select
                                        value={formData.marriedStatus}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, marriedStatus: val }))}
                                    >
                                        <SelectTrigger id="marriedStatus" className="bg-secondary/30 border-border/80">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="single">Single</SelectItem>
                                            <SelectItem value="married">Married</SelectItem>
                                            <SelectItem value="divorced">Divorced</SelectItem>
                                            <SelectItem value="widowed">Widowed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="dob" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.dob}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        )}
                        {/* Employment Info */}
                        {currentStep === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Employment Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="type" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Employment Type</Label>
                                    <Select
                                        value={formData.employmentType}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, employmentType: val }))}
                                    >
                                        <SelectTrigger id="type" className="bg-secondary/30 border-border/80">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fulltime">Full-time</SelectItem>
                                            <SelectItem value="parttime">Part-time</SelectItem>
                                            <SelectItem value="contract">Contract</SelectItem>
                                            <SelectItem value="internship">Internship</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="status" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                    >
                                        <SelectTrigger id="status" className="bg-secondary/30 border-border/80">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="onboarding">Onboarding</SelectItem>
                                            <SelectItem value="onleave">On Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="joining" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Joining Date</Label>
                                    <Input
                                        id="joining"
                                        type="date"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.joiningDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="location" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Work Location</Label>
                                    <Select value={formData.location} onValueChange={(val) => setFormData(prev => ({ ...prev, location: val }))}>
                                        <SelectTrigger id="location" className="bg-secondary/30 border-border/80">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="remote">Remote</SelectItem>
                                            <SelectItem value="office">Office</SelectItem>
                                            <SelectItem value="hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="expenseLimit" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Expense Limit</Label>
                                    <Input
                                        id="expenseLimit"
                                        type="number"
                                        placeholder="e.g. 5000"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.expenseLimit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, expenseLimit: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="asset" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Asset</Label>
                                    <Input
                                        id="asset"
                                        placeholder="e.g. Laptop - MacBook Pro 14, Asset Tag #1234"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.asset}
                                        onChange={(e) => setFormData(prev => ({ ...prev, asset: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        )}
                        {/* Bank Details */}
                        {currentStep === 4 && (
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Bank Details</h3>
                            <div className="space-y-2.5">
                                <Label htmlFor="bankAccount" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Bank Account Number</Label>
                                <Input
                                    id="bankAccount"
                                    placeholder="e.g. 1234567890"
                                    className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                    value={formData.bankAccount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="ifsc" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">IFSC Code</Label>
                                    <Input
                                        id="ifsc"
                                        placeholder="e.g. HDFC0001234"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.ifsc}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ifsc: e.target.value.toUpperCase() }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="bankName" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Bank Name</Label>
                                    <Input
                                        id="bankName"
                                        placeholder="e.g. HDFC Bank"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="bankBranch" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Branch Name</Label>
                                    <Input
                                        id="bankBranch"
                                        placeholder="e.g. Andheri West"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.bankBranch}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="bankBranchLocation" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Branch Location</Label>
                                    <Input
                                        id="bankBranchLocation"
                                        placeholder="e.g. Mumbai, Maharashtra"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.bankBranchLocation}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bankBranchLocation: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Cancelled Cheque</Label>
                                <div className="relative">
                                    <Input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        accept=".pdf,image/*"
                                        onChange={(e) => handleDocumentChange(e, 'cheque')}
                                    />
                                    <Button variant="outline" className={`w-full border-dashed justify-start font-normal transition-all ${chequeBase64 ? 'border-primary/40 bg-primary/5 text-primary' : 'bg-secondary/30 border-border/80 text-muted-foreground hover:bg-white'}`}>
                                        {chequeBase64 ? "✓ Cheque Uploaded" : "Upload Cancelled Cheque (PDF/Img)"}
                                    </Button>
                                </div>
                                {chequeBase64 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveDocument('cheque')}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/5 w-full text-xs h-7 mt-2"
                                    >
                                        <X size={12} className="mr-1" /> Remove Cheque
                                    </Button>
                                )}
                            </div>
                        </div>

                        )}
                        {/* Contact Info */}
                        {currentStep === 3 && (<>
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Contact & Office</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Office Email <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        placeholder="john.doe@company.com"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+1 (234) 567-890"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                            </div>
                            {/* Personal Email - for referral matching */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="personalEmail" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                        Personal Email
                                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-700 rounded font-bold">Referral Match</span>
                                    </Label>
                                    <Input
                                        id="personalEmail"
                                        type="email"
                                        placeholder="john.doe@gmail.com"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.personalEmail}
                                        onChange={(e) => setFormData(prev => ({ ...prev, personalEmail: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="linkedin" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">LinkedIn Profile</Label>
                                    <Input
                                        id="linkedin"
                                        type="url"
                                        placeholder="https://linkedin.com/in/username"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.linkedin}
                                        onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Emergency Info (kept in Contact step) */}
                        <div className="space-y-6 pt-2 border-t border-border/30">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Emergency Contact</h3>
                            <div className="space-y-2.5">
                                <Label htmlFor="emergency" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Contact Name</Label>
                                <Input
                                    id="emergency"
                                    placeholder="e.g. Jane Doe (Spouse)"
                                    className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                    value={formData.emergencyContactName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label htmlFor="emergencyPhone" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Emergency Phone</Label>
                                <Input
                                    id="emergencyPhone"
                                    type="tel"
                                    placeholder="+1 (234) 567-891"
                                    className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                    value={formData.emergencyPhone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                                />
                            </div>
                        </div>
                        </>)}
                        {/* Skills & Interests + Security + Documents (step 5) */}
                        {currentStep === 5 && (<>
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Skills & Interests</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2.5">
                                    <Label htmlFor="hobbies" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Hobbies</Label>
                                    <Input
                                        id="hobbies"
                                        placeholder="e.g. Reading, Traveling"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.hobbies}
                                        onChange={(e) => setFormData(prev => ({ ...prev, hobbies: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="certification" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Certifications</Label>
                                    <Input
                                        id="certification"
                                        placeholder="e.g. AWS, PMP"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                        value={formData.certification}
                                        onChange={(e) => setFormData(prev => ({ ...prev, certification: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Personal Documents - Full Width Row */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Security & Reporting</h3>
                            <div className="space-y-2.5">
                                <Label htmlFor="reportsTo" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Reports To (Manager Email)</Label>
                                <Input
                                    id="reportsTo"
                                    type="email"
                                    placeholder="manager@company.com"
                                    className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                    value={formData.reportsTo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reportsTo: e.target.value }))}
                                />
                                <p className="text-[10px] text-muted-foreground/70">Notifications and leave applications will be sent to this email.</p>
                            </div>
                            <div className="space-y-2.5">
                                <Label htmlFor="reportsToName" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Reporting Manager Name</Label>
                                <Input
                                    id="reportsToName"
                                    placeholder="e.g. Jane Doe"
                                    className="bg-secondary/30 border-border/80 focus:bg-white transition-all"
                                    value={formData.reportsToName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reportsToName: e.target.value }))}
                                />
                                <p className="text-[10px] text-muted-foreground/70">This name will be used in email greetings (e.g., Hello Jane).</p>
                            </div>
                            <div className="space-y-2.5">
                                <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">System Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPassword(val);
                                            setFormData(prev => ({ ...prev, password: val }));
                                        }}
                                        placeholder="••••••••"
                                        className="bg-secondary/30 border-border/80 focus:bg-white transition-all pr-12"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={generatePassword}
                                            className="h-7 w-7 text-primary hover:bg-primary/10"
                                            title="Generate"
                                        >
                                            <RefreshCw size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Personal Document - Full Width Row */}
                        <div className="md:col-span-3 space-y-4">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Personal Documents</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <DocumentUpload
                                    label="Aadhaar Card"
                                    docType="aadhaar"
                                    value={aadhaarBase64}
                                    onUploaded={(url) => setAadhaarBase64(url)}
                                    onRemove={() => handleRemoveDocument('aadhaar')}
                                />
                                <DocumentUpload
                                    label="Passport"
                                    docType="passport"
                                    value={passportBase64}
                                    onUploaded={(url) => setPassportBase64(url)}
                                    onRemove={() => handleRemoveDocument('passport')}
                                />
                                <DocumentUpload
                                    label="PAN Card"
                                    docType="panCard"
                                    value={panCardBase64}
                                    onUploaded={(url) => setPanCardBase64(url)}
                                    onRemove={() => handleRemoveDocument('panCard')}
                                />
                            </div>
                        </div>
                        </>)}
                    </div>
                    </div>
                </form>

                <DialogFooter className="p-8 bg-secondary/30 border-t border-border/60 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]?.title}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => { setOpen(false); setCurrentStep(1); }}
                            className="border-border text-muted-foreground"
                            disabled={isLoading}
                        >
                            Discard
                        </Button>
                        {currentStep > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={isLoading}
                                className="gap-1"
                            >
                                <ChevronLeft size={16} /> Back
                            </Button>
                        )}
                        {currentStep < STEPS.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="bg-primary text-white hover:bg-primary/95 px-6 gap-1"
                            >
                                Next <ChevronRight size={16} />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                className="bg-primary text-white hover:bg-primary/95 px-8"
                                disabled={isLoading}
                            >
                                {isLoading ? "Registering..." : "Register Employee"}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}

