import { z } from 'zod';

const isoDate = z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date');

export const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    assignedTo: z.string().min(1),
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
    startDate: isoDate,
    endDate: isoDate,
    clientName: z.string().optional(),
    address: z.string().optional(),
    expectedDuration: z.string().optional(),
    radius: z.coerce.number().int().nonnegative().optional(),
});

export const createWeekSchema = z.object({
    weekNumber: z.number().int().positive(),
    startDate: isoDate,
    endDate: isoDate,
});

export const createDailyTaskSchema = z.object({
    dayName: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
});

export const updateDailyTaskSchema = z.object({
    status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
    comment: z.string().optional(),
}).refine(d => d.status || d.comment !== undefined, {
    message: 'Provide status or comment',
});

export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: result.error.flatten().fieldErrors,
        });
    }
    req.body = result.data;
    next();
};
