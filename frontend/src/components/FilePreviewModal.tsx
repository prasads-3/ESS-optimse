import { Dialog, DialogContent } from "@/components/ui/dialog";
import { API_BASE_URL } from "@/config";
import { ExternalLink, FileText } from "lucide-react";

interface FilePreviewModalProps {
    /** The file URL or data URL to preview. When falsy the modal stays closed. */
    src?: string | null;
    open: boolean;
    onClose: () => void;
    title?: string;
}

/**
 * In-app popup preview for an uploaded file (receipt, leave proof, KYC doc).
 * Images render inline; PDFs embed in an iframe. Includes an "Open in new tab"
 * escape hatch. Relative `/uploads/...` paths are resolved against the API origin.
 */
export function FilePreviewModal({ src, open, onClose, title = "Preview" }: FilePreviewModalProps) {
    if (!src) return null;
    const href = src.startsWith("/") ? `${API_BASE_URL}${src}` : src;
    const isPdf = /^data:application\/pdf/i.test(src) || /\.pdf(\?|$)/i.test(src);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-primary shrink-0" />
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{title}</h3>
                    </div>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline mr-8 shrink-0"
                    >
                        <ExternalLink size={13} /> Open in new tab
                    </a>
                </div>
                <div className="bg-slate-100 flex items-center justify-center max-h-[78vh] overflow-auto">
                    {isPdf ? (
                        <iframe src={href} title={title} className="w-full h-[78vh] border-0 bg-white" />
                    ) : (
                        <img src={href} alt={title} className="max-w-full max-h-[78vh] object-contain" />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
