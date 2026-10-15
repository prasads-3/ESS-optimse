import { FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FundRequestsPanel from "@/components/FundRequestsPanel";

// Standalone page wrapper around the shared FundRequestsPanel. The same panel
// is also rendered as the "Fund Requests" tab on the Expenses page.
const AdminFundRequests = () => {
    return (
        <div className="flex-1 overflow-y-auto bg-background font-sans">
            <div className="m-5 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">Fund Requests</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Review and action employee additional money requests.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="gap-2">
                        <Link to="/expenses-list">
                            <FolderOpen size={14} />
                            Expenses List
                        </Link>
                    </Button>
                </div>

                <FundRequestsPanel />
            </div>
        </div>
    );
};

export default AdminFundRequests;
