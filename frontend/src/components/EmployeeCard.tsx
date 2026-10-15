import { MapPin, Phone, Mail, Linkedin, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import EmployeeAvatar from "@/components/EmployeeAvatar";

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  location: string;
  photo: string;
  online: boolean;
  reportsTo: string;
  reportsToName?: string;
  team: string;
  department: string;
  employmentType: string;
  status: string;
  joiningDate: string;
  phone: string;
  email: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyPhone?: string;
  password?: string;
  linkedin?: string;
  marriedStatus?: string;
  dob?: string | Date;
  hobbies?: string;
  certification?: string;
  aadhaar?: string;
  passport?: string;
  panCard?: string;
  bankAccount?: string;
  ifsc?: string;
  bankName?: string;
  bankBranch?: string;
  bankBranchLocation?: string;
  chequeImage?: string;
  expenseLimit: number;
  asset?: string;
}

export function EmployeeCard({
  employee,
  onClick,
  onDelete,
  onEdit
}: {
  employee: Employee;
  onClick?: () => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onEdit?: (employee: Employee, e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg bespoke-border p-5 bespoke-shadow card-hover animate-fade-in group cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-5 border-b border-border/40 pb-4">
        <div className="relative shrink-0">
          <EmployeeAvatar
            name={employee.name}
            photo={employee.photo}
            size="md"
            className="w-12 h-12 rounded-lg grayscale-[20%] group-hover:grayscale-0 transition-all shadow-sm"
          />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card",
              employee.online ? "bg-success" : "bg-muted-foreground/30"
            )}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-foreground/90 truncate leading-tight group-hover:text-primary transition-colors">
              {employee.name}
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold shrink-0">
              {employee.employeeId}
            </span>
          </div>
          <p className="text-[10px] font-semibold text-primary mt-0.5">{employee.title}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-muted-foreground/60">
            <MapPin size={10} className="text-primary/60" />
            <span className="truncate">{employee.location}</span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mb-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground/40 leading-none">Reports To</span>
          <span className="text-[11px] font-semibold text-foreground/70 leading-none">{employee.reportsTo}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground/40 leading-none">Team</span>
          <span className="text-[11px] font-semibold text-foreground/70 leading-none">{employee.team}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground/40 leading-none">Joined</span>
          <span className="text-[11px] font-semibold text-foreground/70 leading-none">
            {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground/40 leading-none">Email</span>
          <span className="text-[11px] font-semibold text-foreground/70 leading-none truncate">{employee.email}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-border/40">
        <a
          href={employee.linkedin ? (employee.linkedin.startsWith('http') ? employee.linkedin : `https://${employee.linkedin}`) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "p-2 rounded-lg transition-all",
            employee.linkedin
              ? "text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
              : "text-muted-foreground/20 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (!employee.linkedin) e.preventDefault();
          }}
        >
          <Linkedin size={14} />
        </a>
        <a
          href={`mailto:${employee.email}`}
          className="p-2 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Mail size={14} />
        </a>
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(employee, e);
          }}
          className="p-2 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all"
          title="Edit Employee"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(e) => onDelete?.(employee.id, e)}
          className="p-2 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-all"
          title="Delete Employee"
        >
          <Trash2 size={14} />
        </button>
        <button className="p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all">
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}
