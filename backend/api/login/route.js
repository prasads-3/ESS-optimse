import prisma from '../../lib/prisma.js';
import jwt from 'jsonwebtoken';
import { UAParser } from 'ua-parser-js';
import { reverseGeocode, geocodeIP } from '../../lib/geocoding.js';
import { verifyPassword, hashPassword, isHashed } from '../../lib/password.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

export async function POST(req, res) {
    try {
        const { email, password, location, organizationSlug } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 🟢 HARDCODED SUPER ADMIN BYPASS — only allowed from the /miraki route (no org slug).
        // Reject the super-admin credential on any org-specific login link.
        if (normalizedEmail === "superadmin@mirakilabs.com") {
            if (organizationSlug) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            if (password !== "superadmin123") {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = jwt.sign(
                { id: "super-admin-debug", email: normalizedEmail, role: "super-admin" },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('token', token, {
                httpOnly: true,
                // COOKIE_SECURE overrides: set 'false' to allow login over plain HTTP
                // (no TLS yet). Defaults to isProduction. Set 'true' once HTTPS is up.
                secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000
            });

            return res.json({
                user: {
                    id: "super-admin-debug",
                    name: "Global Super Admin",
                    role: "super-admin",
                    email: normalizedEmail
                },
                isTemporaryPassword: false,
                message: null
            });
        }

        // Employees must log in via their organization's own login link.
        // Without a slug, only the hardcoded super-admin bypass above is allowed.
        let org = null;
        let user = null;

        if (organizationSlug) {
            org = await prisma.organization.findUnique({ where: { slug: organizationSlug } });
            if (!org) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            user = await prisma.employee.findFirst({
                where: {
                    email: { equals: normalizedEmail, mode: 'insensitive' },
                    organizationId: org.id
                }
            });
        } else {
            // GLOBAL LOGIN: Try to find the user by email across all orgs
            const matchingUsers = await prisma.employee.findMany({
                where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
                include: { organization: true }
            });

            if (matchingUsers.length === 0) {
                console.warn(`[LOGIN] No employee found for email="${normalizedEmail}"`);
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            if (matchingUsers.length === 1) {
                user = matchingUsers[0];
                org = user.organization;
            } else {
                // Same email exists in multiple orgs — disambiguate by password match.
                const matchResults = await Promise.all(
                    matchingUsers.map(u => verifyPassword(password, u.password))
                );
                const passwordMatches = matchingUsers.filter((_, i) => matchResults[i]);

                if (passwordMatches.length === 0) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }

                // If the same email+password exists in multiple orgs, log into the
                // most recently created account (single login route for all employees/admins).
                passwordMatches.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                user = passwordMatches[0];
                org = user.organization;
            }
        }

        if (!user) {
            console.warn(`[LOGIN] User not found after lookup. email="${normalizedEmail}" slug="${organizationSlug || '-'}"`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!(await verifyPassword(password, user.password))) {
            console.warn(`[LOGIN] Password mismatch for email="${user.email}" id=${user.id} role=${user.role} orgId=${user.organizationId}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Lazy migration: re-hash legacy plaintext passwords on successful login
        // (backstop for rows the one-time migration script hasn't covered yet).
        if (!isHashed(user.password)) {
            await prisma.employee.update({
                where: { id: user.id },
                data: { password: await hashPassword(password) }
            }).catch(e => console.error('[LOGIN] Password re-hash failed:', e.message));
        }

        // --- TRACKING AND LOGGING (NON-BLOCKING) ---
        // Capture login activity without failing the auth flow if geocoding or DB logs fail.
        setTimeout(async () => {
            try {
                const userAgent = req.headers['user-agent'];
                const parser = new UAParser(userAgent);
                const { device, os, browser } = parser.getResult();

                let deviceType = 'Laptop/Desktop';
                if (device.type === 'mobile') deviceType = 'Mobile';
                else if (device.type === 'tablet') deviceType = 'Tablet';

                const deviceInfo = `${os.name || 'Unknown OS'} - ${browser.name || 'Unknown Browser'}`;
                
                let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
                if (typeof ipAddress === 'string') {
                    ipAddress = ipAddress.split(',')[0].trim();
                }

                const parseCoord = (val) => {
                    if (val === null || val === undefined) return null;
                    const parsed = typeof val === 'string' ? parseFloat(val) : val;
                    return isNaN(parsed) ? null : parsed;
                };

                let lat = parseCoord(location?.latitude);
                let lon = parseCoord(location?.longitude);

                // Fetch location details (Fallback to IP if GPS is not available)
                let city = null;
                let area = null;
                if (lat && lon) {
                    try {
                        const geodata = await reverseGeocode(lat, lon);
                        if (geodata) {
                            city = geodata.city;
                            area = geodata.area;
                        }
                    } catch (geoErr) { console.warn('[LOGIN] Reverse geocode skip:', geoErr.message); }
                } else if (ipAddress) {
                    try {
                        const geodata = await geocodeIP(ipAddress);
                        if (geodata) {
                            lat = geodata.lat;
                            lon = geodata.lon;
                            city = geodata.city;
                            area = geodata.area;
                        }
                    } catch (ipErr) { console.warn('[LOGIN] IP geocode skip:', ipErr.message); }
                }

                // 1. Store Login Log
                await prisma.loginLog.create({
                    data: {
                        userId: user.id,
                        email: user.email,
                        ipAddress: ipAddress,
                        deviceType,
                        deviceInfo,
                        loginLat: lat,
                        loginLong: lon,
                        loginCity: city,
                        loginArea: area,
                    }
                }).catch(e => console.error('[LOGIN] LoginLog create failed:', e.message));

                // 2. Store Tracking Log
                await prisma.trackingLog.create({
                    data: {
                        employeeId: user.id,
                        action: "LOGIN",
                        latitude: lat,
                        longitude: lon,
                        city: city,
                        area: area,
                        deviceInfo: deviceInfo
                    }
                }).catch(e => console.error('[LOGIN] TrackingLog create failed:', e.message));

                // 3. Store a location ping as a normalized EmployeeLocation row
                //    (replaces the deprecated Employee.locationHistory JSON append)
                if (lat !== null && lon !== null) {
                    await prisma.employeeLocation.create({
                        data: {
                            employeeId: user.id,
                            latitude: lat,
                            longitude: lon,
                            city,
                            area,
                            action: "LOGIN",
                            ipAddress,
                            deviceType,
                            deviceInfo
                        }
                    }).catch(e => console.error('[LOGIN] EmployeeLocation create failed:', e.message));
                }

                console.log(`[TRACKING] captured login for ${user.email}. City: ${city}`);
            } catch (trackingError) {
                console.error('[TRACKING] Unexpected tracking failure:', trackingError);
            }
        }, 0); // Execute in next tick to not block login response
        // -----------------------

        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                organizationId: user.organizationId 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            // COOKIE_SECURE overrides: set 'false' to allow login over plain HTTP
            // (no TLS yet). Defaults to isProduction. Set 'true' once HTTPS is up.
            secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        const userWithOrg = await prisma.employee.findUnique({
            where: { id: user.id },
            include: { 
                organization: {
                    include: {
                        subscriptionPlan: true
                    }
                }
            }
        });

        const userResponse = { ...userWithOrg };
        delete userResponse.password;
        
        res.json({ 
            user: userResponse,
            isTemporaryPassword: user.isTemporaryPassword || false,
            message: user.isTemporaryPassword ? 'Please change your temporary password after login' : null
        });
    } catch (error) {
        console.error('[CRITICAL] Login route error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
