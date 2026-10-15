import { useRef, useState } from "react";
import { ClipboardPaste, Paperclip, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Attachment picker with click / drag-and-drop / clipboard-paste input,
 * an inline image thumbnail preview and a remove button.
 *
 * The parent owns the file handling (size validation, FileReader → base64,
 * state) via `onFile`; this component only handles the input UX. `value` is
 * whatever the parent stored — a base64 data URL for new uploads or a stored
 * public URL when editing — and is used for the preview when it's an image.
 *
 * Paste UX: clicking the zone ARMS it (focus + highlighted "Ctrl+V ready"
 * state) rather than opening the file picker — so with several zones on screen
 * (expense line items) the user always sees exactly which item will receive
 * the pasted image. The picker opens only via the explicit "browse" button
 * (or Enter/Space on the focused zone).
 */
interface FileDropInputProps {
    value?: string;
    fileName?: string;
    onFile: (file: File) => void;
    onClear: () => void;
    accept?: string;      // e.g. ".jpg,.jpeg,.png,.pdf"
    title?: string;       // main label in the empty state
    hint?: string;        // sub label in the empty state
    compact?: boolean;    // tighter paddings (expense line items)
}

const isImageValue = (value?: string, fileName?: string) => {
    if (value?.startsWith("data:image/")) return true;
    const name = fileName || value || "";
    return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(name);
};

// True when the file matches the accept list (extension or image/* mime).
const matchesAccept = (file: File, accept: string) => {
    const parts = accept.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return true;
    const name = file.name.toLowerCase();
    return parts.some((p) => {
        if (p === "image/*") return file.type.startsWith("image/");
        if (p.startsWith(".")) return name.endsWith(p);
        return file.type === p;
    });
};

const FileDropInput = ({
    value,
    fileName,
    onFile,
    onClear,
    accept = ".jpg,.jpeg,.png,.pdf",
    title = "Attach file",
    hint = "JPG, PNG, PDF · 5MB",
    compact = false,
}: FileDropInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [focused, setFocused] = useState(false); // armed: this zone receives Ctrl+V
    const [previewOpen, setPreviewOpen] = useState(false);

    const takeFile = (file: File | undefined | null) => {
        if (!file) return;
        if (!matchesAccept(file, accept)) {
            toast.error(`Unsupported file type. Allowed: ${accept.replace(/\./g, "").toUpperCase()}`);
            return;
        }
        onFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        takeFile(e.dataTransfer.files?.[0]);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const file =
            e.clipboardData.files?.[0] ||
            Array.from(e.clipboardData.items || [])
                .find((i) => i.kind === "file")
                ?.getAsFile();
        if (file) {
            e.preventDefault();
            takeFile(file);
        }
    };

    // ----- Filled state: preview + remove -----
    if (fileName || value) {
        const showThumb = isImageValue(value, fileName);
        return (
            <>
                <div
                    className={cn(
                        "flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/50",
                        compact ? "px-3 py-2" : "px-3 py-2.5"
                    )}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {showThumb && value ? (
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(true)}
                                className="shrink-0 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary/30 transition"
                                title="Click to preview"
                            >
                                <img
                                    src={value}
                                    alt={fileName || "attachment"}
                                    className={cn("object-cover", compact ? "h-9 w-9" : "h-11 w-11")}
                                />
                            </button>
                        ) : (
                            <Paperclip size={compact ? 13 : 14} className="text-muted-foreground shrink-0" />
                        )}
                        <span className={cn("font-medium text-foreground truncate", compact ? "text-xs" : "text-sm")}>
                            {fileName || "Attachment"}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-rose-600 transition shrink-0"
                    >
                        Remove
                    </button>
                </div>

                {/* Full-size preview overlay */}
                {previewOpen && value && (
                    <div
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150"
                        onClick={() => setPreviewOpen(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewOpen(false)}
                            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md transition"
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={value}
                            alt={fileName || "attachment preview"}
                            className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </>
        );
    }

    // ----- Empty state: arm-on-click / drop / paste zone -----
    // Clicking ARMS the zone for paste (focus + highlight) — it does NOT open
    // the file picker, so the user always sees which item Ctrl+V goes to.
    // The picker opens via the "browse" button or Enter/Space.
    const armed = focused || dragOver;
    return (
        <div
            tabIndex={0}
            role="button"
            onClick={(e) => e.currentTarget.focus()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onPaste={handlePaste}
            className={cn(
                "relative flex items-center cursor-pointer border border-dashed rounded-md transition outline-none",
                compact ? "gap-2 px-3 py-2" : "gap-3 px-4 py-3",
                armed
                    ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40"
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    takeFile(e.target.files?.[0]);
                    e.target.value = ""; // allow re-selecting the same file
                }}
            />
            {armed ? (
                <ClipboardPaste size={compact ? 14 : 16} className="text-success shrink-0" />
            ) : (
                <UploadCloud size={compact ? 14 : 16} className="text-muted-foreground shrink-0" />
            )}

            {compact ? (
                <span className={cn("text-xs font-medium flex-1 min-w-0 truncate", armed ? "text-success" : "text-muted-foreground")}>
                    {armed
                        ? <>Press <kbd className="px-1 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-semibold text-[10px]">Ctrl+V</kbd> to paste, or drop a file here</>
                        : <>{title} <span className="text-muted-foreground/60">— click to paste · {hint}</span></>}
                </span>
            ) : (
                <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", armed ? "text-success" : "text-foreground")}>
                        {armed
                            ? <>Press <kbd className="px-1 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-semibold text-xs">Ctrl+V</kbd> to paste, or drop a file</>
                            : title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        {armed ? hint : <>Click to paste a screenshot, or drag & drop · {hint}</>}
                    </p>
                </div>
            )}

            {/* Explicit picker affordance — the only thing that opens the dialog */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className={cn(
                    "shrink-0 font-semibold rounded-md border transition",
                    compact ? "text-[11px] px-2 py-1" : "text-xs px-2.5 py-1.5",
                    "border-border bg-card text-foreground hover:border-emerald-500 hover:text-success"
                )}
            >
                Browse
            </button>
        </div>
    );
};

export default FileDropInput;
