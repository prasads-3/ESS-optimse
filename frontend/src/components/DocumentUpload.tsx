import { useRef, useState } from "react";
import { X, Upload as UploadIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";

interface DocumentUploadProps {
    label: string;
    docType: string;
    folder?: string;
    value?: string | null;
    onUploaded: (url: string) => void;
    onRemove?: () => void;
    accept?: string;
}

/**
 * Plain multipart upload for small KYC documents (Aadhaar, PAN, Passport, etc.).
 * Drop-in replacement for TusFileUpload — same props and UI — but posts a single
 * FormData request to /api/upload-document instead of the resumable tus flow.
 */
export function DocumentUpload({
    label,
    docType,
    folder = "employee-docs",
    value,
    onUploaded,
    onRemove,
    accept = ".pdf,image/*",
}: DocumentUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const uploadedFlag = !!value;

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            // Text fields first so the backend has docType/folder available.
            formData.append("docType", docType);
            formData.append("folder", folder);
            formData.append("document", file);

            const response = await fetch(`${API_BASE_URL}/api/upload-document`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Document upload failed");
            }

            const data = await response.json();
            if (!data.url) throw new Error("Upload succeeded but no URL was returned");

            onUploaded(data.url);
            toast.success(`${label} uploaded`);
        } catch (err: any) {
            console.error(`[document:${docType}] error`, err);
            toast.error(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
            // Allow re-selecting the same file after an error.
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</Label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    accept={accept}
                    onChange={handleChange}
                    disabled={uploading}
                />
                <Button
                    type="button"
                    variant="outline"
                    className={`w-full border-dashed justify-start font-normal transition-all ${uploadedFlag ? 'border-primary/40 bg-primary/5 text-primary' : 'bg-secondary/30 border-border/80 text-muted-foreground hover:bg-white'}`}
                    disabled={uploading}
                >
                    {uploading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Uploading…
                        </span>
                    ) : uploadedFlag ? (
                        <span>✓ {label} Uploaded</span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <UploadIcon size={14} />
                            Upload {label} (PDF/Img)
                        </span>
                    )}
                </Button>
            </div>
            {uploadedFlag && !uploading && onRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-destructive hover:text-destructive hover:bg-destructive/5 w-full text-xs h-7"
                >
                    <X size={12} className="mr-1" /> Remove {label}
                </Button>
            )}
        </div>
    );
}
