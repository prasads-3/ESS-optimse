import { fieldTaskService } from './service.js';
import { haversineMeters } from '../../lib/geo.js';
import { emitTaskEvent } from '../../lib/realtime.js';
import { tenantWhere, assertSameOrg } from '../../lib/tenant.js';

const assigneeKey = (user) => String(user?.email || user?.id || '');

const broadcast = (event, task, req) =>
    emitTaskEvent(event, { task }, {
        assignedTo: task?.assignedTo,
        orgId: req.user?.organizationId,
    });

export const fieldTaskController = {
    /* ----------------------------- Admin ----------------------------- */
    async create(req, res, next) {
        try {
            const assignedBy = String(req.user?.email || req.user?.id || 'system');
            const task = await fieldTaskService.create(req.body, assignedBy, req.user?.organizationId);
            res.status(201).json(task);
            broadcast('fieldTask:created', task, req);
        } catch (err) { next(err); }
    },

    async createBatch(req, res, next) {
        try {
            const assignedBy = String(req.user?.email || req.user?.id || 'system');
            const { assignedTo, tasks } = req.body;
            const created = await fieldTaskService.createMany(tasks, assignedTo, assignedBy, req.user?.organizationId);
            res.status(201).json(created);
            // One event is enough — clients refetch on any field-task change.
            emitTaskEvent('fieldTask:created', { count: created.length }, {
                assignedTo,
                orgId: req.user?.organizationId,
            });
        } catch (err) { next(err); }
    },

    async listAll(req, res, next) {
        try {
            res.json(await fieldTaskService.findAll(tenantWhere(req)));
        } catch (err) { next(err); }
    },

    async reassign(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            assertSameOrg(req, task);

            const { assignedTo } = req.body;
            const prevAssignee = task.assignedTo;
            const updated = await fieldTaskService.reassign(id, assignedTo);
            res.json(updated);

            // New assignee + admins.
            broadcast('fieldTask:updated', updated, req);
            // The previous assignee should see it disappear from their list.
            if (prevAssignee && prevAssignee !== assignedTo) {
                emitTaskEvent('fieldTask:updated', { task: updated }, {
                    assignedTo: prevAssignee,
                    orgId: req.user?.organizationId,
                });
            }
        } catch (err) { next(err); }
    },

    async setRemark(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            assertSameOrg(req, task);
            const updated = await fieldTaskService.setRemark(id, req.body.remark);
            res.json(updated);
            broadcast('fieldTask:updated', updated, req);
        } catch (err) { next(err); }
    },

    async adminUpdate(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            assertSameOrg(req, task);
            const updated = await fieldTaskService.adminUpdate(id, req.body);
            res.json(updated);
            broadcast('fieldTask:updated', updated, req);
        } catch (err) { next(err); }
    },

    async remove(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            assertSameOrg(req, task);
            await fieldTaskService.remove(id);
            res.status(204).end();
            broadcast('fieldTask:deleted', task, req);
        } catch (err) { next(err); }
    },

    /* ----------------------------- Employee ----------------------------- */
    async myTasks(req, res, next) {
        try {
            res.json(await fieldTaskService.findByAssignee(assigneeKey(req.user)));
        } catch (err) { next(err); }
    },

    // Full single task (incl. proofImage) — admins see any, employees only their own.
    async getOne(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super-admin';
            if (isAdmin) {
                // Admins may view any task in their own org; super-admin any task.
                assertSameOrg(req, task);
            } else if (task.assignedTo !== assigneeKey(req.user)) {
                return res.status(403).json({ error: 'Not your task' });
            }
            res.json(task);
        } catch (err) { next(err); }
    },

    async checkIn(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            if (task.assignedTo !== assigneeKey(req.user)) {
                return res.status(403).json({ error: 'Not your task' });
            }
            if (task.status === 'Completed') {
                return res.status(400).json({ error: 'Task already completed' });
            }

            const { latitude, longitude } = req.body;
            const distance = Math.round(
                haversineMeters(latitude, longitude, task.latitude, task.longitude)
            );
            if (distance > task.allowedRadius) {
                return res.status(403).json({
                    error: `You are ${distance}m from the task location. You must be within ${task.allowedRadius}m to check in.`,
                    distance,
                    allowedRadius: task.allowedRadius,
                });
            }

            const updated = await fieldTaskService.checkIn(id, latitude, longitude);
            res.json(updated);
            broadcast('fieldTask:updated', updated, req);
        } catch (err) { next(err); }
    },

    async checkOut(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            if (task.assignedTo !== assigneeKey(req.user)) {
                return res.status(403).json({ error: 'Not your task' });
            }
            if (!task.checkInTime) {
                return res.status(400).json({ error: 'Cannot check out before checking in' });
            }

            const { latitude, longitude, auto } = req.body;
            const updated = await fieldTaskService.checkOut(id, latitude, longitude, auto);
            res.json(updated);
            broadcast('fieldTask:updated', updated, req);
        } catch (err) { next(err); }
    },

    async markNotVisited(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            if (task.assignedTo !== assigneeKey(req.user)) {
                return res.status(403).json({ error: 'Not your task' });
            }
            if (task.status === 'Completed') {
                return res.status(400).json({ error: 'Task already completed' });
            }
            const updated = await fieldTaskService.markNotVisited(id, req.body.reason);
            res.json(updated);
            broadcast('fieldTask:updated', updated, req);
        } catch (err) { next(err); }
    },

    async update(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const task = await fieldTaskService.findById(id);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            if (task.assignedTo !== assigneeKey(req.user)) {
                return res.status(403).json({ error: 'Not your task' });
            }
            const updated = await fieldTaskService.update(id, req.body);
            res.json(updated);
            broadcast('fieldTask:updated', updated, req);
        } catch (err) { next(err); }
    },
};
