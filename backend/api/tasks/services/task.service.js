import prisma from '../../../lib/prisma.js';

export const taskService = {
    async create(data, assignedBy) {
        return prisma.task.create({
            data: {
                title: data.title,
                description: data.description ?? null,
                assignedTo: data.assignedTo,
                assignedBy,
                priority: data.priority ?? 'Medium',
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                clientName: data.clientName ?? null,
                address: data.address ?? null,
                expectedDuration: data.expectedDuration ?? null,
                radius: data.radius ?? null,
            },
        });
    },

    // Task has no organizationId column; it references an employee by email via
    // `assignedTo`. `emails` is the caller org's employee emails (null for
    // super-admin → all tasks). See lib/tenant.js orgEmployeeEmails.
    async findAll(emails = null) {
        const where = emails ? { assignedTo: { in: emails } } : {};
        return prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { weeks: { include: { dailyTasks: true } } },
        });
    },

    async findById(id) {
        return prisma.task.findUnique({
            where: { id },
            include: { weeks: { include: { dailyTasks: true } } },
        });
    },

    async findByAssignee(assignedTo) {
        return prisma.task.findMany({
            where: { assignedTo },
            orderBy: { createdAt: 'desc' },
            include: { weeks: { include: { dailyTasks: true } } },
        });
    },

    async remove(id) {
        return prisma.task.delete({ where: { id } });
    },

    async recalcProgress(taskId) {
        const weeks = await prisma.taskWeek.findMany({ where: { taskId } });
        if (!weeks.length) return;
        const overall = Math.round(weeks.reduce((s, w) => s + w.progress, 0) / weeks.length);
        const status = overall === 100 ? 'Completed' : overall > 0 ? 'In Progress' : 'Pending';
        await prisma.task.update({ where: { id: taskId }, data: { overallProgress: overall, status } });
    },
};
