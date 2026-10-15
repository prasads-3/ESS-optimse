import prisma from '../../lib/prisma.js';

export async function GET(req, res) {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            where: {
                name: {
                    in: ['Basic', 'Medium', 'Prime', 'basic', 'medium', 'prime']
                }
            },
            orderBy: { price: 'asc' }
        });
        res.status(200).json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
}
