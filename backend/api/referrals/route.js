import prisma from '../../lib/prisma.js';

export const GET = async (req, res) => {
    try {
        const { employeeId } = req.query;
        let targetEid = null;
        
        if (employeeId && employeeId.trim() !== '') {
            const parsed = parseInt(employeeId);
            if (!isNaN(parsed)) {
                targetEid = parsed;
            }
        }

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);

            // If regular employee, they can ONLY see their own referrals
            if (req.user.role === 'employee' || req.user.role === 'user') {
                if (!targetEid || targetEid !== parseInt(req.user.id)) {
                    return res.status(403).json({ error: 'Access Denied: You can only view your own referrals' });
                }
            }
        }

        const where = {};
        if (targetEid !== null) {
            where.referrerId = targetEid;
        } else if (orgId) {
            // Fetch referrals for all employees in the organization
            where.referrer = {
                organizationId: orgId
            };
        }

        const referrals = await prisma.referral.findMany({
            where,
            include: {
                referrer: {
                    select: {
                        name: true,
                        role: true,
                        department: true,
                        photo: true,
                        employeeId: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // If specific employee, also return their total points
        let pointsResult = { points: 0, totalEarned: 0, totalUsed: 0 };
        if (targetEid !== null) {
            const p = await prisma.referralPoints.findUnique({
                where: {
                    employeeId: targetEid
                }
            });
            if (p) pointsResult = p;
        }

        res.json({
            referrals,
            points: pointsResult
        });
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referrals' });
    }
};

export const POST = async (req, res) => {
    try {
        const { employeeId, referredName, referredEmail, referredPhone, notes } = req.body;

        if (!employeeId || !referredName || !referredEmail) {
            return res.status(400).json({ error: 'Employee ID, name, and email are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(referredEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check if email already referred
        const existingReferral = await prisma.referral.findFirst({
            where: {
                referredEmail: referredEmail.toLowerCase(),
                referrerId: parseInt(employeeId)
            }
        });

        if (existingReferral) {
            return res.status(400).json({ error: 'You have already referred this person' });
        }

        // Create referral
        const referral = await prisma.referral.create({
            data: {
                referrerId: parseInt(employeeId),
                referredName,
                referredEmail: referredEmail.toLowerCase(),
                referredPhone,
                notes,
                status: 'Pending',
                points: 0
            }
        });

        // Initialize or get referral points for employee
        let referralPoints = await prisma.referralPoints.findUnique({
            where: {
                employeeId: parseInt(employeeId)
            }
        });

        if (!referralPoints) {
            referralPoints = await prisma.referralPoints.create({
                data: {
                    employeeId: parseInt(employeeId),
                    points: 0,
                    totalEarned: 0,
                    totalUsed: 0
                }
            });
        }

        res.status(201).json({
            message: 'Referral submitted successfully',
            referral,
            points: referralPoints
        });
    } catch (error) {
        console.error('Error creating referral:', error);
        res.status(500).json({ error: 'Failed to create referral' });
    }
};
