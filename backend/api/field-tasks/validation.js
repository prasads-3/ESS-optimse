import { z } from 'zod';

const isoDate = z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date');
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

export const createFieldTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    assignedTo: z.string().min(1),
    clientName: z.string().optional(),
    address: z.string().optional(),
    latitude: lat,
    longitude: lng,
    allowedRadius: z.coerce.number().int().positive().max(100000).optional(),
    date: isoDate,
    expectedDuration: z.string().optional(),
});

// Weekly assign: a shared employee plus a distinct task per day.
const fieldTaskDaySchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    clientName: z.string().optional(),
    address: z.string().optional(),
    latitude: lat,
    longitude: lng,
    allowedRadius: z.coerce.number().int().positive().max(100000).optional(),
    date: isoDate,
    expectedDuration: z.string().optional(),
});

export const createFieldTaskBatchSchema = z.object({
    assignedTo: z.string().min(1),
    tasks: z.array(fieldTaskDaySchema).min(1).max(200),
});

export const checkInSchema = z.object({
    latitude: lat,
    longitude: lng,
});

export const checkOutSchema = z.object({
    latitude: lat.optional(),
    longitude: lng.optional(),
    auto: z.boolean().optional(),
});

// Employee marks a visit as not done, with a reason.
export const notVisitedSchema = z.object({
    reason: z.string().min(1).max(2000),
});

export const updateFieldTaskSchema = z.object({
    notes: z.string().optional(),
    proofImage: z.string().optional(),
}).refine(d => d.notes !== undefined || d.proofImage !== undefined, {
    message: 'Provide notes or proofImage',
});

// Admin edits a task's details. All fields optional; at least one required.
// Nullable text fields accept an empty string to clear them.
export const adminUpdateFieldTaskSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    clientName: z.string().optional(),
    address: z.string().optional(),
    latitude: lat.optional(),
    longitude: lng.optional(),
    allowedRadius: z.coerce.number().int().positive().max(100000).optional(),
    date: isoDate.optional(),
    expectedDuration: z.string().optional(),
}).refine(d => Object.keys(d).length > 0, {
    message: 'Provide at least one field to update',
});

// Admin reassigns a task to a different employee.
export const reassignFieldTaskSchema = z.object({
    assignedTo: z.string().min(1),
});

// Admin sets/clears a remark on a task (empty string clears it).
export const remarkFieldTaskSchema = z.object({
    remark: z.string().max(2000),
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
