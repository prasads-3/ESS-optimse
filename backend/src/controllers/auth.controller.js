// Handlers that were previously inline in server.js: public org-branding lookups
// (used by the login pages), the authenticated /auth/me, and /auth/logout with
// its background login-tracking. Logic moved VERBATIM — same queries, same
// response shapes, same fire-after-response setTimeout in logout.
import prisma from '../../lib/prisma.js';

// Public: fetch org branding by slug (used by /org/:slug/login page, no auth).
export async function orgBySlug(req, res) {
    const { slug } = req.params;
    const org = await prisma.organization.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            logo: true,
            slug: true,
            company: { select: { logoUrl: true } },
        },
    });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    // Prefer Company.logoUrl (MinIO-hosted) over Organization.logo.
    const resolvedLogo = org.company?.logoUrl || org.logo || null;
    return res.json({ id: org.id, name: org.name, slug: org.slug, logo: resolvedLogo });
}

// Public: resolve an org's branding by employee/admin email.
export async function orgByEmail(req, res) {
    const raw = (req.query.email || '').toString().trim().toLowerCase();
    if (!raw) return res.status(400).end();
    const employee = await prisma.employee.findFirst({
        where: { email: { equals: raw, mode: 'insensitive' } },
        select: {
            organization: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                    company: { select: { logoUrl: true } },
                },
            },
        },
    });
    const org = employee?.organization;
    if (!org) return res.status(404).end();
    const resolvedLogo = org.company?.logoUrl || org.logo || null;
    return res.json({ id: org.id, name: org.name, slug: org.slug, logo: resolvedLogo });
}

// Public: serve an org's logo as a real image over HTTPS (emails reference this).
export async function orgLogoById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(404).end();
    const org = await prisma.organization.findUnique({ where: { id }, select: { logo: true } });
    const m = org?.logo && /^data:(image\/[a-z0-9+.\-]+);base64,(.+)$/i.exec(org.logo);
    if (!m) return res.status(404).end();
    const [, mime, b64] = m;
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.send(Buffer.from(b64, 'base64'));
}

export async function me(req, res) {
    // Admin bypass removed - Admin user is now validated against the database
    try {
        if (req.user.id === 'super-admin-debug') {
            return res.json({
                user: {
                    id: 'super-admin-debug',
                    name: 'Global Super Admin',
                    role: 'super-admin',
                    email: 'superadmin@mirakilabs.com',
                },
            });
        }

        const user = await prisma.employee.findUnique({
            where: { id: req.user.id },
            include: {
                organization: { include: { subscriptionPlan: true } },
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Is this user a manager? (Does anyone in the org report to them?) Used by
        // the frontend to show the "Approvals" nav item. reportsTo holds the
        // manager's email; match case-insensitively.
        let isManager = false;
        if (user.email && user.organizationId) {
            const reportCount = await prisma.employee.count({
                where: {
                    organizationId: user.organizationId,
                    id: { not: user.id },
                    reportsTo: { equals: user.email, mode: 'insensitive' },
                },
            }).catch(() => 0);
            isManager = reportCount > 0;
        }

        const { password: _, ...userData } = user;
        res.json({ user: { ...userData, isManager } });
    } catch (e) {
        console.error('[AUTH/ME] Error fetching user:', e.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function logout(req, res) {
    // Respond immediately: clear the cookie and let the client navigate away.
    // All tracking work (reverse-geocoding + DB writes) runs in the background
    // so the logout request is never blocked by the slow Nominatim API.
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });

    if (!req.user || req.user.id === 'super-admin-debug') return;

    const user = req.user;
    const location = req.body?.location;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    setTimeout(async () => {
        try {
            const parseCoord = (val) => {
                if (val === null || val === undefined) return null;
                const parsed = typeof val === 'string' ? parseFloat(val) : val;
                return isNaN(parsed) ? null : parsed;
            };

            const lat = parseCoord(location?.latitude);
            const lon = parseCoord(location?.longitude);

            // 1. Find the latest active session for this user to update it
            const activeSession = await prisma.loginLog.findFirst({
                where: { userId: user.id, logoutTime: null },
                orderBy: { loginTime: 'desc' },
            });

            if (activeSession) {
                let city = null;
                let area = null;

                if (lat && lon) {
                    try {
                        const { reverseGeocode } = await import('../../lib/geocoding.js');
                        const geodata = await reverseGeocode(lat, lon);
                        if (geodata) {
                            city = geodata.city;
                            area = geodata.area;
                        }
                    } catch (geoErr) {
                        console.error('[TRACKING] Logout geocoding failed:', geoErr);
                    }
                }

                await prisma.loginLog.update({
                    where: { id: activeSession.id },
                    data: {
                        logoutLat: lat,
                        logoutLong: lon,
                        logoutCity: city,
                        logoutArea: area,
                        logoutTime: new Date(),
                    },
                }).catch((err) => console.error('[TRACKING] Logout update failed:', err));
            } else {
                console.warn(`[TRACKING] No active session found to logout for user ${user.id}`);
            }

            // 2. Store a location ping as a normalized EmployeeLocation row
            //    (replaces the deprecated Employee.locationHistory JSON append)
            if (lat !== null && lon !== null) {
                await prisma.employeeLocation.create({
                    data: {
                        employeeId: user.id,
                        latitude: lat,
                        longitude: lon,
                        action: 'LOGOUT',
                        ipAddress,
                        deviceType: 'Logout',
                        deviceInfo: 'User logged out',
                    },
                }).catch((err) => console.error('[TRACKING] EmployeeLocation create failed:', err));
            }
        } catch (e) {
            console.error('Logout tracking error:', e);
        }
    }, 0); // run after the response is sent, like the login tracking does
}
