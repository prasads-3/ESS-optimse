import prisma from '../../lib/prisma.js';

export const fieldTaskService = {
    async create(data, assignedBy, organizationId) {
        return prisma.fieldTask.create({
            data: {
                title: data.title,
                description: data.description ?? null,
                assignedTo: data.assignedTo,
                assignedBy,
                clientName: data.clientName ?? null,
                address: data.address ?? null,
                latitude: data.latitude,
                longitude: data.longitude,
                allowedRadius: data.allowedRadius ?? 100,
                date: new Date(data.date),
                expectedDuration: data.expectedDuration ?? null,
                organizationId: organizationId ?? null,
            },
        });
    },

    async createMany(tasks, assignedTo, assignedBy, organizationId) {
        return prisma.$transaction(
            tasks.map(t =>
                prisma.fieldTask.create({
                    data: {
                        title: t.title,
                        description: t.description ?? null,
                        assignedTo,
                        assignedBy,
                        clientName: t.clientName ?? null,
                        address: t.address ?? null,
                        latitude: t.latitude,
                        longitude: t.longitude,
                        allowedRadius: t.allowedRadius ?? 100,
                        date: new Date(t.date),
                        expectedDuration: t.expectedDuration ?? null,
                        organizationId: organizationId ?? null,
                    },
                })
            )
        );
    },

    // List views omit the heavy base64 proofImage; it's fetched lazily per task.
    // `where` scopes to the caller's org (empty {} for super-admin → all orgs).
    async findAll(where = {}) {
        return prisma.fieldTask.findMany({
            where,
            orderBy: { date: 'desc' },
            omit: { proofImage: true },
        });
    },

    async findByAssignee(assignedTo) {
        return prisma.fieldTask.findMany({
            where: { assignedTo },
            orderBy: { date: 'desc' },
            omit: { proofImage: true },
        });
    },

    async findById(id) {
        return prisma.fieldTask.findUnique({ where: { id } });
    },

    async checkIn(id, lat, lng) {
        return prisma.fieldTask.update({
            where: { id },
            data: {
                status: 'In Progress',
                checkInTime: new Date(),
                checkInLat: lat,
                checkInLng: lng,
                // reset any prior checkout if re-checking in
                checkOutTime: null,
                checkOutLat: null,
                checkOutLng: null,
                totalDuration: null,
                autoCheckout: false,
            },
        });
    },

    async checkOut(id, lat, lng, auto) {
        const task = await prisma.fieldTask.findUnique({ where: { id } });
        const checkOutTime = new Date();
        let totalDuration = null;
        if (task?.checkInTime) {
            totalDuration = Math.max(
                0,
                Math.round((checkOutTime.getTime() - new Date(task.checkInTime).getTime()) / 60000)
            );
        }
        return prisma.fieldTask.update({
            where: { id },
            data: {
                status: 'Completed',
                checkOutTime,
                checkOutLat: lat ?? null,
                checkOutLng: lng ?? null,
                totalDuration,
                autoCheckout: !!auto,
            },
        });
    },

    // Move a task to a new employee and reset it to a fresh "Assigned" state —
    // the previous assignee's progress/proof/notes don't carry over.
    async reassign(id, assignedTo) {
        return prisma.fieldTask.update({
            where: { id },
            data: {
                assignedTo,
                status: 'Assigned',
                checkInTime: null,
                checkInLat: null,
                checkInLng: null,
                checkOutTime: null,
                checkOutLat: null,
                checkOutLng: null,
                totalDuration: null,
                autoCheckout: false,
                notes: null,
                proofImage: null,
                missedReason: null,
            },
        });
    },

    // Employee reports they couldn't make the visit, with a reason.
    async markNotVisited(id, reason) {
        return prisma.fieldTask.update({
            where: { id },
            data: {
                status: 'Not Visited',
                missedReason: reason,
                checkInTime: null,
                checkInLat: null,
                checkInLng: null,
                checkOutTime: null,
                checkOutLat: null,
                checkOutLng: null,
                totalDuration: null,
                autoCheckout: false,
            },
        });
    },

    async update(id, patch) {
        const data = {};
        if (patch.notes !== undefined) data.notes = patch.notes;
        if (patch.proofImage !== undefined) data.proofImage = patch.proofImage;
        return prisma.fieldTask.update({ where: { id }, data });
    },

    // Admin edits a task's details. Only provided fields change; empty strings
    // clear the nullable text fields. Assignment/progress are left untouched.
    async adminUpdate(id, patch) {
        const data = {};
        if (patch.title !== undefined) data.title = patch.title;
        if (patch.description !== undefined) data.description = patch.description || null;
        if (patch.clientName !== undefined) data.clientName = patch.clientName || null;
        if (patch.address !== undefined) data.address = patch.address || null;
        if (patch.latitude !== undefined) data.latitude = patch.latitude;
        if (patch.longitude !== undefined) data.longitude = patch.longitude;
        if (patch.allowedRadius !== undefined) data.allowedRadius = patch.allowedRadius;
        if (patch.date !== undefined) data.date = new Date(patch.date);
        if (patch.expectedDuration !== undefined) data.expectedDuration = patch.expectedDuration || null;
        return prisma.fieldTask.update({ where: { id }, data });
    },

    // Admin remark — stored on the task; empty string clears it.
    async setRemark(id, remark) {
        return prisma.fieldTask.update({
            where: { id },
            data: { adminRemark: remark?.trim() ? remark : null },
        });
    },

    async remove(id) {
        return prisma.fieldTask.delete({ where: { id } });
    },
};
