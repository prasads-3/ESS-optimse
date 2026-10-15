import prisma from '../../../lib/prisma.js';

export async function GET(req, res) {
    if (!req.user || req.user.role !== 'super-admin') {
        return res.status(403).json({ error: 'Access Denied: Super Admin only' });
    }
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { price: 'asc' }
        });
        res.json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
}

export async function POST(req, res) {
    if (!req.user || req.user.role !== 'super-admin') {
        return res.status(403).json({ error: 'Access Denied: Super Admin only' });
    }
    try {
        const { name, price, userLimit, features, color } = req.body;
        
        if (!name || price === undefined || !userLimit) {
            return res.status(400).json({ error: 'Name, price, and user limit are required' });
        }

        const plan = await prisma.subscriptionPlan.create({
            data: {
                name,
                price: parseFloat(price),
                userLimit: parseInt(userLimit),
                features: features || [],
                color: color || 'blue'
            }
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Error creating plan:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Plan name already exists' });
        }
        res.status(500).json({ error: 'Failed to create plan' });
    }
}

export async function PATCH(req, res) {
    if (!req.user || req.user.role !== 'super-admin') {
        return res.status(403).json({ error: 'Access Denied: Super Admin only' });
    }
    try {
        const { id } = req.params;
        const updateData = req.body;

        const plan = await prisma.subscriptionPlan.update({
            where: { id: parseInt(id) },
            data: {
                ...updateData,
                price: updateData.price ? parseFloat(updateData.price) : undefined,
                userLimit: updateData.userLimit ? parseInt(updateData.userLimit) : undefined,
            }
        });

        // Sync changes to all organizations using this plan
        await prisma.organization.updateMany({
            where: { planId: plan.id },
            data: {
                limit: plan.userLimit,
                plan: plan.name
            }
        });

        res.json(plan);
    } catch (error) {
        console.error('Error updating plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
}

export async function DELETE(req, res) {
    if (!req.user || req.user.role !== 'super-admin') {
        return res.status(403).json({ error: 'Access Denied: Super Admin only' });
    }
    try {
        const { id } = req.params;
        await prisma.subscriptionPlan.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting plan:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
}
