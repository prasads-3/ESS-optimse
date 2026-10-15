import prisma from '../../lib/prisma.js';
import { sendAnnouncementEmail, logToFile } from '../../lib/email.js';
import { checkFeature } from '../../lib/feature-gate.js';
import { resolveOrgBranding } from '../../lib/org-branding.js';
import { checkSameOrg } from '../../lib/tenant.js';

export async function GET(req, res) {
    try {
        // Feature Gating
        const access = await checkFeature(req, 'announcement');
        if (!access.allowed) {
            return res.status(403).json({ error: 'Feature Restricted', message: access.reason });
        }

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }
        const whereClause = orgId ? { organizationId: orgId } : {};

        const announcements = await prisma.announcement.findMany({
            where: whereClause,
            include: {
                author: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = announcements.map(a => ({
            ...a,
            author: a.author || { name: "System Admin" }
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
}

export async function POST(req, res) {
    try {
        // Feature Gating
        const access = await checkFeature(req, 'announcement');
        if (!access.allowed) {
            return res.status(403).json({ error: 'Feature Restricted', message: access.reason });
        }

        const { title, content, authorId, effectiveDate } = req.body;

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        } else if (req.body.organizationId) {
            // Super-admin can specify orgId in body
            orgId = parseInt(req.body.organizationId);
        }

        if (title === undefined || content === undefined || authorId === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                effectiveDate: effectiveDate || null,
                authorId: parseInt(authorId) === 0 ? null : parseInt(authorId),
                organizationId: orgId
            },
            include: {
                author: {
                    select: { name: true }
                }
            }
        });

        // Broadcast to employees in the background
        (async () => {
            try {
                console.log('Starting announcement broadcast...');
                logToFile(`Announcement broadcast starting | title="${title}" | orgId=${orgId}`);
                let emailList = [];

                // An empty array (specific mode with nobody selected) is truthy,
                // so guard against it falling through as "specific recipients".
                const hasSpecific = Array.isArray(req.body.recipientEmail)
                    ? req.body.recipientEmail.length > 0
                    : Boolean(req.body.recipientEmail);

                if (hasSpecific) {
                    // Handle both single string and array of strings
                    emailList = Array.isArray(req.body.recipientEmail)
                        ? req.body.recipientEmail
                        : [req.body.recipientEmail];
                    console.log(`Targeting specific recipients: ${emailList.join(', ')}`);
                } else {
                    console.log(`Targeting all employees in organization ${orgId}...`);
                    // "All employees" means every employee in the org, delivered
                    // to their corporate email. No role filter — admins were
                    // previously excluded, which left zero recipients in orgs
                    // whose members are all admins, so announcements never sent.
                    const employees = await prisma.employee.findMany({
                        where: { organizationId: orgId },
                        select: { email: true }
                    });
                    emailList = employees.map(emp => emp.email).filter(Boolean);
                    logToFile(`Announcement broadcast resolved ${employees.length} employees, ${emailList.length} with a corporate email in org ${orgId}`);
                }

                // Dedupe (an employee may share office/personal address; specific
                // recipient lists can also contain repeats).
                emailList = Array.from(new Set(emailList.map(e => e.trim().toLowerCase()).filter(Boolean)));

                console.log('Final Recipient List:', emailList.join(', '));

                if (emailList.length > 0) {
                    let orgForEmail = null;
                    if (orgId) {
                        const [orgRow, branding] = await Promise.all([
                            prisma.organization.findUnique({
                                where: { id: orgId },
                                select: { name: true, slug: true }
                            }).catch(() => null),
                            resolveOrgBranding(orgId, req).catch(() => null),
                        ]);
                        if (orgRow) {
                            orgForEmail = { ...orgRow, logo: branding?.logoDataUrl || null };
                        }
                    }
                    await sendAnnouncementEmail(title, content, emailList, effectiveDate, orgForEmail);
                    console.log('Broadcast finished.');
                } else {
                    console.log('No recipients found for broadcast.');
                    logToFile(`Announcement broadcast had NO recipients (orgId=${orgId}). No emails sent.`);
                }
            } catch (emailError) {
                console.error('Email broadcast failed, but announcement was created:', emailError);
            }
        })();

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
}

export async function DELETE(req, res) {
    try {
        const { id } = req.params;
        const existing = await prisma.announcement.findUnique({ where: { id: parseInt(id) } });
        if (!existing) return res.status(404).json({ error: 'Announcement not found' });
        if (!checkSameOrg(req, res, existing)) return;
        await prisma.announcement.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
}
