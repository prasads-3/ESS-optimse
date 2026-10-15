import prisma from '../../lib/prisma.js';
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

        const policies = await prisma.policy.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                category: true,
                version: true,
                fileSize: true,
                createdAt: true,
                organizationId: true
                // content is excluded for performance
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(policies);
    } catch (error) {
        console.error('Error fetching policies:', error);
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
}

export async function GET_BY_ID(req, res) {
    try {
        const { id } = req.params;
        const policy = await prisma.policy.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!policy) return res.status(404).json({ error: 'Policy not found' });
        
        res.json(policy);
    } catch (error) {
        console.error('Error fetching policy detail:', error);
        res.status(500).json({ error: 'Failed to fetch policy details' });
    }
}

export async function POST(req, res) {
    try {
        const { title, category, version, content } = req.body;
        
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

        // Simulating file size for simplicity
        const fileSize = (Buffer.byteLength(content || '') / (1024 * 1024)).toFixed(1) + " MB";

        const policy = await prisma.policy.create({
            data: {
                title,
                category,
                version,
                content,
                fileSize,
                organizationId: orgId
            }
        });
        res.status(201).json(policy);
    } catch (error) {
        console.error('Error creating policy:', error);
        res.status(500).json({ error: 'Failed to create policy' });
    }
}

export async function DELETE(req, res) {
    try {
        const { id } = req.params;
        const existing = await prisma.policy.findUnique({ where: { id: parseInt(id) } });
        if (!existing) return res.status(404).json({ error: 'Policy not found' });
        if (!checkSameOrg(req, res, existing)) return;
        await prisma.policy.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting policy:', error);
        res.status(500).json({ error: 'Failed to delete policy' });
    }
}
