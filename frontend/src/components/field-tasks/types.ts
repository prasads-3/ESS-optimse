export type FieldTaskStatus = "Assigned" | "In Progress" | "Completed" | "Not Visited";

export type FieldTask = {
    id: number;
    title: string;
    description?: string | null;
    assignedTo: string;
    assignedBy: string;
    clientName?: string | null;
    address?: string | null;
    latitude: number;
    longitude: number;
    allowedRadius: number;
    date: string;
    expectedDuration?: string | null;
    status: FieldTaskStatus | string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    checkInLat?: number | null;
    checkInLng?: number | null;
    checkOutLat?: number | null;
    checkOutLng?: number | null;
    totalDuration?: number | null;
    autoCheckout: boolean;
    notes?: string | null;
    adminRemark?: string | null;
    missedReason?: string | null;
    proofImage?: string | null;
    createdAt: string;
};

export const fmtDuration = (mins?: number | null): string => {
    if (mins == null) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
};

// Live elapsed time (HH:MM:SS) from a running check-in, given milliseconds.
export const fmtElapsed = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const fmtTime = (s?: string | null): string =>
    s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtDate = (s?: string | null): string =>
    s ? new Date(s).toLocaleDateString() : "—";
