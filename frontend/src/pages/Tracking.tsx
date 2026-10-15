import { API_BASE_URL } from '@/config';
import React, { useState } from "react";
import {
    MapPin,
    Smartphone,
    Tablet,
    Monitor,
    Map as MapIcon,
    Clock,
    Search,
    ArrowUpRight,
    ArrowDownLeft,
    Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MapComponent from "@/components/MapComponent";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useAuth } from '@/contexts/AuthContext';
import NoAccessBlock from '@/components/NoAccessBlock';

const Tracking = () => {
    const { user, hasFeature } = useAuth();
    
    if (!hasFeature("tracking")) {
        return <NoAccessBlock feature="Tracking" />;
    }
    const [searchTerm, setSearchTerm] = useState("");
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const mapRef = React.useRef<HTMLDivElement>(null);

    const handleViewOnMap = (log: any) => {
        const hasLocation = (log.loginLat && log.loginLong) || (log.logoutLat && log.logoutLong);
        
        if (!hasLocation) {
            toast.error("Location data not available for this session");
            return;
        }
        setSelectedLog(log);
        // Scroll to map
        mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    React.useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/tracking`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error('Error fetching tracking logs:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = React.useMemo(() => {
        const q = searchTerm.toLowerCase();
        if (!q) return logs;
        return logs.filter(log =>
            log.employee.toLowerCase().includes(q) ||
            log.employeeId.toLowerCase().includes(q)
        );
    }, [logs, searchTerm]);



    return (
        <div className="flex-1 overflow-y-auto bg-background/50">
            <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Employee Tracking</h1>
                        <p className="text-muted-foreground mt-1">Monitor real-time login activity and device locations.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search employee or ID..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="p-2 border rounded-md hover:bg-muted/50 transition-colors">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>



                {/* Map Section */}
                <div className="w-full" ref={mapRef}>
                    <MapComponent logs={logs} selectedLog={selectedLog} />
                </div>

                {/* Tracking Table */}
                <Card className="bespoke-shadow">
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                        <CardDescription>Detailed record of user sessions and device telemetry.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Session Times</TableHead>
                                    <TableHead>Device / OS</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Location Details</TableHead>
                                    <TableHead className="text-right">Map</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                            Loading tracking data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                            No tracking logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="group hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{log.employee}</span>
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{log.employeeId}</span>
                                                </div>
                                            </TableCell>
                                            
                                            {/* Unified Time Columns */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Badge variant="outline" className="h-4 px-1 text-[8px] bg-emerald-50 text-emerald-600 border-emerald-100">IN</Badge>
                                                        <span className="font-medium">{log.loginTime}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Badge variant="outline" className="h-4 px-1 text-[8px] bg-slate-50 text-slate-500 border-slate-100">OUT</Badge>
                                                        <span className={cn("font-medium", log.logoutTime === "Currently Logged In" ? "text-emerald-500 italic" : "text-muted-foreground")}>
                                                            {log.logoutTime}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    {log.device === 'Mobile' ? (
                                                        <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                                                    ) : log.device === 'Tablet' ? (
                                                        <Tablet className="w-3.5 h-3.5 text-purple-500" />
                                                    ) : (
                                                        <Monitor className="w-3.5 h-3.5 text-slate-600" />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-xs">{log.device}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={log.deviceDetails}>
                                                            {log.deviceDetails}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block">
                                                    {log.ip || "Unknown"}
                                                </div>
                                            </TableCell>

                                            {/* Unified Location Column */}
                                            <TableCell>
                                                <div className="flex flex-col gap-2 min-w-[180px]">
                                                    {/* Login Location */}
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight">Login Location</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-3 group/loc cursor-pointer">
                                                            <MapPin className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-[11px] font-semibold text-slate-700">
                                                                {log.loginLocation}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Logout Location */}
                                                    {log.logoutTime !== "Currently Logged In" && (
                                                        <div className="flex flex-col gap-0.5 border-t border-slate-100 pt-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-tight">Logout Location</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 pl-3 group/loc cursor-pointer">
                                                                <MapPin className="w-3 h-3 text-red-500" />
                                                                <span className="text-[11px] font-semibold text-slate-700">
                                                                    {log.logoutLocation}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            
                                            <TableCell className="text-right">
                                                <button
                                                    onClick={() => handleViewOnMap(log)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                                    title="View on Map"
                                                >
                                                    <MapIcon size={16} />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Tracking;
