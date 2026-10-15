import { API_BASE_URL } from '@/config';
import { useState, useMemo, lazy, Suspense } from "react";
import { Search, ChevronDown, LayoutGrid, List, Pencil, Trash2, Network } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EmployeeCard } from "@/components/EmployeeCard";
import { Employee } from "@/components/EmployeeCard";
import { Skeleton } from "@/components/ui/skeleton";
import EmployeeAvatar from "@/components/EmployeeAvatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const EmployeeMindmap = lazy(() => import("@/components/EmployeeMindmap"));

const AddEmployeeDialog = lazy(() => import("@/components/AddEmployeeDialog").then(m => ({ default: m.AddEmployeeDialog })));
const EditEmployeeDialog = lazy(() => import("@/components/EditEmployeeDialog").then(m => ({ default: m.EditEmployeeDialog })));
const EmployeeDetailPanel = lazy(() => import("@/components/EmployeeDetailPanel").then(m => ({ default: m.EmployeeDetailPanel })));

const EmployeeCardSkeleton = () => (
  <div className="bg-card border border-border/60 rounded-xl p-5">
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
    <Skeleton className="h-3 w-full mb-2" />
    <Skeleton className="h-3 w-4/5" />
  </div>
);

const EMPLOYEES_KEY = ['employees'] as const;

const Index = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table" | "mindmap">("card");
  const [techHeadEmail, setTechHeadEmail] = useState<string>(
    () => (typeof localStorage !== "undefined" && localStorage.getItem("techHeadEmail")) || ""
  );

  const updateTechHead = (email: string) => {
    setTechHeadEmail(email);
    if (email) localStorage.setItem("techHeadEmail", email);
    else localStorage.removeItem("techHeadEmail");
  };

  const { data: employees = [], isLoading, refetch } = useQuery<Employee[]>({
    queryKey: EMPLOYEES_KEY,
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/employees`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      return data.map((emp: any) => ({
        ...emp,
        online: emp.status === "active",
        photo: emp.photo || null,
        reportsTo: emp.reportsTo || "None",
        location: emp.location || "Office",
        linkedin: emp.linkedin || "",
      }));
    },
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        queryClient.setQueryData<Employee[]>(EMPLOYEES_KEY, prev => (prev ?? []).filter(emp => emp.id !== id));
        toast.success("Employee deleted successfully");
        if (selectedEmployee?.id === id) setSelectedEmployee(null);
      } else {
        toast.error("Failed to delete employee");
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error("Error deleting employee");
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        (emp?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp?.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (emp?.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesJob =
        jobFilter === "All" || emp.title.includes(jobFilter);
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && emp.online) ||
        (statusFilter === "Away" && !emp.online);
      return matchesSearch && matchesJob && matchesStatus;
    });
  }, [employees, search, jobFilter, statusFilter]);

  return (
    <div className="flex-1 overflow-y-auto bg-background/30 px-4 md:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Page Header */}


        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative w-full lg:max-w-md group">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            />
            <input
              type="text"
              placeholder="Filter names, titles, or emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-card border border-border/80 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-muted-foreground/50">Role</span>
              <div className="relative">
                <select
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 bg-card border border-border/80 rounded-lg text-[11px] font-semibold text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                >
                  <option>All</option>
                  <option>Designer</option>
                  <option>Engineer</option>
                  <option>Manager</option>
                  <option>Analyst</option>
                </select>
                <ChevronDown
                  size={12}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
                />
              </div>
            </div>

            {/* Card / Table view toggle */}
            <div className="flex items-center bg-card border border-border/80 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("card")}
                title="Card view"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "card"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("mindmap")}
                title="Mindmap (reporting hierarchy)"
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === "mindmap"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Network size={15} />
              </button>
            </div>

            <Suspense fallback={null}>
              <AddEmployeeDialog onSuccess={() => refetch()} />
            </Suspense>
          </div>
        </div>

        {/* Employees */}
        {isLoading ? (
          viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => <EmployeeCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading employees…</div>
          )
        ) : (
          <>
            {viewMode === "card" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
                {filteredEmployees.map((emp, i) => (
                  <div key={emp.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <EmployeeCard
                      employee={emp}
                      onClick={() => setSelectedEmployee(emp)}
                      onDelete={handleDelete}
                      onEdit={(employee, e) => {
                        setEditingEmployee(employee);
                        setIsEditDialogOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {viewMode === "table" && (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredEmployees.map((emp) => (
                        <tr
                          key={emp.id}
                          onClick={() => setSelectedEmployee(emp)}
                          className="hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <EmployeeAvatar name={emp.name} photo={emp.photo} size="md" />
                              <span className="text-sm font-semibold text-foreground">{emp.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm text-muted-foreground">{emp.title || "—"}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm text-muted-foreground">{emp.email || "—"}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border",
                              emp.online
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", emp.online ? "bg-emerald-500" : "bg-slate-400")} />
                              {emp.online ? "Active" : "Away"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEmployee(emp);
                                  setIsEditDialogOpen(true);
                                }}
                                title="Edit"
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(emp.id, e)}
                                title="Delete"
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === "mindmap" && (
              <div className="space-y-4">
                <Suspense fallback={<div className="py-16 text-center text-muted-foreground text-sm">Building org chart…</div>}>
                  <EmployeeMindmap
                    employees={employees}
                    onSelect={setSelectedEmployee}
                    techHeadEmail={techHeadEmail}
                    admin={user?.role === "admin" ? { id: user.id, name: user.name, email: user.email, photo: user.photo } : undefined}
                  />
                </Suspense>
              </div>
            )}

            {viewMode !== "mindmap" && filteredEmployees.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-sm">
                  No employees found matching your criteria.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedEmployee && (
        <Suspense fallback={null}>
          <EmployeeDetailPanel
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
        </Suspense>
      )}

      {isEditDialogOpen && (
        <Suspense fallback={null}>
          <EditEmployeeDialog
            employee={editingEmployee}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={(updatedEmployee) => {
              queryClient.setQueryData<Employee[]>(EMPLOYEES_KEY, prev =>
                (prev ?? []).map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp)
              );
              if (selectedEmployee?.id === updatedEmployee.id) {
                setSelectedEmployee(updatedEmployee);
              }
            }}
          />
        </Suspense>
      )}
    </div>


  );
};

export default Index;

