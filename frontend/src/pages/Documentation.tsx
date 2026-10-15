import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    FileText,
    Search,
    Download,
    Eye,
    Plus,
    Trash2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

import NoAccessBlock from "@/components/NoAccessBlock";

interface Policy {
    id?: number;
    title: string;
    category: string;
    version: string;
    content?: string;
    fileSize?: string;
    createdAt?: string;
}

const Documentation = () => {
    const { user, hasFeature } = useAuth();

    const isAdmin = user?.role === 'admin';
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchQuery, setSearchQueryState] = useState(searchParams.get("q") || "");

    useEffect(() => {
        setSearchQueryState(searchParams.get("q") || "");
    }, [searchParams]);

    const setSearchQuery = (value: string) => {
        setSearchQueryState(value);
        const next = new URLSearchParams(searchParams);
        if (value) next.set("q", value);
        else next.delete("q");
        setSearchParams(next, { replace: true });
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newPolicy, setNewPolicy] = useState({ title: "", category: "hr", version: "v1.0" });
    const [fileBase64, setFileBase64] = useState<string | null>(null);
    const [policiesList, setPoliciesList] = useState<Policy[]>([]);

    useEffect(() => {
        if (hasFeature("document")) {
            fetchPolicies();
        } else {
            setIsLoading(false);
        }
    }, [hasFeature]);

    const fetchPolicies = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/policies`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setPoliciesList(data);
            }
        } catch (error) {
            console.error('Error fetching policies:', error);
            toast.error("Failed to load policies");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Set the title from the file name (remove extension)
            const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            setNewPolicy(prev => ({ ...prev, title: fileName }));

            const reader = new FileReader();
            reader.onloadend = () => {
                setFileBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveFile = () => {
        setFileBase64(null);
        setNewPolicy(prev => ({ ...prev, title: "" }));
    };

    const handleCreatePolicy = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/policies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newPolicy, content: fileBase64 }),
                credentials: 'include'
            });

            if (response.ok) {
                toast.success("Policy registered successfully");
                fetchPolicies();
                setIsModalOpen(false);
                setNewPolicy({ title: "", category: "hr", version: "v1.0" });
                setFileBase64(null);
            }
        } catch (error) {
            toast.error("Failed to register policy");
        }
    };

    const handleDeletePolicy = async (id: number) => {
        if (!confirm("Are you sure you want to delete this policy?")) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/policies/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                toast.success("Policy deleted");
                fetchPolicies();
            }
        } catch (error) {
            toast.error("Failed to delete policy");
        }
    };

    const handleDownload = async (policy: Policy) => {
        let fullPolicy = policy;
        if (!policy.content && policy.id) {
            const toastId = toast.loading("Preparing download...");
            try {
                const response = await fetch(`${API_BASE_URL}/api/policies/${policy.id}`, { credentials: 'include' });
                if (response.ok) {
                    fullPolicy = await response.json();
                }
            } catch (err) {
                toast.error("Failed to fetch file content");
                return;
            } finally {
                toast.dismiss(toastId);
            }
        }

        const element = document.createElement("a");
        const isBase64 = fullPolicy.content?.startsWith('data:');

        if (isBase64) {
            element.href = fullPolicy.content!;
            const match = fullPolicy.content!.match(/data:([^;]+);/);
            const mimeType = match ? match[1] : '';
            let ext = 'pdf';
            if (mimeType.includes('image/')) ext = mimeType.split('/')[1] || 'png';
            if (mimeType.includes('pdf')) ext = 'pdf';
            element.download = `${fullPolicy.title}.${ext}`;
        } else {
            const file = new Blob([fullPolicy.content || ""], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = `${fullPolicy.title}.txt`;
        }

        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        toast.success("Download started");
    };

    const handleView = async (policy: Policy) => {
        if (!policy.content && policy.id) {
            const toastId = toast.loading("Loading document content...");
            try {
                const response = await fetch(`${API_BASE_URL}/api/policies/${policy.id}`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    setSelectedPolicy(data);
                    setIsPreviewOpen(true);
                }
            } catch (err) {
                toast.error("Failed to load document");
            } finally {
                toast.dismiss(toastId);
            }
        } else {
            setSelectedPolicy(policy);
            setIsPreviewOpen(true);
        }
    };

    const filteredPolicies = policiesList.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = [
        { id: "hr", label: "HR Policies" },
        { id: "it", label: "IT & Security" },
        { id: "conduct", label: "Code of Conduct" },
        { id: "benefits", label: "Health & Benefits" },
    ];

    if (!hasFeature("document")) {
        return <NoAccessBlock feature="Company Policies" />;
    }

    return (
        <div className="flex-1 overflow-y-auto bg-background/50 scroll-smooth">
            <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-none m-3 mx-auto overflow-x-hidden">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-6">

                        <div>
                            <h1 className="text-2xl font-bold text-foreground/90 tracking-tight">Company Policies</h1>
                            <p className="text-sm text-muted-foreground mt-1 max-w-md font-medium">Official policies and company guidelines.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-xs w-full">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search policies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full min-w-[160px] max-w-[240px] pl-10 pr-4 py-2.5 bg-card border border-border/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                        </div>
                        {isAdmin && (
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-semibold text-xs shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all shrink-0"><Plus size={18} /> Create Policy</button>
                        )}
                    </div>
                </div>



                {/* Documents List */}
                <div className="bg-card rounded-lg bespoke-border bespoke-shadow overflow-hidden">
                    <div className="px-8 py-4 border-b border-border/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="font-semibold text-[10px] text-muted-foreground/80 lowercase font-sans">Active Policies</h2>
                        </div>
                    </div>
                    <div className="divide-y divide-border/40">
                        {isLoading ? (
                            <div className="p-16 text-center animate-pulse">
                                <FileText size={40} className="mx-auto text-primary/20 mb-4" />
                                <p className="text-sm text-muted-foreground font-medium">Loading documents...</p>
                            </div>
                        ) : filteredPolicies.length > 0 ? (
                            filteredPolicies.map((policy, idx) => (
                                <div key={policy.id || idx} className="px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-secondary/50 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm text-foreground/80 transition-colors">{policy.title}</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                                                {policy.version} • {new Date(policy.createdAt).toLocaleDateString()} • {policy.fileSize || "0.1 MB"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleView(policy)}
                                            className="flex items-center gap-2 px-4 py-2 bg-secondary/80 hover:bg-secondary text-foreground text-[10px] font-semibold rounded-lg border border-border transition-all"
                                        >
                                            <Eye size={12} />
                                            View
                                        </button>

                                        <button
                                            onClick={() => handleDownload(policy)}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary/5 hover:bg-primary text-primary hover:text-white text-[10px] font-semibold rounded-lg border border-primary/20 transition-all font-bold"
                                        >
                                            <Download size={12} />
                                            Download
                                        </button>
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDeletePolicy(policy.id)}
                                                className="flex items-center gap-2 px-3 py-2 bg-destructive/5 hover:bg-destructive text-destructive hover:text-white text-[10px] font-semibold rounded-lg border border-destructive/20 transition-all ml-2"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-16 text-center">
                                <p className="text-sm text-muted-foreground font-medium">No documents found matching &quot;{searchQuery}&quot;</p>
                            </div>
                        )}
                    </div>
                </div>



                {/* Create Policy Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl font-sans">
                        <div className="bg-slate-50 px-8 py-8 border-b border-slate-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">New document draft</DialogTitle>
                                <DialogDescription className="text-[10px] mt-1 font-bold text-emerald-600 uppercase tracking-wider">Official policy submission</DialogDescription>
                            </div>
                            <FileText size={80} className="absolute -right-4 -bottom-4 text-emerald-500/5 rotate-12" />
                        </div>

                        <form onSubmit={handleCreatePolicy} className="p-8 space-y-6">
                            {newPolicy.title && (
                                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Auto-detected Title</p>
                                        <h4 className="text-sm font-bold text-slate-700 truncate">{newPolicy.title}</h4>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Policy Document</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        accept=".pdf,image/*"
                                        onChange={handleFileChange}
                                    />
                                    <div className={cn(
                                        "w-full border-2 border-dashed rounded-xl px-4 py-8 flex flex-col items-center justify-center transition-all",
                                        fileBase64 ? "border-emerald-500/40 bg-emerald-50/30" : "border-slate-200 bg-slate-50/50 hover:border-emerald-500/30 hover:bg-white"
                                    )}>
                                        <Plus size={24} className={cn("mb-2", fileBase64 ? "text-emerald-500" : "text-slate-300")} />
                                        <span className={cn("text-xs font-bold", fileBase64 ? "text-emerald-600" : "text-slate-400")}>
                                            {fileBase64 ? "Document attached successfully" : "Click or drag to upload (PDF/Img)"}
                                        </span>
                                        {fileBase64 && (
                                            <p className="text-[10px] text-emerald-500/60 mt-1 font-medium">Ready for registration</p>
                                        )}
                                    </div>
                                </div>
                                {fileBase64 && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="w-full mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-destructive hover:text-destructive/80 transition-all uppercase tracking-widest py-2 bg-destructive/5 rounded-lg border border-destructive/10"
                                    >
                                        <X size={12} /> Remove file
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button type="submit" className="w-full py-3.5 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-emerald-500/10 hover:bg-emerald-700 transition-all">
                                    Register document
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-3 text-[10px] text-slate-400 font-bold hover:text-slate-600 transition-all uppercase tracking-widest"
                                >
                                    Discard draft
                                </button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Preview Modal */}
                <Dialog open={isPreviewOpen && !!selectedPolicy} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl font-sans">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <DialogTitle className="text-lg font-bold text-slate-800 tracking-tight">{selectedPolicy?.title}</DialogTitle>
                                <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{selectedPolicy?.category} • {selectedPolicy?.version}</DialogDescription>
                            </div>

                        </div>
                        <div className="max-h-[70vh] overflow-y-auto bg-white">
                            {(() => {
                                const content = selectedPolicy?.content;
                                if (!content) {
                                    return (
                                        <p className="p-8 text-sm text-slate-500 text-center">
                                            No content available for this policy.
                                        </p>
                                    );
                                }
                                const isPdf = content.startsWith("data:application/pdf");
                                const isImage = content.startsWith("data:image/");
                                if (isPdf) {
                                    return (
                                        <iframe
                                            src={content}
                                            title={selectedPolicy?.title}
                                            className="w-full h-[70vh] border-0"
                                        />
                                    );
                                }
                                if (isImage) {
                                    return (
                                        <div className="p-8 flex justify-center">
                                            <img
                                                src={content}
                                                alt={selectedPolicy?.title}
                                                className="max-w-full h-auto rounded-lg shadow-sm"
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <div className="p-8 prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {content}
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <button
                                onClick={() => handleDownload(selectedPolicy)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                            >
                                <Download size={14} />
                                Download Copy
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
};

export default Documentation;

