import prisma from '../../../lib/prisma.js';
import { reverseGeocode, geocodeIP } from '../../../lib/geocoding.js';

export async function POST(req, res) {
    try {
        console.log('[MARK] req.user:', JSON.stringify({ id: req.user?.id, role: req.user?.role, organizationId: req.user?.organizationId }));

        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const body = req.body;
        console.log('[MARK] Received request with body:', JSON.stringify(body));
        const { userId, shift, location, remarks } = body;
        let { latitude, longitude } = body;

        // Convert and validate userId
        const parsedUserId = parseInt(userId);
        if (!userId || isNaN(parsedUserId)) {
            console.warn('[MARK] Invalid or missing userId:', userId);
            return res.status(400).json({ error: 'A valid numeric User ID is required' });
        }

        // Special check for super-admin-debug ID which isn't in the Employee table
        if (userId === "super-admin-debug") {
            return res.json({ message: 'Attendance marked successfully (Super Admin Mode - No DB log created)' });
        }

        const now = new Date();

        // --- Attendance Time Restriction (Increased for flexibility) ---
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Allow super-admin to bypass or just increase limit to end of day (23:59)
        if (req.user?.role !== 'super-admin' && (hours > 23 || (hours === 23 && minutes > 59))) {
            return res.status(403).json({ error: 'Time is already finished for marking attendance for today' });
        }
        // ------------------------------------------------

        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // Check if user already manually marked attendance today (only block Manual Form entries)
        console.log(`[MARK] Checking existing logs for userId ${userId} between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);
        const existingLog = await prisma.loginLog.findFirst({
            where: {
                userId: parsedUserId,
                deviceType: 'Manual Form',
                loginTime: {
                    gte: todayStart,
                    lte: todayEnd
                }
            }
        });

        if (existingLog) {
            console.warn(`[MARK] Duplicate attendance attempt for userId ${userId} today`);
            return res.status(400).json({ error: 'Attendance already marked for today' });
        }

        // Handle geocoding in the background to avoid blocking the response
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        const newLog = await prisma.loginLog.create({
            data: {
                userId: parsedUserId,
                ipAddress,
                deviceType: 'Manual Form',
                deviceInfo: JSON.stringify({ shift, location, remarks }),
                loginLat: latitude != null ? Number(latitude) : null,
                loginLong: longitude != null ? Number(longitude) : null,
                loginTime: now,
            }
        });

        // Return immediate success
        res.json({ message: 'Attendance marked successfully', log: newLog });

        // Perform potentially slow operations in background
        (async () => {
            try {
                let finalCity = null;
                let finalArea = null;
                let finalLat = latitude;
                let finalLong = longitude;

                if (latitude && longitude) {
                    const geodata = await reverseGeocode(latitude, longitude);
                    if (geodata) {
                        finalCity = geodata.city;
                        finalArea = geodata.area;
                    }
                } else {
                    const geodata = await geocodeIP(ipAddress);
                    if (geodata) {
                        finalLat = geodata.lat;
                        finalLong = geodata.lon;
                        finalCity = geodata.city;
                        finalArea = geodata.area;
                    }
                }

                // Update the log with geocoded info if found
                if (finalCity || finalArea) {
                    await prisma.loginLog.update({
                        where: { id: newLog.id },
                        data: {
                            loginCity: finalCity,
                            loginArea: finalArea,
                            loginLat: finalLat,
                            loginLong: finalLong,
                            deviceInfo: JSON.stringify({ 
                                shift, 
                                location, 
                                remarks, 
                                city: finalCity, 
                                area: finalArea 
                            })
                        }
                    });

                    // Also update tracking log
                    await prisma.trackingLog.create({
                        data: {
                            employeeId: parsedUserId,
                            action: 'MANUAL_ATTENDANCE_GEO',
                            timestamp: now,
                            latitude: finalLat,
                            longitude: finalLong,
                            city: finalCity,
                            area: finalArea,
                            deviceInfo: `Shift: ${shift}, Loc: ${location} (BG Updated)`
                        }
                    });
                }
            } catch (bgError) {
                console.error('[MARK] Background geocoding failed:', bgError);
            }
        })();

    } catch (error) {
        console.error('Error marking manual attendance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
