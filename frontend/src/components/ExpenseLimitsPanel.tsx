import { API_BASE_URL } from "@/config";
import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Save, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import EmployeeAvatar from "@/components/EmployeeAvatar";

interface Employee {
    id: number;
    name: string;
    email: string;
    role?: string;
    department?: string;
    photo?: string;
    expenseLimit?: number;
}

// Reusable admin tool: set each employee's MONTHLY expense limit. A limit of 0
// means the employee cannot submit any expense claims until a positive limit is
// set (there is no "0 = unlimited" rule). Rendered standalone on the Expense
// Limits page and as the "Expense Limits" tab on the Expenses page.
const ExpenseLimitsPanel = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    // Per-row draft values (the editable inputs) + which row is currently saving.
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`${API_BASE_URL}/api/employees`, { credentials: "include" });
                if (!res.ok) throw new Error("Failed to load employees");
                const data: Employee[] = await res.json();
                setEmployees(data);
                setDrafts(Object.fromEntries(data.map((e) => [e.id, String(e.expenseLimit ?? 0)])));
            } catch (e) {
                console.error(e);
                toast.error("Could not load employees");
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(
            (e) =>
                e.name?.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q)
        );
    }, [employees, search]);

    const handleSave = async (emp: Employee) => {
        const raw = drafts[emp.id];
        const value = parseFloat(raw);
        if (isNaN(value) || value < 0) {
            toast.error("Enter a valid limit (0 or more)");
            return;
        }
        setSavingId(emp.id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/employees/${emp.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ expenseLimit: value }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.error || "Failed to update limit");
            }
            setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, expenseLimit: value } : e)));
            toast.success(`${emp.name}'s monthly limit set to ₹${value.toLocaleString("en-IN")}`);
        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Failed to update limit");
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, department"
                    className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                />
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground font-medium">Loading employees…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm font-medium border border-dashed border-border rounded-xl">
                    No employees found.
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/60">
                    {filtered.map((emp) => {
                        const draft = drafts[emp.id] ?? String(emp.expenseLimit ?? 0);
                        const dirty = parseFloat(draft) !== (emp.expenseLimit ?? 0);
                        return (
                            <div key={emp.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
                                <EmployeeAvatar name={emp.name} photo={emp.photo} size="md" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{emp.name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {emp.department || emp.role || "Employee"} · {emp.email}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-medium text-muted-foreground/70 mr-1 hidden sm:inline">Current: ₹{(emp.expenseLimit ?? 0).toLocaleString("en-IN")}</span>
                                    <div className="relative">
                                        <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                                        <input
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={draft}
                                            onChange={(e) => setDrafts((d) => ({ ...d, [emp.id]: e.target.value }))}
                                            onKeyDown={(e) => e.key === "Enter" && dirty && handleSave(emp)}
                                            className="w-32 bg-card border border-border rounded-md pl-7 pr-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleSave(emp)}
                                        disabled={!dirty || savingId === emp.id}
                                        className="px-3 py-1.5 bg-emerald-700 text-white rounded-md text-xs font-medium hover:bg-emerald-800 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingId === emp.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                        Save
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExpenseLimitsPanel;
