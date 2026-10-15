import prisma from '../../../lib/prisma.js';

export const weekService = {
    async create(taskId, data) {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw Object.assign(new Error('Task not found'), { status: 404 });

        return prisma.taskWeek.create({
            data: {
                taskId,
                weekNumber: data.weekNumber,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
            },
        });
    },

    async findById(id) {
        return prisma.taskWeek.findUnique({
            where: { id },
            include: { dailyTasks: true, task: true },
        });
    },

    async findByTask(taskId) {
        return prisma.taskWeek.findMany({
            where: { taskId },
            orderBy: { weekNumber: 'asc' },
            include: { dailyTasks: true },
        });
    },

    async recalcProgress(weekId) {
        const dailies = await prisma.dailyTask.findMany({ where: { weekId } });
        if (!dailies.length) return null;
        const completed = dailies.filter(d => d.status === 'Completed').length;
        const progress = Math.round((completed / dailies.length) * 100);
        const status = progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending';
        const week = await prisma.taskWeek.update({
            where: { id: weekId },
            data: { progress, status },
        });
        return week;
    },
};
