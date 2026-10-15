export const MOCK_EMPLOYEES = [
    {
        id: 1,
        employeeId: "EMP001",
        name: "John Doe",
        email: "john.doe@mirakilabs.com",
        title: "Senior Developer",
        department: "Engineering",
        status: "Active",
        role: "user",
        joiningDate: "2023-01-15T00:00:00.000Z",
    },
    {
        id: 2,
        employeeId: "EMP002",
        name: "Jane Smith",
        email: "jane.smith@mirakilabs.com",
        title: "Product Manager",
        department: "Product",
        status: "Active",
        role: "user",
        joiningDate: "2023-03-20T00:00:00.000Z",
    },
];

export const MOCK_DASHBOARD_STATS = {
    totalEmployees: 42,
    totalPolicies: 12,
    activeEmployees: 38,
    onLeave: 3,
    pendingLeaves: 5,
    pendingLeavesList: [
        {
            id: 101,
            type: "Sick Leave",
            startDate: "2026-03-28T00:00:00.000Z",
            endDate: "2026-03-29T00:00:00.000Z",
            reason: "Fever",
            employee: { id: 1, name: "John Doe", photo: null }
        }
    ],
    activities: [
        { type: 'employee', target: 'Alice Johnson', time: new Date().toISOString(), action: 'added' },
        { type: 'announcement', target: 'New Office Policy', time: new Date().toISOString(), action: 'posted' }
    ],
    leaveAnalytics: [
        { month: 'Jan', count: 12 },
        { month: 'Feb', count: 8 },
        { month: 'Mar', count: 15 }
    ],
    trend: {
        total: "+3",
        active: "+2",
        leave: "+1",
        totalType: 'up',
        activeType: 'up',
        leaveType: 'up'
    }
};

export const MOCK_LEAVES_GROUPED = [
    {
        department: "Engineering",
        pending: 2,
        approved: 15,
        rejected: 1
    },
    {
        department: "Product",
        pending: 1,
        approved: 5,
        rejected: 0
    }
];

export const MOCK_EXPENSES_GROUPED = [
    {
        category: "Travel",
        total: 1250.50,
        count: 8
    },
    {
        category: "Office Supplies",
        total: 450.00,
        count: 12
    }
];

export const MOCK_PAYROLL_GROUPED = {
    totalPayroll: 250000,
    employeeCount: 42,
    averageSalary: 5952,
    departmentBreakdown: [
        { department: "Engineering", total: 150000 },
        { department: "Product", total: 100000 }
    ]
};

export const MOCK_ANNOUNCEMENTS = [
    {
        id: 1,
        title: "Welcome to our new office",
        content: "We are excited to announce the opening of our new office in Bengaluru!",
        createdAt: "2026-03-01T10:00:00.000Z",
        effectiveDate: "2026-03-15"
    }
];

export const MOCK_HOLIDAYS = [
    { id: 1, name: "Diwali", date: "2026-11-01T00:00:00.000Z", type: "Mandatory" },
    { id: 2, name: "New Year", date: "2026-01-01T00:00:00.000Z", type: "Mandatory" }
];

export const MOCK_POLICIES = [
    { id: 1, title: "Leave Policy", category: "HR", version: "V2.1", fileSize: "1.2 MB" },
    { id: 2, title: "IT Security", category: "IT", version: "V1.0", fileSize: "2.4 MB" }
];
