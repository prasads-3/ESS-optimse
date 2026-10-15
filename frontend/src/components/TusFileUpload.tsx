import { useRef, useState } from "react";
import { X, Upload as UploadIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";

interface TusFileUploadProps {
    label: string;
    docType: string;
    folder?: string;
    value?: string | null;
    onUploaded: (url: string) => void;
    onRemove?: () => void;
    accept?: string;
}

export function TusFileUpload({
    label,
    docType,
    folder = "employee-docs",
    value,
    onUploaded,
    onRemove,
    accept = ".pdf,image/*",
}: TusFileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const uploadedFlag = !!value;

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);

        // Lazy-load tus-js-client at first use — keeps it out of the entry bundle.
        const tus = await import("tus-js-client");
        const upload = new tus.Upload(file, {
            endpoint: `${API_BASE_URL}/api/uploads`,
            retryDelays: [0, 1000, 3000, 5000, 10000],
            chunkSize: 5 * 1024 * 1024,
            metadata: {
                filename: file.name,
                filetype: file.type || "application/octet-stream",
                folder,
                docType,
            },
            removeFingerprintOnSuccess: true,
            onError: (err) => {
                console.error(`[tus:${docType}] error`, err);
                toast.error(`Upload failed: ${err.message}`);
                setUploading(false);
                setProgress(0);
            },
            onProgress: (sent, total) => {
                setProgress(total ? Math.round((sent / total) * 100) : 0);
            },
            onAfterResponse: (_req, res) => {
                const finalUrl = res.getHeader("x-final-url");
                if (finalUrl) {
                    onUploaded(finalUrl);
                    setUploading(false);
                    setProgress(100);
                    toast.success(`${label} uploaded`);
                }
            },
            onSuccess: () => {
                // Final URL is set via onAfterResponse; if missing, surface that.
                setUploading(false);
            },
        });

        upload.findPreviousUploads().then((prev) => {
            if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
            upload.start();
        });
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
                            Uploading {progress}%
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
