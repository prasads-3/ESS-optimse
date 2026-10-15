import { API_BASE_URL } from '@/config';
import React, { useState, useEffect } from "react";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Info,
    Search,
    CheckCircle2
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
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import NoAccessBlock from '@/components/NoAccessBlock';

const DayCell = React.memo(({ status, location, isInvalidDate }: { status?: string, location?: string, isInvalidDate?: boolean }) => {
    if (isInvalidDate) {
        return <div className="w-full h-full bg-slate-50/30 cursor-not-allowed"></div>;
    }
    if (status === 'P') {
        return (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-emerald-500/10 cursor-pointer mx-auto" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-white border rounded-lg shadow-xl p-3 z-[100] min-w-[120px]">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Present</span>
                            {location && (
                                <div className="flex items-center gap-1.5 pt-1 border-t mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-bold text-slate-700">{location}</span>
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return null;
});
DayCell.displayName = 'DayCell';

const AttendancePage = () => {
    const { user, hasFeature } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'matrix' | 'today'>('matrix');
    const [isLoading, setIsLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [month, setMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    const fetchAttendance = async (silentLoad = false) => {
        if (!silentLoad) setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/attendance?month=all&year=${year}`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setAttendanceData(data);
                if (data.attendance?.length > 0 && !selectedEmployeeId) {
                    const currentUserData = data.attendance.find((e: any) => String(e.id) === String(user?.id));
                    setSelectedEmployeeId(currentUserData ? String(currentUserData.id) : String(data.attendance[0].id));
                }
            } else {
                toast.error("Failed to load attendance records");
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToExcel = async () => {
        const XLSX = await import('xlsx');

        // Pull the latest data at export time. The page doesn't poll, so the
        // state can be stale — without this, attendance marked today (after the
        // page loaded) would be missing and show as Absent in the sheet.
        let exportData = attendanceData;
        try {
            const response = await fetch(`${API_BASE_URL}/api/attendance?month=all&year=${year}`, { credentials: 'include' });
            if (response.ok) {
                exportData = await response.json();
                setAttendanceData(exportData); // keep the on-screen matrix in sync too
            }
        } catch {
            // Network hiccup — fall back to whatever is already in state.
        }

        if (!exportData?.attendance) {
            toast.error("No data available for export");
            return;
        }

        const fileName = `Attendance_Report_${selectedEmployeeData?.name || 'Full_Staff'}_${year}.xlsx`;
        const workbook = XLSX.utils.book_new();

        // Days after today haven't happened yet — leave them blank instead of
        // labelling them "Absent", which made the whole rest of the year read as
        // absent and the totals look wrong.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If a specific employee is selected, we only export their data
        const targetEmployees = selectedEmployeeId
            ? exportData.attendance.filter((e: any) => String(e.id) === String(selectedEmployeeId))
            : exportData.attendance;

        // Create a sheet for each month
        months.forEach((mName, mIdx) => {
            const formattedData = targetEmployees.map((emp: any) => {
                const row: any = {
                    "Member Name": emp.name,
                    "Employee ID": emp.employeeId,
                };

                let totalPresent = 0, totalAbsent = 0, totalLeaves = 0;
                const dInM = new Date(year, mIdx + 1, 0).getDate();
                for (let d = 1; d <= dInM; d++) {
                    const colKey = d.toString().padStart(2, '0');
                    const cellDate = new Date(year, mIdx, d);

                    // Future date — hasn't occurred, so no status and not counted.
                    if (cellDate > today) {
                        row[colKey] = "";
                        continue;
                    }

                    // Backend leaves truly-absent weekdays as '' — treat that as Absent.
                    const status = emp.days[`${(mIdx + 1).toString().padStart(2, '0')}-${colKey}`] || 'A';

                    const statusLabel =
                        status === 'P' ? "Present" :
                            status === 'A' ? "Absent" :
                                status === 'L' ? "Leave" :
                                    status === 'H' ? "Holiday" :
                                        status === 'W' ? "Weekend" : "Absent";

                    row[colKey] = statusLabel;

                    if (status === 'P') totalPresent++;
                    else if (status === 'L') totalLeaves++;
                    else if (status === 'A') totalAbsent++;
                }

                row["Total Present"] = totalPresent;
                row["Total Absent"] = totalAbsent;
                row["Total Leaves"] = totalLeaves;

                return row;
            });

            // Define explicit column order to ensure it starts from Day 01
            const headers = [
                "Member Name",
                "Employee ID",
                ...[...Array(31)].map((_, i) => (i + 1).toString().padStart(2, '0')),
                "Total Present",
                "Total Absent",
                "Total Leaves"
            ];

            const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: headers });

            // Auto-size columns (rough estimate)
            const wscols = [
                { wch: 20 }, // Name
                { wch: 12 }, // ID
                ...[...Array(31)].map(() => ({ wch: 10 })), // Days
                { wch: 12 }, // Totals
                { wch: 12 },
                { wch: 12 }
            ];
            worksheet['!cols'] = wscols;

            XLSX.utils.book_append_sheet(workbook, worksheet, mName.substring(0, 31)); // sheet name max 31 chars
        });

        XLSX.writeFile(workbook, fileName);
        toast.success(`Exported full 12-month report with separate pages.`);
    };

    useEffect(() => {
        fetchAttendance();
    }, [year]);

    if (!hasFeature("attendance")) {
        return <NoAccessBlock feature="Attendance" />;
    }

    const filteredAttendance = attendanceData?.attendance?.filter((emp: any) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const selectedEmployeeData = attendanceData?.attendance?.find((emp: any) => String(emp.id) === String(selectedEmployeeId));

    // getStatusIcon replaced by DayCell memoized component for performance

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">Attendance Matrix</h1>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">Yearly Overview {year}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 bg-white/50 p-1 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center bg-slate-100/80 rounded-lg p-0.5">
                            <Button
                                variant={viewMode === 'today' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('today')}
                                className={cn("text-xs h-8 px-4 rounded-md relative", viewMode === 'today' && "bg-white shadow-sm border border-slate-200")}
                            >
                                <div className="flex items-center gap-2">
                                    <span>Today</span>
                                    {viewMode === 'today' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                                </div>
                            </Button>
                            <Button
                                variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('matrix')}
                                className={cn("text-xs h-8 px-4 rounded-md", viewMode === 'matrix' && "bg-white shadow-sm border border-slate-200")}
                            >
                                Matrix
                            </Button>
                        </div>

                        <div className="w-[1px] h-6 bg-slate-200 mx-1" />

                        {viewMode === 'matrix' ? (
                            <Select
                                value={selectedEmployeeId || ""}
                                onValueChange={(val) => setSelectedEmployeeId(val)}
                            >
                                <SelectTrigger className="h-9 w-[180px] border-none bg-slate-100/50 hover:bg-slate-200/50 transition-colors font-bold text-xs ring-0 focus:ring-0 rounded-lg">
                                    <SelectValue placeholder="Select Member" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    {attendanceData?.attendance?.map((emp: any) => (
                                        <SelectItem key={emp.id} value={String(emp.id)} className="text-[11px] font-bold">{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMonth(m => {
                                        if (m === 'all') return 12;
                                        return m === 1 ? 'all' : m - 1;
                                    })}
                                    className="h-8 w-8 hover:bg-slate-200/50 rounded-lg"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMonth(m => {
                                        if (m === 'all') return 1;
                                        return m === 12 ? 'all' : m + 1;
                                    })}
                                    className="h-8 w-8 hover:bg-slate-200/50 rounded-lg"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                            <Input
                                placeholder="Search..."
                                className="pl-8 h-9 w-[180px] bg-white border-slate-200 text-xs rounded-lg shadow-sm ring-0 focus:ring-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 h-9 border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50"
                            onClick={exportToExcel}
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export</span>
                        </Button>
                    </div>
                </div>



                {/* Attendance Table */}
                <Card className="border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto relative max-h-[750px]">
                            {viewMode === 'today' ? (
                                <Table className="border-separate border-spacing-0">
                                    <TableHeader className="sticky top-0 z-[40] bg-white border-b shadow-sm">
                                        <TableRow className="hover:bg-transparent border-b">
                                            <TableHead className="sticky left-0 z-[50] bg-white border-r min-w-[200px] text-slate-900 font-black uppercase text-[10px] tracking-widest pl-6">Employee</TableHead>
                                            <TableHead className="text-center w-32 border-r bg-white text-slate-900 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                                            <TableHead className="text-center w-32 border-r bg-white text-slate-900 font-black uppercase text-[10px] tracking-widest">Marked At</TableHead>
                                            <TableHead className="text-center w-32 border-r bg-white text-slate-900 font-black uppercase text-[10px] tracking-widest">Shift</TableHead>
                                            <TableHead className="text-center border-r bg-white text-slate-900 font-black uppercase text-[10px] tracking-widest">Location</TableHead>
                                            <TableHead className="text-right pr-6 bg-white text-slate-900 font-black uppercase text-[10px] tracking-widest">Activity</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-24"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Monitoring Real-time Activity</p></div></TableCell></TableRow>
                                        ) : filteredAttendance.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-24 text-slate-400 font-black uppercase text-[10px] tracking-widest">Empty Registry</TableCell></TableRow>
                                        ) : (
                                            filteredAttendance.map((emp: any) => {
                                                // API returns days keyed as "MM-DD" because we fetch with month=all (isYearly).
                                                // Using just the day (e.g. "20") would never match, so every row fell back to Absent.
                                                const _now = new Date();
                                                const todayStr = `${(_now.getMonth() + 1).toString().padStart(2, '0')}-${_now.getDate().toString().padStart(2, '0')}`;
                                                const status = emp.days[todayStr] || 'A';

                                                return (
                                                    <TableRow key={emp.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-none group h-14">
                                                        <TableCell className="sticky left-0 z-[10] bg-white group-hover:bg-slate-50 border-r transition-colors pl-6 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-900 font-black text-sm">{emp.name}</span>
                                                                <span className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold">{emp.employeeId}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center border-r">
                                                            <div className="flex justify-center">
                                                                {status === 'P' ? (
                                                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 transition-colors px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border">Present</Badge>
                                                                ) : status === 'L' ? (
                                                                    <Badge className="bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 transition-colors px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border">On Leave</Badge>
                                                                ) : status === 'W' ? (
                                                                    <Badge className="bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 transition-colors px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border">Weekend</Badge>
                                                                ) : status === 'H' ? (
                                                                    <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 transition-colors px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border">Holiday</Badge>
                                                                ) : (
                                                                    <Badge className="bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100 transition-colors px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-lg border">Absent</Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center border-r text-xs font-bold text-slate-600">
                                                            {status === 'P' ? "09:00 AM" : "---"}
                                                        </TableCell>
                                                        <TableCell className="text-center border-r text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            {status === 'P' ? "General" : "---"}
                                                        </TableCell>
                                                        <TableCell className="text-center border-r text-xs font-bold text-slate-600">
                                                            {status === 'P' ? (emp.locations?.[todayStr] || "Primary Office") : "---"}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 shadow-sm"><Info className="w-4 h-4 text-slate-400" /></Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Table className="border-separate border-spacing-0">
                                    <TableHeader className="sticky top-0 z-[40] bg-white border-b shadow-sm">
                                        <TableRow className="hover:bg-transparent border-b">
                                            <TableHead className="sticky left-0 z-[50] bg-white border-r min-w-[120px] text-slate-900 font-black uppercase text-[10px] tracking-widest pl-4">Month</TableHead>
                                            {[...Array(31)].map((_, i) => (
                                                <TableHead key={i} className="text-center w-10 min-w-[2.5rem] border-r border-slate-100 text-slate-800 font-black text-[10px] p-0">
                                                    {(i + 1).toString().padStart(2, '0')}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading || !selectedEmployeeData ? (
                                            months.map((mName, mIdx) => (
                                                <TableRow key={mIdx} className="border-b border-slate-50">
                                                    <TableCell className="sticky left-0 z-[10] bg-white border-r font-black text-[11px] text-slate-400 uppercase tracking-widest pl-4 h-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                        {mName.substring(0, 3)}
                                                    </TableCell>
                                                    {[...Array(31)].map((_, dIdx) => (
                                                        <TableCell key={dIdx} className="text-center p-0 h-10 border-r border-slate-50">
                                                            {isLoading ? (
                                                                <div className="w-3 h-3 bg-slate-200/50 rounded-full mx-auto animate-pulse" />
                                                            ) : null}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            months.map((mName, mIdx) => (
                                                <TableRow key={mIdx} className="hover:bg-slate-100/30 transition-all border-b border-slate-50 group">
                                                    <TableCell className="sticky left-0 z-[10] bg-white group-hover:bg-slate-50 border-r font-black text-[11px] text-slate-400 uppercase tracking-widest pl-4 h-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-colors">
                                                        {mName.substring(0, 3)}
                                                    </TableCell>
                                                    {[...Array(31)].map((_, dIdx) => {
                                                        const dayNum = dIdx + 1;
                                                        const dayKey = `${(mIdx + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
                                                        const status = selectedEmployeeData.days[dayKey];
                                                        const dInM = new Date(year, mIdx + 1, 0).getDate();
                                                        const isInvalidDate = dayNum > dInM;

                                                        return (
                                                            <TableCell key={dIdx} className="text-center p-0 h-10 border-r border-slate-50 transition-all duration-300">
                                                                <DayCell status={status} location={selectedEmployeeData.locations?.[dayKey]} isInvalidDate={isInvalidDate} />
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AttendancePage;
