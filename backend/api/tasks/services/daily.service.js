import prisma from '../../../lib/prisma.js';

export const dailyService = {
    async create(weekId, data) {
        const week = await prisma.taskWeek.findUnique({ where: { id: weekId } });
        if (!week) throw Object.assign(new Error('Week not found'), { status: 404 });

        return prisma.dailyTask.create({
            data: {
                weekId,
                dayName: data.dayName,
                title: data.title,
                description: data.description ?? null,
            },
        });
    },

    async update(id, data) {
        const daily = await prisma.dailyTask.findUnique({ where: { id } });
        if (!daily) throw Object.assign(new Error('Daily task not found'), { status: 404 });

        const updateData = {};
        if (data.comment !== undefined) updateData.comment = data.comment;
        if (data.status) {
            updateData.status = data.status;
            updateData.completedAt = data.status === 'Completed' ? new Date() : null;
        }

        return prisma.dailyTask.update({ where: { id }, data: updateData });
    },

    async findByWeek(weekId) {
        return prisma.dailyTask.findMany({ where: { weekId } });
    },
};
