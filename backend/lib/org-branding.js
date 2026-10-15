import fs from 'fs';
import path from 'path';
import prisma from './prisma.js';

// Resolves an organization's branding (name, address, logo) into a form safe for
// client-side PDF rendering. Logo comes back as a base64 data URL so downstream
// consumers don't deal with CORS, canvas tainting, or async image loading.
//
// Resolution order for the logo:
//   1. Company.logoUrl  — canonical, MinIO-hosted absolute URL (new flow)
//   2. Organization.logo when it's an absolute URL
//   3. Organization.logo when it's a server-relative path (e.g. /uploads/xxx.png):
//        a. read from disk under public/
//        b. fetch via the request's own origin (covers Docker/CWD mismatches)
//   4. bundled public/logo.png as final fallback
//
// Pass `req` so relative paths can be fetched from the server's own origin when
// disk reads fail (e.g. uploads persisted on a volume the container can't see
// from its CWD).
export async function resolveOrgBranding(organizationId, req = null) {
    const out = { name: null, address: null, logoDataUrl: null };
    if (!organizationId) return out;

    const [org, company] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: parseInt(organizationId) },
            select: { name: true, logo: true, address: true, payslipConfig: true }
        }).catch(() => null),
        prisma.company.findUnique({
            where: { organizationId: parseInt(organizationId) },
            select: { logoUrl: true }
        }).catch(() => null),
    ]);

    if (org) {
        out.name = org.name;
        out.address = org.address;
        out.payslipConfig = org.payslipConfig;
    }

    // Data URL already — pass straight through, no fetch or disk read needed.
    if (org?.logo && org.logo.startsWith('data:')) {
        out.logoDataUrl = org.logo;
    }

    const absoluteCandidate = !out.logoDataUrl
        ? (company?.logoUrl || (org?.logo && /^https?:\/\//i.test(org.logo) ? org.logo : null))
        : null;

    if (absoluteCandidate) {
        out.logoDataUrl = await fetchAsDataUrl(absoluteCandidate);
    }

    if (!out.logoDataUrl && org?.logo && !/^https?:\/\//i.test(org.logo) && !org.logo.startsWith('data:')) {
        out.logoDataUrl = readLocalAsDataUrl(org.logo);

        if (!out.logoDataUrl && req) {
            const origin = `${req.protocol}://${req.get('host')}`;
            const normalized = org.logo.startsWith('/') ? org.logo : `/${org.logo}`;
            out.logoDataUrl = await fetchAsDataUrl(`${origin}${normalized}`);
        }
    }

    if (!out.logoDataUrl) {
        console.warn(`[org-branding] No usable logo for organization ${organizationId} (company.logoUrl=${company?.logoUrl ?? 'null'}, org.logo=${org?.logo ?? 'null'}). Falling back to text branding.`);
    }

    return out;
}

async function fetchAsDataUrl(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`[org-branding] Logo fetch ${res.status} for ${url}`);
            return null;
        }
        const contentType = res.headers.get('content-type') || inferMime(url);
        const buf = Buffer.from(await res.arrayBuffer());
        return `data:${contentType};base64,${buf.toString('base64')}`;
    } catch (err) {
        console.warn(`[org-branding] Logo fetch failed for ${url}: ${err.message}`);
        return null;
    }
}

function readLocalAsDataUrl(relPath) {
    try {
        const normalized = relPath.startsWith('/') ? relPath : `/${relPath}`;
        const abs = path.join(process.cwd(), 'public', normalized);
        if (!fs.existsSync(abs)) return null;
        const buf = fs.readFileSync(abs);
        return `data:${inferMime(abs)};base64,${buf.toString('base64')}`;
    } catch (err) {
        console.warn(`[org-branding] Local logo read failed for ${relPath}: ${err.message}`);
        return null;
    }
}

function inferMime(p) {
    const ext = p.split('.').pop()?.toLowerCase().split('?')[0];
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'svg') return 'image/svg+xml';
    if (ext === 'webp') return 'image/webp';
    return 'image/png';
}

