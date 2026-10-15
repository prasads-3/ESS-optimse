import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Megaphone, Send, Sparkles } from "lucide-react";

interface AnnouncementModalProps {
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AnnouncementModal({ children, open: controlledOpen, onOpenChange: setControlledOpen }: AnnouncementModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

    const [isSending, setIsSending] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        // Simulate sending
        setTimeout(() => {
            setIsSending(false);
            setOpen(false);
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 border-none bespoke-shadow bg-card/95 backdrop-blur-md">
                <DialogHeader className="p-8 border-b border-border/60 bg-primary/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Megaphone size={20} />
                        </div>
                        <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground/90">Create Announcement</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        Broadcast important updates to your workforce
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2.5">
                            <Label htmlFor="title" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                Announcement Title
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g. New Office Policy Update"
                                className="bg-secondary/30 border-border/80 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                                <Label htmlFor="audience" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                    Target Audience
                                </Label>
                                <Select defaultValue="all">
                                    <SelectTrigger id="audience" className="bg-secondary/30 border-border/80 h-11">
                                        <SelectValue placeholder="Select Audience" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        <SelectItem value="engineering">Engineering Team</SelectItem>
                                        <SelectItem value="design">Design Team</SelectItem>
                                        <SelectItem value="marketing">Marketing Team</SelectItem>
                                        <SelectItem value="hr">HR Department</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5">
                                <Label htmlFor="priority" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                    Priority Level
                                </Label>
                                <Select defaultValue="normal">
                                    <SelectTrigger id="priority" className="bg-secondary/30 border-border/80 h-11">
                                        <SelectValue placeholder="Select Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label htmlFor="message" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                Message Content
                            </Label>
                            <Textarea
                                id="message"
                                placeholder="Type your announcement details here..."
                                className="bg-secondary/30 border-border/80 focus:bg-white transition-all min-h-[150px] resize-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-border/40">
                        <div className="flex items-center gap-2 text-[10px] font-medium text-primary/70">
                            <Sparkles size={14} className="animate-pulse" />
                            AI-enhanced broadcasting active
                        </div>
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="border-border text-muted-foreground hover:bg-white"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary text-white hover:bg-primary/95 px-8 flex items-center gap-2 relative overflow-hidden group"
                                disabled={isSending}
                            >
                                {isSending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        Blast Announcement
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
