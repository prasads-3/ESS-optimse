import { taskService } from '../services/task.service.js';
import { weekService } from '../services/week.service.js';
import { dailyService } from '../services/daily.service.js';
import { emitTaskEvent } from '../../../lib/realtime.js';
import { orgEmployeeEmails } from '../../../lib/tenant.js';

// Task has no organizationId; gate single-row ops by checking the task's
// assignee email belongs to the caller's org (no-op for super-admin).
async function assertTaskInOrg(req, assignedTo) {
    const emails = await orgEmployeeEmails(req);
    if (emails === null) return; // super-admin
    if (!assignedTo || !emails.includes(assignedTo)) {
        throw Object.assign(
            new Error('Forbidden: resource belongs to another organization'),
            { status: 403 },
        );
    }
}

export const adminController = {
    async createTask(req, res, next) {
        try {
            const assignedBy = String(req.user?.email || req.user?.id || 'system');
            const task = await taskService.create(req.body, assignedBy);
            res.status(201).json(task);
            emitTaskEvent('task:created', { task }, {
                assignedTo: task.assignedTo,
                orgId: req.user?.organizationId,
            });
        } catch (err) { next(err); }
    },

    async addWeek(req, res, next) {
        try {
            const taskId = parseInt(req.params.taskId, 10);
            const parent = await taskService.findById(taskId);
            if (!parent) return res.status(404).json({ error: 'Task not found' });
            await assertTaskInOrg(req, parent.assignedTo);
            const week = await weekService.create(taskId, req.body);
            res.status(201).json(week);
            const task = await taskService.findById(taskId);
            emitTaskEvent('task:weekAdded', { taskId, week, task }, {
                assignedTo: task?.assignedTo,
                orgId: req.user?.organizationId,
            });
        } catch (err) { next(err); }
    },

    async addDailyTask(req, res, next) {
        try {
            const weekId = parseInt(req.params.weekId, 10);
            const parentWeek = await weekService.findById(weekId);
            if (!parentWeek) return res.status(404).json({ error: 'Week not found' });
            await assertTaskInOrg(req, parentWeek.task?.assignedTo);
            const daily = await dailyService.create(weekId, req.body);
            res.status(201).json(daily);
            const week = await weekService.findById(weekId);
            emitTaskEvent('task:dailyAdded', { weekId, daily, taskId: week?.taskId }, {
                assignedTo: week?.task?.assignedTo,
                orgId: req.user?.organizationId,
            });
        } catch (err) { next(err); }
    },

    async deleteTask(req, res, next) {
        try {
            const taskId = parseInt(req.params.taskId, 10);
            const task = await taskService.findById(taskId);
            if (!task) return res.status(404).json({ error: 'Task not found' });
            await assertTaskInOrg(req, task.assignedTo);
            await taskService.remove(taskId);
            res.status(204).end();
            emitTaskEvent('task:deleted', { taskId }, {
                assignedTo: task?.assignedTo,
                orgId: req.user?.organizationId,
            });
        } catch (err) { next(err); }
    },

    async listAll(req, res, next) {
        try {
            const emails = await orgEmployeeEmails(req); // null => super-admin => all
            const tasks = await taskService.findAll(emails);
            res.json(tasks);
        } catch (err) { next(err); }
    },
};
