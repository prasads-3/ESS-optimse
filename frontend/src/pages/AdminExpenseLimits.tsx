import { ArrowLeft, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExpenseLimitsPanel from "@/components/ExpenseLimitsPanel";

// Standalone page wrapper around the shared ExpenseLimitsPanel. The same panel
// is also rendered as the "Expense Limits" tab on the Expenses page.
const AdminExpenseLimits = () => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 overflow-y-auto bg-background">
            <div className="m-5 space-y-6">
                {/* Back */}
                <button
                    onClick={() => navigate("/admin")}
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs font-semibold tracking-wide transition-colors group"
                >
                    <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Dashboard
                </button>

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                        <Wallet size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">Expense Limits</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Set each employee's monthly expense limit.
                        </p>
                    </div>
                </div>

                <ExpenseLimitsPanel />
            </div>
        </div>
    );
};

export default AdminExpenseLimits;
