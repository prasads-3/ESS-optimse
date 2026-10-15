import { API_BASE_URL } from '@/config';
import { useState, useEffect } from "react";
import { X, Save, Camera, User, Briefcase, HeartPulse, Landmark, FileText } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { Employee } from "./EmployeeCard";
import { DocumentUpload } from "./DocumentUpload";
import { DEPARTMENT_TEAMS, ADD_DEPARTMENT_VALUE, ADD_TEAM_VALUE } from "@/lib/departments";
import { cn } from "@/lib/utils";

const EDIT_TABS = [
    { id: "personal", label: "Personal", icon: User },
    { id: "professional", label: "Professional", icon: Briefcase },
    { id: "emergency", label: "Other Info", icon: HeartPulse },
    { id: "bank", label: "Bank", icon: Landmark },
    { id: "documents", label: "Documents", icon: FileText },
];

interface EditEmployeeDialogProps {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (updatedEmployee: Employee) => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange, onSuccess }: EditEmployeeDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("personal");
    const [addingDepartment, setAddingDepartment] = useState(false);
    const [addingTeam, setAddingTeam] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: "",
        name: "",
        title: "",
        email: "",
        phone: "",
        department: "",
        team: "",
        employmentType: "",
        status: "",
        location: "",
        reportsTo: "",
        reportsToName: "",
        joiningDate: "",
        emergencyContactName: "",
        emergencyPhone: "",
        marriedStatus: "",
        dob: "",
        hobbies: "",
        certification: "",
        aadhaar: "",
        passport: "",
        panCard: "",
        linkedin: "",
        photo: "",
        bankAccount: "",
        ifsc: "",
        bankName: "",
        bankBranch: "",
        bankBranchLocation: "",
        chequeImage: "",
        personalEmail: "",
        expenseLimit: 0,
        asset: "",
    });

    const [photoBase64, setPhotoBase64] = useState<string | null>(null);

    const [aadhaarBase64, setAadhaarBase64] = useState<string | null>(null);
    const [passportBase64, setPassportBase64] = useState<string | null>(null);
    const [panCardBase64, setPanCardBase64] = useState<string | null>(null);
    const [chequeBase64, setChequeBase64] = useState<string | null>(null);

    useEffect(() => {
        if (employee) {
            setFormData({
                employeeId: employee.employeeId || "",
                name: employee.name || "",
                title: employee.title || "",
                email: employee.email || "",
                phone: employee.phone || "",
                department: employee.department || "",
                team: employee.team || "",
                employmentType: employee.employmentType || "",
                status: employee.status || "",
                location: employee.location || "",
                reportsTo: employee.reportsTo || "",
                reportsToName: employee.reportsToName || "",
                joiningDate: employee.joiningDate ? String(employee.joiningDate).split('T')[0] : "",
                emergencyContactName: employee.emergencyContactName || "",
                emergencyPhone: employee.emergencyPhone || "",
                marriedStatus: employee.marriedStatus || "",
                dob: employee.dob ? String(employee.dob).split('T')[0] : "",
                hobbies: employee.hobbies || "",
                certification: employee.certification || "",
                aadhaar: employee.aadhaar || "",
                passport: employee.passport || "",
                panCard: employee.panCard || "",
                linkedin: employee.linkedin || "",
                photo: employee.photo || "",
                bankAccount: employee.bankAccount || "",
                ifsc: employee.ifsc || "",
                bankName: employee.bankName || "",
                bankBranch: employee.bankBranch || "",
                bankBranchLocation: employee.bankBranchLocation || "",
                chequeImage: employee.chequeImage || "",
                personalEmail: employee.personalEmail || "",
                expenseLimit: employee.expenseLimit || 0,
                asset: employee.asset || "",
            });
            setPhotoBase64(employee.photo || null);
            setAadhaarBase64(employee.aadhaar || null);
            setPassportBase64(employee.passport || null);
            setPanCardBase64(employee.panCard || null);
            setChequeBase64(employee.chequeImage || null);
            setActiveTab("personal");
            setAddingDepartment(false);
            setAddingTeam(false);
        }
    }, [employee, open]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setPhotoBase64(base64);
                setFormData(prev => ({ ...prev, photo: base64 }));
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
                if (type === 'aadhaar') {
                    setAadhaarBase64(base64);
                    setFormData(prev => ({ ...prev, aadhaar: base64 }));
                }
                if (type === 'passport') {
                    setPassportBase64(base64);
                    setFormData(prev => ({ ...prev, passport: base64 }));
                }
                if (type === 'panCard') {
                    setPanCardBase64(base64);
                    setFormData(prev => ({ ...prev, panCard: base64 }));
                }
                if (type === 'cheque') {
                    setChequeBase64(base64);
                    setFormData(prev => ({ ...prev, chequeImage: base64 }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveDocument = (type: 'aadhaar' | 'passport' | 'panCard' | 'cheque') => {
        if (type === 'aadhaar') {
            setAadhaarBase64(null);
            setFormData(prev => ({ ...prev, aadhaar: "" }));
        }
        if (type === 'passport') {
            setPassportBase64(null);
            setFormData(prev => ({ ...prev, passport: "" }));
        }
        if (type === 'panCard') {
            setPanCardBase64(null);
            setFormData(prev => ({ ...prev, panCard: "" }));
        }
        if (type === 'cheque') {
            setChequeBase64(null);
            setFormData(prev => ({ ...prev, chequeImage: "" }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee?.id) return;

        const requiredFields: { field: keyof typeof formData; tab: string; label: string }[] = [
            { field: "employeeId", tab: "personal", label: "Employee ID" },
            { field: "name", tab: "personal", label: "Full Name" },
            { field: "email", tab: "personal", label: "Email" },
            { field: "title", tab: "professional", label: "Job Title" },
        ];
        for (const r of requiredFields) {
            if (!String(formData[r.field] ?? "").trim()) {
                setActiveTab(r.tab);
                toast.error(`${r.label} is required`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/${employee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedData = await response.json();
                onSuccess({
                    ...employee,
                    ...updatedData,
                    online: updatedData.status === "active",
                    photo: updatedData.photo || employee.photo,
                });
                toast.success("Employee updated successfully");
                onOpenChange(false);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Failed to update employee");
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error("Failed to update employee");
        } finally {
            setIsLoading(false);
        }
    };

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>

                {/* Section tabs — jump straight to the group you want to edit */}
                <div className="flex gap-1 px-4 pt-3 border-b bg-secondary/10 overflow-x-auto shrink-0">
                    {EDIT_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-all whitespace-nowrap",
                                    active
                                        ? "border-primary text-primary bg-background"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                                )}
                            >
                                <Icon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                    {/* ===== PERSONAL ===== */}
                    <div className={cn("space-y-6", activeTab !== "personal" && "hidden")}>
                    {/* Profile Photo Section */}
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
                                <span className="text-[10px] text-primary font-semibold">Update</span>
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

                    {/* Personal Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-employeeId">Employee ID</Label>
                                <Input
                                    id="edit-employeeId"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    placeholder="e.g. ML109"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-personalEmail">Personal Email</Label>
                                <Input
                                    id="edit-personalEmail"
                                    type="email"
                                    value={formData.personalEmail}
                                    onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-dob">Date of Birth</Label>
                                <Input
                                    id="edit-dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-married">Marital Status</Label>
                                <Select value={formData.marriedStatus} onValueChange={(value) => setFormData({ ...formData, marriedStatus: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Single</SelectItem>
                                        <SelectItem value="married">Married</SelectItem>
                                        <SelectItem value="divorced">Divorced</SelectItem>
                                        <SelectItem value="widowed">Widowed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-location">Location</Label>
                                <Input
                                    id="edit-location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    </div>
                    {/* ===== PROFESSIONAL ===== */}
                    <div className={cn("space-y-6", activeTab !== "professional" && "hidden")}>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Professional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Job Title</Label>
                                <Input
                                    id="edit-title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-department">Department</Label>
                                {addingDepartment ? (
                                    <div className="flex gap-2">
                                        <Input
                                            id="edit-department"
                                            autoFocus
                                            placeholder="New department name"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0"
                                            title="Choose from list"
                                            onClick={() => { setAddingDepartment(false); setAddingTeam(false); setFormData({ ...formData, department: "", team: "" }); }}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <Select
                                        value={formData.department}
                                        onValueChange={(value) => {
                                            setAddingTeam(false);
                                            if (value === ADD_DEPARTMENT_VALUE) {
                                                setAddingDepartment(true);
                                                setFormData({ ...formData, department: "", team: "" });
                                                return;
                                            }
                                            setFormData({ ...formData, department: value, team: "" });
                                        }}
                                    >
                                        <SelectTrigger id="edit-department">
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(DEPARTMENT_TEAMS).map((dept) => (
                                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                            ))}
                                            {formData.department && !DEPARTMENT_TEAMS[formData.department] && (
                                                <SelectItem value={formData.department}>{formData.department}</SelectItem>
                                            )}
                                            <SelectItem value={ADD_DEPARTMENT_VALUE}>+ Add new department…</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-team">Team</Label>
                                {DEPARTMENT_TEAMS[formData.department] && !addingTeam ? (
                                    <Select
                                        value={formData.team}
                                        onValueChange={(value) => {
                                            if (value === ADD_TEAM_VALUE) {
                                                setAddingTeam(true);
                                                setFormData({ ...formData, team: "" });
                                                return;
                                            }
                                            setFormData({ ...formData, team: value });
                                        }}
                                    >
                                        <SelectTrigger id="edit-team">
                                            <SelectValue placeholder={DEPARTMENT_TEAMS[formData.department]?.length ? "Select team" : "Select or add a team"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(DEPARTMENT_TEAMS[formData.department] || []).map((team) => (
                                                <SelectItem key={team} value={team}>{team}</SelectItem>
                                            ))}
                                            {formData.team && !(DEPARTMENT_TEAMS[formData.department] || []).includes(formData.team) && (
                                                <SelectItem value={formData.team}>{formData.team}</SelectItem>
                                            )}
                                            <SelectItem value={ADD_TEAM_VALUE}>+ Add new team…</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : addingTeam ? (
                                    <div className="flex gap-2">
                                        <Input
                                            id="edit-team"
                                            autoFocus
                                            placeholder="New team name"
                                            value={formData.team}
                                            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0"
                                            title="Choose from list"
                                            onClick={() => { setAddingTeam(false); setFormData({ ...formData, team: "" }); }}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <Input
                                        id="edit-team"
                                        placeholder="Team name"
                                        value={formData.team}
                                        onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                                    />
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-reportsTo">Reports To (Manager Email)</Label>
                                <Input
                                    id="edit-reportsTo"
                                    type="email"
                                    placeholder="manager@company.com"
                                    value={formData.reportsTo}
                                    onChange={(e) => setFormData({ ...formData, reportsTo: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground/70">Notifications and leave applications will be sent to this email.</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-reportsToName">Reporting Manager Name</Label>
                                <Input
                                    id="edit-reportsToName"
                                    placeholder="e.g. Jane Doe"
                                    value={formData.reportsToName}
                                    onChange={(e) => setFormData({ ...formData, reportsToName: e.target.value })}
                                />
                                <p className="text-[10px] text-muted-foreground/70">This name will be used in email greetings (e.g., Hello Jane).</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-joiningDate">Joining Date</Label>
                                <Input
                                    id="edit-joiningDate"
                                    type="date"
                                    value={formData.joiningDate}
                                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-employmentType">Employment Type</Label>
                                <Select value={formData.employmentType} onValueChange={(value) => setFormData({ ...formData, employmentType: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fulltime">Full-time</SelectItem>
                                        <SelectItem value="parttime">Part-time</SelectItem>
                                        <SelectItem value="contract">Contract</SelectItem>
                                        <SelectItem value="internship">Intern</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="onleave">On Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-expenseLimit">Expense Limit</Label>
                                <Input
                                    id="edit-expenseLimit"
                                    type="number"
                                    value={formData.expenseLimit}
                                    onChange={(e) => setFormData({ ...formData, expenseLimit: parseFloat(e.target.value) || 0 })}
                                    placeholder="e.g. 5000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-asset">Asset</Label>
                                <Input
                                    id="edit-asset"
                                    value={formData.asset}
                                    onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                                    placeholder="e.g. Laptop - MacBook Pro 14, Asset Tag #1234"
                                />
                            </div>
                        </div>
                    </div>

                    </div>
                    {/* ===== OTHER INFO ===== */}
                    <div className={cn("space-y-6", activeTab !== "emergency" && "hidden")}>
                    {/* Emergency Contact */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-emergencyContact">Contact Name</Label>
                                <Input
                                    id="edit-emergencyContact"
                                    value={formData.emergencyContactName}
                                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-emergencyPhone">Emergency Phone</Label>
                                <Input
                                    id="edit-emergencyPhone"
                                    value={formData.emergencyPhone}
                                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Additional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="edit-linkedin">LinkedIn</Label>
                                <Input
                                    id="edit-linkedin"
                                    value={formData.linkedin}
                                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-hobbies">Hobbies</Label>
                                <Input
                                    id="edit-hobbies"
                                    value={formData.hobbies}
                                    onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-certification">Certifications</Label>
                                <Input
                                    id="edit-certification"
                                    value={formData.certification}
                                    onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    </div>
                    {/* ===== BANK ===== */}
                    <div className={cn("space-y-6", activeTab !== "bank" && "hidden")}>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Bank Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-bankAccount">Bank Account Number</Label>
                                <Input
                                    id="edit-bankAccount"
                                    value={formData.bankAccount}
                                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                    placeholder="e.g. 1234567890"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-ifsc">IFSC Code</Label>
                                <Input
                                    id="edit-ifsc"
                                    value={formData.ifsc}
                                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                                    placeholder="e.g. HDFC0001234"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-bankName">Bank Name</Label>
                                <Input
                                    id="edit-bankName"
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    placeholder="e.g. HDFC Bank"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-bankBranch">Branch Name</Label>
                                <Input
                                    id="edit-bankBranch"
                                    value={formData.bankBranch}
                                    onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                                    placeholder="e.g. Andheri West"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-bankBranchLocation">Branch Location</Label>
                                <Input
                                    id="edit-bankBranchLocation"
                                    value={formData.bankBranchLocation}
                                    onChange={(e) => setFormData({ ...formData, bankBranchLocation: e.target.value })}
                                    placeholder="e.g. Mumbai, Maharashtra"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Cancelled Cheque</Label>
                                <div className="space-y-2">
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
                                            className="text-destructive hover:text-destructive hover:bg-destructive/5 w-full text-xs h-7"
                                        >
                                            <X size={12} className="mr-1" /> Remove Cheque
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    </div>
                    {/* ===== DOCUMENTS ===== */}
                    <div className={cn("space-y-6", activeTab !== "documents" && "hidden")}>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Personal Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DocumentUpload
                                label="Aadhaar Card"
                                docType="aadhaar"
                                value={aadhaarBase64}
                                onUploaded={(url) => { setAadhaarBase64(url); setFormData(prev => ({ ...prev, aadhaar: url })); }}
                                onRemove={() => handleRemoveDocument('aadhaar')}
                            />
                            <DocumentUpload
                                label="Passport"
                                docType="passport"
                                value={passportBase64}
                                onUploaded={(url) => { setPassportBase64(url); setFormData(prev => ({ ...prev, passport: url })); }}
                                onRemove={() => handleRemoveDocument('passport')}
                            />
                            <DocumentUpload
                                label="PAN Card"
                                docType="panCard"
                                value={panCardBase64}
                                onUploaded={(url) => { setPanCardBase64(url); setFormData(prev => ({ ...prev, panCard: url })); }}
                                onRemove={() => handleRemoveDocument('panCard')}
                            />
                        </div>
                    </div>
                    </div>
                    </div>

                    <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background shrink-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading} className="gap-2">
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

