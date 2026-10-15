import { taskService } from '../services/task.service.js';
import { weekService } from '../services/week.service.js';
import { dailyService } from '../services/daily.service.js';
import { emitTaskEvent } from '../../../lib/realtime.js';

const assigneeKey = (user) => String(user?.email || user?.id || '');

export const employeeController = {
    async myTasks(req, res, next) {
        try {
            const tasks = await taskService.findByAssignee(assigneeKey(req.user));
            res.json(tasks);
        } catch (err) { next(err); }
    },

    async updateDaily(req, res, next) {
        try {
            const dailyId = parseInt(req.params.dailyId, 10);
            const updated = await dailyService.update(dailyId, req.body);

            // Cascade progress: week → task
            const week = await weekService.recalcProgress(updated.weekId);
            if (week) await taskService.recalcProgress(week.taskId);

            res.json(updated);

            // Broadcast the updated task so both admin and the assignee refresh
            const fullTask = week
                ? await taskService.findById(week.taskId)
                : null;
            emitTaskEvent(
                'task:dailyUpdated',
                {
                    dailyId,
                    daily: updated,
                    weekId: updated.weekId,
                    taskId: fullTask?.id,
                    task: fullTask,
                },
                {
                    assignedTo: fullTask?.assignedTo,
                    orgId: req.user?.organizationId,
                }
            );
        } catch (err) { next(err); }
    },

    async weeklyProgress(req, res, next) {
        try {
            const taskId = parseInt(req.params.taskId, 10);
            const weeks = await weekService.findByTask(taskId);
            res.json(weeks.map(w => ({
                id: w.id,
                weekNumber: w.weekNumber,
                progress: w.progress,
                status: w.status,
                startDate: w.startDate,
                endDate: w.endDate,
                totalDays: w.dailyTasks.length,
                completedDays: w.dailyTasks.filter(d => d.status === 'Completed').length,
            })));
        } catch (err) { next(err); }
    },
};
