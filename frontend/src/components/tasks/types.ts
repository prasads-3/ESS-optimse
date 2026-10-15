export type Priority = "Low" | "Medium" | "High";
export type Status = "Pending" | "In Progress" | "Completed" | string;

export type DailyTaskItem = {
    id: number;
    dayName: string;
    title: string;
    description?: string | null;
    status: Status;
    comment?: string | null;
    completedAt?: string | null;
};

export type WeekItem = {
    id: number;
    weekNumber: number;
    startDate: string;
    endDate: string;
    progress: number;
    status: Status;
    dailyTasks: DailyTaskItem[];
};

export type TaskItem = {
    id: number;
    title: string;
    description?: string | null;
    assignedTo: string;
    assignedBy: string;
    priority: Priority;
    startDate: string;
    endDate: string;
    clientName?: string | null;
    address?: string | null;
    expectedDuration?: string | null;
    radius?: number | null;
    overallProgress: number;
    status: Status;
    createdAt: string;
    weeks: WeekItem[];
};
