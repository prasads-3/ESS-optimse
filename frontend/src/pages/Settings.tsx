import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    User,
    Bell,
    Lock,
    Settings as SettingsIcon,
    Shield,
    Mail,
    Smartphone,
    Globe,
    Save,
    ChevronRight,
    LogOut,
    Camera,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    FileText,
    Upload as UploadIcon,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentUpload } from "@/components/DocumentUpload";
import { useNavigate } from "react-router-dom";

interface UserData {
    id: number;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    title?: string;
    role: string;
    location?: string;
    photo?: string;
    [key: string]: any;
}

const Settings = () => {
    const [activeTab, setActiveTab] = useState("account");
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        department: "",
        title: "",
        location: "",
        // Personal details
        personalEmail: "",
        dob: "",
        marriedStatus: "",
        linkedin: "",
        hobbies: "",
        certification: "",
        // Emergency contact
        emergencyContactName: "",
        emergencyPhone: "",
        // Bank details
        bankAccount: "",
        ifsc: "",
        bankName: "",
        bankBranch: "",
        bankBranchLocation: ""
    });

    useEffect(() => {
        fetchUserData();
    }, [user?.id]);

    const fetchUserData = async () => {
        if (!user?.id) {
            console.warn('No user ID available');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching user data for ID:', user.id);
            const response = await fetch(`${API_BASE_URL}/api/employees/${user.id}`, {
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('User data received:', data);
                setUserData(data);
                setFormData({
                    name: data.name || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    department: data.department || "",
                    title: data.title || "",
                    location: data.location || "",
                    personalEmail: data.personalEmail || "",
                    dob: data.dob ? String(data.dob).split('T')[0] : "",
                    marriedStatus: data.marriedStatus || "",
                    linkedin: data.linkedin || "",
                    hobbies: data.hobbies || "",
                    certification: data.certification || "",
                    emergencyContactName: data.emergencyContactName || "",
                    emergencyPhone: data.emergencyPhone || "",
                    bankAccount: data.bankAccount || "",
                    ifsc: data.ifsc || "",
                    bankName: data.bankName || "",
                    bankBranch: data.bankBranch || "",
                    bankBranchLocation: data.bankBranchLocation || ""
                });
            } else {
                const errorData = await response.json();
                console.error('Failed to fetch user data:', errorData);
                toast.error('Failed to load profile data');
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            toast.error('Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/employees/${user?.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });

            if (response.ok) {
                const updatedData = await response.json();
                setUserData(updatedData);
                toast.success("Profile updated successfully");
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Failed to update profile");
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        const redirectTo = await logout();
        toast.success("Logged out successfully");
        navigate(redirectTo);
    };

    const tabs = [
        { id: "account", label: "Account", icon: User },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "security", label: "Security", icon: Lock },
    ];

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-none m-3 mx-auto overflow-x-hidden">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your account preferences, notifications, and security settings.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Tabs Sidebar */}
                    <div className="lg:col-span-3 space-y-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all",
                                    activeTab === tab.id
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm"
                                )}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}

                        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold text-destructive hover:bg-destructive/5 mt-4 transition-all">
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>

                    {/* Settings Content */}
                    <div className="lg:col-span-9 space-y-8">
                        {activeTab === "account" && (
                            <AccountSettings 
                                userData={userData} 
                                formData={formData} 
                                setFormData={setFormData} 
                                onSave={handleSaveAccount} 
                                isSaving={isSaving}
                                onPhotoUpdate={(photo: string) => {
                                    setUserData(prev => prev ? { ...prev, photo } : null);
                                    // Also update global auth context
                                    (window as any).updateUserInAuthContext?.(photo);
                                }}
                            />
                        )}
                        {activeTab === "documents" && <DocumentsSettings user={user} userData={userData} />}
                        {activeTab === "security" && <SecuritySettings user={user} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* Sub-components */

const AccountSettings = ({ userData, formData, setFormData, onSave, isSaving, onPhotoUpdate }: any) => {
    const { user, updateUser } = useAuth();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Expose updateUser to parent via window for simplicity in this specific callback structure
    React.useEffect(() => {
        (window as any).updateUserInAuthContext = (photo: string) => updateUser({ photo });
        return () => { delete (window as any).updateUserInAuthContext; };
    }, [updateUser]);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
                const response = await fetch(`${API_BASE_URL}/api/employees/${user?.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photo: base64String }),
                    credentials: 'include'
                });

                if (response.ok) {
                    toast.success("Profile photo updated");
                    onPhotoUpdate(base64String);
                } else {
                    toast.error("Failed to upload photo");
                }
            } catch (error) {
                console.error('Photo upload error:', error);
                toast.error("Error uploading photo");
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <form onSubmit={onSave} className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*" 
            />
            <div className="p-8 border-b border-border/30 flex flex-col md:flex-row items-center gap-8">
                <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                    <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center text-primary overflow-hidden border-2 border-border/50 shadow-inner">
                        {userData?.photo ? (
                            <img src={userData.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} />
                        )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={24} className="text-white" />
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-xl font-bold">{formData.name || "User"}</h2>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">{formData.title || "Title"} • {formData.department || "Department"}</p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                        <span className="text-[10px] font-black bg-success/10 text-success px-3 py-1 rounded-full uppercase tracking-tighter">Active</span>
                        <span className="text-[10px] font-black bg-secondary text-muted-foreground px-3 py-1 rounded-full uppercase tracking-tighter">Full Time</span>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-10">
                {/* Basic Information */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingField
                            label="Full Name"
                            value={formData.name}
                            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <SettingField
                            label="Email Address"
                            value={formData.email}
                            onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <SettingField
                            label="Phone Number"
                            value={formData.phone}
                            onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+1 (555) 000-0000"
                        />
                        <SettingField
                            label="Department"
                            value={formData.department}
                            onChange={(e: any) => setFormData({ ...formData, department: e.target.value })}
                            placeholder="Engineering"
                        />
                        <div className="md:col-span-2">
                            <SettingField
                                label="Location"
                                value={formData.location}
                                onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="City, State"
                            />
                        </div>
                    </div>
                </div>

                {/* Personal Details */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingField
                            label="Personal Email"
                            type="email"
                            value={formData.personalEmail}
                            onChange={(e: any) => setFormData({ ...formData, personalEmail: e.target.value })}
                            placeholder="you@personal.com"
                        />
                        <SettingField
                            label="Date of Birth"
                            type="date"
                            value={formData.dob}
                            onChange={(e: any) => setFormData({ ...formData, dob: e.target.value })}
                        />
                        <SettingField
                            label="Marital Status"
                            value={formData.marriedStatus}
                            onChange={(e: any) => setFormData({ ...formData, marriedStatus: e.target.value })}
                            placeholder="Select status"
                            options={[
                                { value: "single", label: "Single" },
                                { value: "married", label: "Married" },
                                { value: "divorced", label: "Divorced" },
                                { value: "widowed", label: "Widowed" },
                            ]}
                        />
                        <SettingField
                            label="LinkedIn"
                            value={formData.linkedin}
                            onChange={(e: any) => setFormData({ ...formData, linkedin: e.target.value })}
                            placeholder="linkedin.com/in/username"
                        />
                        <SettingField
                            label="Hobbies"
                            value={formData.hobbies}
                            onChange={(e: any) => setFormData({ ...formData, hobbies: e.target.value })}
                            placeholder="e.g. Reading, Cricket"
                        />
                        <SettingField
                            label="Certifications"
                            value={formData.certification}
                            onChange={(e: any) => setFormData({ ...formData, certification: e.target.value })}
                            placeholder="e.g. AWS Certified"
                        />
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingField
                            label="Contact Name"
                            value={formData.emergencyContactName}
                            onChange={(e: any) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        />
                        <SettingField
                            label="Emergency Phone"
                            value={formData.emergencyPhone}
                            onChange={(e: any) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        />
                    </div>
                </div>

                {/* Bank Details */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingField
                            label="Bank Account Number"
                            value={formData.bankAccount}
                            onChange={(e: any) => setFormData({ ...formData, bankAccount: e.target.value })}
                            placeholder="e.g. 1234567890"
                        />
                        <SettingField
                            label="IFSC Code"
                            value={formData.ifsc}
                            onChange={(e: any) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                            placeholder="e.g. HDFC0001234"
                        />
                        <SettingField
                            label="Bank Name"
                            value={formData.bankName}
                            onChange={(e: any) => setFormData({ ...formData, bankName: e.target.value })}
                            placeholder="e.g. HDFC Bank"
                        />
                        <SettingField
                            label="Branch Name"
                            value={formData.bankBranch}
                            onChange={(e: any) => setFormData({ ...formData, bankBranch: e.target.value })}
                            placeholder="e.g. Andheri West"
                        />
                        <div className="md:col-span-2">
                            <SettingField
                                label="Branch Location"
                                value={formData.bankBranchLocation}
                                onChange={(e: any) => setFormData({ ...formData, bankBranchLocation: e.target.value })}
                                placeholder="e.g. Mumbai, Maharashtra"
                            />
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-end pt-4 border-t border-border/30">
                    <Button type="submit" disabled={isSaving} className="gap-2">
                        {isSaving ? (
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
            </div>
        </form>
    );
};

const DocumentsSettings = ({ user, userData }: any) => {
    const [docs, setDocs] = useState({
        aadhaar: userData?.aadhaar || "",
        passport: userData?.passport || "",
        panCard: userData?.panCard || "",
    });
    const [submitting, setSubmitting] = useState(false);

    // Uploading a KYC doc only updates local state; the Submit button below
    // writes all three to the DB in one go.
    const setDoc = (field: "aadhaar" | "passport" | "panCard", url: string) =>
        setDocs((prev) => ({ ...prev, [field]: url }));

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees/${user?.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    aadhaar: docs.aadhaar,
                    passport: docs.passport,
                    panCard: docs.panCard,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save documents");
            }
            toast.success("Documents saved");
        } catch (e: any) {
            console.error("Documents submit error:", e);
            toast.error(e.message || "Failed to save documents");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                    <FileText className="text-primary" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-foreground">Documents</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Upload your KYC documents, then click Submit to save. Accepted formats: PDF or image.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DocumentUpload
                    label="Aadhaar Card"
                    docType="aadhaar"
                    value={docs.aadhaar}
                    onUploaded={(url) => setDoc("aadhaar", url)}
                    onRemove={() => setDoc("aadhaar", "")}
                />
                <DocumentUpload
                    label="Passport"
                    docType="passport"
                    value={docs.passport}
                    onUploaded={(url) => setDoc("passport", url)}
                    onRemove={() => setDoc("passport", "")}
                />
                <DocumentUpload
                    label="PAN Card"
                    docType="panCard"
                    value={docs.panCard}
                    onUploaded={(url) => setDoc("panCard", url)}
                    onRemove={() => setDoc("panCard", "")}
                />
            </div>

            <div className="flex justify-end pt-2 border-t border-border/30">
                <Button type="button" onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Save size={16} />
                            Submit
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};


const SecuritySettings = ({ user }: { user: any }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    currentPassword,
                    newPassword
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Password changed successfully");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(data.error || "Failed to change password");
            }
        } catch (error) {
            console.error('Change password error:', error);
            toast.error("Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Change Password Card */}
            <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 border-b border-border/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                            <KeyRound className="text-primary" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Change Password</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">Update your password to keep your account secure</p>
                        </div>
                    </div>
                </div>
                <form onSubmit={handleChangePassword} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                                id="current-password"
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="pl-10 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                                id="new-password"
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="pl-10 pr-10"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                                id="confirm-password"
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="pl-10 pr-10"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isLoading} className="gap-2">
                            {isLoading ? "Changing..." : (
                                <>
                                    <Lock size={16} />
                                    Change Password
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Security Tips */}
            <div className="bg-card rounded-3xl border border-border/50 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Security Tips</h3>
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <p className="text-sm text-foreground">Use at least 6 characters for your password</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <p className="text-sm text-foreground">Mix letters, numbers, and special characters</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <p className="text-sm text-foreground">Don't reuse passwords from other accounts</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                        <p className="text-sm text-foreground">Change your password regularly for better security</p>
                    </div>
                </div>
            </div>
        </div>
    );
};




/* Utility Components */

const SettingField = ({ label, value, onChange, placeholder, disabled, type = "text", options }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">{label}</label>
        {options ? (
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={cn(
                    "w-full bg-secondary/30 border border-border/30 rounded-xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all",
                    disabled && "opacity-60 cursor-not-allowed bg-muted/50"
                )}
            >
                <option value="">{placeholder || "Select"}</option>
                {options.map((opt: { value: string; label: string }) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        ) : (
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    "w-full bg-secondary/30 border border-border/30 rounded-xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all",
                    disabled && "opacity-60 cursor-not-allowed bg-muted/50"
                )}
            />
        )}
    </div>
);

const ToggleItem = ({ icon: Icon, title, desc, defaultChecked }: any) => {
    const [enabled, setEnabled] = useState(defaultChecked || false);
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className="p-2.5 bg-secondary rounded-xl text-primary transition-transform group-hover:scale-110">
                        <Icon size={18} />
                    </div>
                )}
                <div>
                    <p className="text-sm font-bold text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
            </div>
            <div
                onClick={() => setEnabled(!enabled)}
                className={cn(
                    "w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300",
                    enabled ? "bg-accent" : "bg-muted"
                )}
            >
                <div className={cn(
                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300",
                    enabled ? "left-7 shadow-lg shadow-accent/20" : "left-1"
                )} />
            </div>
        </div>
    );
};

export default Settings;

