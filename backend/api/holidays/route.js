import prisma from '../../lib/prisma.js';
import { sendHolidayEmail, sendHolidayCancellationEmail } from '../../lib/email.js';
import { checkSameOrg } from '../../lib/tenant.js';

export async function GET(req, res) {
    try {
        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }
        const whereClause = orgId ? { organizationId: orgId } : {};

        const holidays = await prisma.holiday.findMany({
            where: whereClause,
            orderBy: { date: 'asc' }
        });
        res.json(holidays);
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
}

export async function POST(req, res) {
    try {
        const { name, date, type, location } = req.body;

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        } else if (req.body.organizationId) {
            orgId = parseInt(req.body.organizationId);
        }
        const holidayDate = new Date(date);

        // 1. Check if a holiday already exists on this date with the same name in this org
        const existingHoliday = await prisma.holiday.findFirst({
            where: {
                organizationId: orgId,
                date: holidayDate,
                name: name
            }
        });

        if (existingHoliday) {
            return res.status(400).json({ error: 'Holiday already exists on this date' });
        }

        const holiday = await prisma.holiday.create({
            data: {
                name,
                date: holidayDate,
                type,
                location,
                organizationId: orgId
            }
        });

        // ---------------------------------------------------------
        // BACKGROUND BROADCAST (Don't await to speed up response)
        // ---------------------------------------------------------
        (async () => {
            try {
                console.log(`Background fetching employees for organization ${orgId} holiday broadcast...`);
                const employees = await prisma.employee.findMany({
                    where: { organizationId: orgId },
                    select: { email: true, personalEmail: true }
                });

                const emailList = employees.map(emp => emp.email || emp.personalEmail).filter(Boolean);

                if (emailList.length > 0) {
                    const orgForEmail = orgId
                        ? await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, logo: true } }).catch(() => null)
                        : null;
                    await sendHolidayEmail(emailList, name, date, orgForEmail);
                    console.log('Background holiday broadcast complete.');
                }
            } catch (emailError) {
                console.error('Background holiday broadcast failed:', emailError);
            }
        })();

        res.status(201).json(holiday);
    } catch (error) {
        console.error('Error creating holiday:', error);
        res.status(500).json({ error: 'Failed to create holiday' });
    }
}

export async function DELETE(req, res) {
    try {
        const { id } = req.params;
        console.log(`DELETE /api/holidays request received for ID: ${id}`);

        if (!id) {
            console.error('DELETE /api/holidays: No ID provided in params');
            return res.status(400).json({ error: 'ID is required' });
        }

        const holidayId = parseInt(id);
        console.log(`Parsed Holiday ID: ${holidayId}`);

        // Fetch holiday details before deletion
        const holiday = await prisma.holiday.findUnique({
            where: { id: holidayId }
        });

        if (!holiday) {
            console.warn(`DELETE /api/holidays: Holiday with ID ${holidayId} not found`);
            return res.status(404).json({ error: 'Holiday not found' });
        }

        if (!checkSameOrg(req, res, holiday)) return;

        console.log(`Deleting holiday: ${holiday.name} (${holiday.date})`);

        await prisma.holiday.delete({
            where: { id: holidayId }
        });

        console.log('Holiday deleted from database successfully');

        // ---------------------------------------------------------
        // BACKGROUND BROADCAST (Don't await to speed up response)
        // ---------------------------------------------------------
        (async () => {
            try {
                console.log(`Background fetching employees for organization ${holiday.organizationId} holiday cancellation broadcast...`);
                const employees = await prisma.employee.findMany({
                    where: { organizationId: holiday.organizationId },
                    select: { email: true, personalEmail: true }
                });

                const emailList = employees.map(emp => emp.email || emp.personalEmail).filter(Boolean);

                if (emailList.length > 0) {
                    const orgForEmail = holiday.organizationId
                        ? await prisma.organization.findUnique({ where: { id: holiday.organizationId }, select: { id: true, name: true, logo: true } }).catch(() => null)
                        : null;
                    await sendHolidayCancellationEmail(emailList, holiday.name, holiday.date, orgForEmail);
                    console.log('Background cancellation broadcast complete.');
                }
            } catch (emailError) {
                console.error('Background holiday cancellation broadcast failed:', emailError);
            }
        })();

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting holiday:', error);
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
}
