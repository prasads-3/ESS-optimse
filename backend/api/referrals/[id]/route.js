import prisma from '../../../lib/prisma.js';
import { checkSameOrg } from '../../../lib/tenant.js';

export const PATCH = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const referral = await prisma.referral.findUnique({
            where: { id: parseInt(id) },
            include: { referrer: { select: { organizationId: true } } }
        });

        if (!referral) {
            return res.status(404).json({ error: 'Referral not found' });
        }

        if (!checkSameOrg(req, res, referral, { via: 'referrer' })) return;

        const updateData = {};
        if (status) updateData.status = status;
        if (typeof notes === 'string') updateData.notes = notes;

        let pointsToAward = 0;

        // Award 250 points only when status becomes 'Hired'
        if (status === 'Hired' && referral.status !== 'Hired') {
            pointsToAward = 250;
        }

        if (pointsToAward > 0) {
            updateData.points = { increment: pointsToAward };

            // Update employee's referral points
            await prisma.referralPoints.upsert({
                where: { employeeId: referral.referrerId },
                update: {
                    points: { increment: pointsToAward },
                    totalEarned: { increment: pointsToAward }
                },
                create: {
                    employeeId: referral.referrerId,
                    points: pointsToAward,
                    totalEarned: pointsToAward,
                    totalUsed: 0
                }
            });
        }

        const updatedReferral = await prisma.referral.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json({ message: 'Referral updated successfully', referral: updatedReferral });
    } catch (error) {
        console.error('Error updating referral:', error);
        res.status(500).json({ error: 'Failed to update referral' });
    }
};

export const DELETE = async (req, res) => {
    try {
        const { id } = req.params;

        const referral = await prisma.referral.findUnique({
            where: { id: parseInt(id) },
            include: { referrer: { select: { organizationId: true } } }
        });
        if (!referral) return res.status(404).json({ error: 'Referral not found' });
        if (!checkSameOrg(req, res, referral, { via: 'referrer' })) return;

        await prisma.referral.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Referral deleted successfully' });
    } catch (error) {
        console.error('Error deleting referral:', error);
        res.status(500).json({ error: 'Failed to delete referral' });
    }
};
