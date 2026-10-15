import prisma from '../../lib/prisma.js';
import { uploadObject } from '../../lib/minio.js';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg']);

function resolveOrganizationId(req) {
    if (req.user?.organizationId) return parseInt(req.user.organizationId);
    if (req.body?.organizationId) return parseInt(req.body.organizationId);
    return null;
}

export async function GET(req, res) {
    try {
        const organizationId = resolveOrganizationId(req);
        if (!organizationId && req.user?.role !== 'super-admin') {
            return res.status(400).json({ error: 'organizationId required' });
        }
        const company = organizationId
            ? await prisma.company.findUnique({ where: { organizationId } })
            : await prisma.company.findFirst();
        if (!company) return res.status(404).json({ error: 'Company not found' });
        return res.json(company);
    } catch (error) {
        console.error('[Company GET]', error);
        return res.status(500).json({ error: 'Failed to fetch company' });
    }
}

export async function PUT(req, res) {
    try {
        const organizationId = resolveOrganizationId(req);
        const { name } = req.body;
        if (!name || !organizationId) {
            return res.status(400).json({ error: 'name and organizationId are required' });
        }
        const company = await prisma.company.upsert({
            where: { organizationId },
            update: { name },
            create: { name, organizationId },
        });
        return res.json(company);
    } catch (error) {
        console.error('[Company PUT]', error);
        return res.status(500).json({ error: 'Failed to save company' });
    }
}

export async function UPLOAD_LOGO(req, res) {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        if (!ALLOWED_MIME.has(file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only PNG or JPG allowed.' });
        }

        const organizationId = resolveOrganizationId(req);
        if (!organizationId) {
            return res.status(400).json({ error: 'organizationId required' });
        }

        const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
        const objectKey = `company/${organizationId}/logo.${ext}`;

        const publicUrl = await uploadObject({
            objectKey,
            buffer: file.buffer,
            contentType: file.mimetype,
        });

        const existing = await prisma.company.findUnique({ where: { organizationId } });
        const company = await prisma.company.upsert({
            where: { organizationId },
            update: { logoUrl: publicUrl },
            create: {
                name: existing?.name || req.body?.name || 'Company',
                logoUrl: publicUrl,
                organizationId,
            },
        });

        return res.status(200).json({ url: publicUrl, company });
    } catch (error) {
        console.error('[Company UPLOAD_LOGO]', error);
        return res.status(500).json({ error: 'Failed to upload logo', details: error.message });
    }
}
