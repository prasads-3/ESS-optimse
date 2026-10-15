import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Lazy-load components
const Index = lazy(() => import("./pages/Index"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Documentation = lazy(() => import("./pages/Documentation"));
const TimeAndLeave = lazy(() => import("./pages/TimeAndLeave"));
const LeavePolicies = lazy(() => import("./pages/LeavePolicies"));
const UploadPayslip = lazy(() => import("./pages/UploadPayslip"));
const AdminHolidays = lazy(() => import("./pages/AdminHolidays"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Settings = lazy(() => import("./pages/Settings"));
const LeaveList = lazy(() => import("./pages/LeaveList"));
const EmployeeLeaveHistory = lazy(() => import("./pages/EmployeeLeaveHistory"));
const EmployeePayrollHistory = lazy(() => import("./pages/EmployeePayrollHistory"));
const EmployeeExpenseHistory = lazy(() => import("./pages/EmployeeExpenseHistory"));
const AdminDashboard = lazy(() => import("./admin/page"));
const UserDashboard = lazy(() => import("./user/page"));
const MyPayslips = lazy(() => import("./user/MyPayslips"));
const MyExpenses = lazy(() => import("./user/MyExpenses"));
const ExpensesList = lazy(() => import("./pages/ExpensesList"));
const LoginPage = lazy(() => import("./login/page"));
const Tracking = lazy(() => import("./pages/Tracking"));
const MyAttendance = lazy(() => import("./user/MyAttendance"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserHoliday = lazy(() => import("./user/UserHoliday"));
const ReferralPage = lazy(() => import("./user/ReferralPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const Landing = lazy(() => import("./pages/Landing"));
const MyLeaves = lazy(() => import("./user/MyLeaves"));
const MyApprovals = lazy(() => import("./user/MyApprovals"));
const SuperAdminLayout = lazy(() => import("./super-admin/SuperAdminLayout"));
const Dashboard = lazy(() => import("./super-admin/Dashboard"));
const Organizations = lazy(() => import("./super-admin/Organizations"));
const SubscriptionPlans = lazy(() => import("./super-admin/SubscriptionPlans"));
const LifecycleEngine = lazy(() => import("./super-admin/LifecycleEngine"));
const AuditLog = lazy(() => import("./super-admin/AuditLog"));
const CustomRequests = lazy(() => import("./super-admin/CustomRequests"));
const OrganizationEmail = lazy(() => import("./super-admin/OrganizationEmail"));
const AdminSubscription = lazy(() => import("./admin/AdminSubscription"));
const AdminReferrals = lazy(() => import("./pages/AdminReferrals"));
const AdminFieldTasks = lazy(() => import("./pages/AdminFieldTasks"));
const MyFieldTasks = lazy(() => import("./user/MyFieldTasks"));
const AdminFundRequests = lazy(() => import("./admin/FundRequests"));
const AdminExpenseLimits = lazy(() => import("./pages/AdminExpenseLimits"));
const AttendancePage = lazy(() => import("./pages/Attendance"));
const AdminLayout = lazy(() =>
  import("./admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const UserLayout = lazy(() =>
  import("./user/UserLayout").then((m) => ({ default: m.UserLayout }))
);
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const LoadingBuffer = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingBuffer />}>
            <Routes>

              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<LoginPage />} />
              {/* Legacy login entry points now consolidate to the single global /login.
                  Routes kept so old shared links keep working — they just redirect. */}
              <Route path="/miraki/login" element={<Navigate to="/login" replace />} />
              <Route path="/org/:slug/login" element={<Navigate to="/login" replace />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Super Admin */}
              <Route
                path="/super-admin"
                element={
                  <ProtectedRoute allowedRoles={['super-admin']}>
                    <Suspense fallback={<LoadingBuffer />}>
                      <SuperAdminLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="plans" element={<SubscriptionPlans />} />
                <Route path="lifecycle" element={<LifecycleEngine />} />
                <Route path="audit" element={<AuditLog />} />
                <Route path="custom-requests" element={<CustomRequests />} />
                <Route path="organization-email" element={<OrganizationEmail />} />
              </Route>

              {/* Admin Routes — single AdminLayout with nested children so the
                  sidebar/topbar stay mounted across navigations */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/employees" element={<Index />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/time-leave" element={<TimeAndLeave />} />
                <Route path="/leave-policies" element={<LeavePolicies />} />
                <Route path="/upload-payslip" element={<UploadPayslip />} />
                <Route path="/admin/holidays" element={<AdminHolidays />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin/expense-history/:id" element={<EmployeeExpenseHistory />} />
                <Route path="/admin/leave-history/:id" element={<EmployeeLeaveHistory />} />
                <Route path="/admin/payroll-history/:id" element={<EmployeePayrollHistory />} />
                <Route path="/leave-list" element={<LeaveList />} />
                <Route path="/expenses-list" element={<ExpensesList />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/admin/attendance" element={<AttendancePage />} />
                <Route path="/tracking" element={<Tracking />} />
                <Route path="/admin/subscription" element={<AdminSubscription />} />
                <Route path="/admin/referrals" element={<AdminReferrals />} />
                <Route path="/admin/fund-requests" element={<AdminFundRequests />} />
                <Route path="/admin/expense-limits" element={<AdminExpenseLimits />} />
                <Route path="/admin/field-tasks" element={<AdminFieldTasks />} />
              </Route>

              {/* User Routes — single UserLayout with nested children */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['user', 'admin']}>
                    <UserLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/user" element={<UserDashboard />} />
                <Route path="/user/payslips" element={<MyPayslips />} />
                <Route path="/user/expenses" element={<MyExpenses />} />
                <Route path="/user/holidays" element={<UserHoliday />} />
                <Route path="/user/announcements" element={<Announcements />} />
                <Route path="/user/documentation" element={<Documentation />} />
                <Route path="/user/settings" element={<Settings />} />
                <Route path="/user/referrals" element={<ReferralPage />} />
                <Route path="/user/leaves" element={<MyLeaves />} />
                <Route path="/user/approvals" element={<MyApprovals />} />
                <Route path="/user/attendance" element={<MyAttendance />} />
                <Route path="/user/field-tasks" element={<MyFieldTasks />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
