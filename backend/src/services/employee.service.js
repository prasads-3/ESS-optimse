// Employee business logic + persistence. All Prisma queries and business rules
// were moved VERBATIM from api/employees/route.js — org-isolation, license-limit
// enforcement, temp-password generation, organization.used recount, referral
// auto-credit, and welcome/password-reset emails. Nothing here touches req/res:
// every method returns a plain { status, body } envelope, and side effects that
// must run AFTER the HTTP response (fire-and-forget emails) are returned as an
// `afterResponse` thunk the controller invokes post-send.
import prisma from '../../lib/prisma.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../lib/email.js';
import { resolveOrgBranding } from '../../lib/org-branding.js';
import { hashPassword } from '../../lib/password.js';
import { persistDataUrl, persistDataUrlAt, removeObjectByUrl, objectKeyFromUrl, extFromContentType } from '../../lib/minio.js';

// List view: omit heavy base64 blobs (documents + cheque) and sensitive fields.
const LIST_SELECT = {
    id: true, organizationId: true, name: true, title: true,
    department: true, team: true, employmentType: true, status: true,
    joiningDate: true, location: true, email: true, phone: true,
    emergencyContactName: true, emergencyPhone: true, reportsTo: true,
    photo: true, createdAt: true, updatedAt: true, linkedin: true,
    role: true, dob: true, hobbies: true, marriedStatus: true,
    employeeId: true, personalEmail: true, expenseLimit: true,
    asset: true, certification: true, reportsToName: true,
    bankAccount: true, ifsc: true, bankName: true, bankBranch: true, bankBranchLocation: true,
    organization: { select: { id: true, name: true, slug: true, logo: true } },
};

const stripSensitive = (employee) => {
    const data = { ...employee };
    delete data.password;
    delete data.isTemporaryPassword;
    delete data.resetToken;
    delete data.resetTokenExpiry;
    return data;
};

// Resolve org row + branding for an email's logo. Mirrors the original inline
// logic; `req` is used only by resolveOrgBranding for server-origin URL fallback.
async function buildOrgForEmail(organizationId, req) {
    if (!organizationId) return null;
    const [orgRow, branding] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, name: true, slug: true },
        }).catch(() => null),
        resolveOrgBranding(organizationId, req).catch(() => null),
    ]);
    if (!orgRow) return null;
    return { ...orgRow, logo: branding?.logoDataUrl || null };
}

export async function list(user) {
    try {
        const whereClause = { role: { not: 'admin' } };

        // Strict organization isolation
        if (user && user.role !== 'super-admin') {
            if (!user.organizationId) {
                return { status: 401, body: { error: 'Unauthorized: No organization associated with your account' } };
            }
            whereClause.organizationId = parseInt(user.organizationId);
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            select: LIST_SELECT,
            orderBy: { createdAt: 'desc' },
        });
        return { status: 200, body: employees };
    } catch (error) {
        console.error('[GET /api/employees] Error:', error);
        return {
            status: 500,
            body: {
                error: 'Failed to fetch employees',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
        };
    }
}

export async function getById(id, user) {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(id) },
        });

        if (!employee) {
            return { status: 404, body: { error: 'Employee not found' } };
        }

        // Security check: Only super-admin can see employees from other orgs
        if (user && user.role !== 'super-admin') {
            if (employee.organizationId !== parseInt(user.organizationId)) {
                return { status: 403, body: { error: 'Access Denied: You do not have permission to view this employee' } };
            }
        }

        return { status: 200, body: stripSensitive(employee) };
    } catch (error) {
        console.error('[GET /api/employees/:id] Error:', error);
        return {
            status: 500,
            body: {
                error: 'Failed to fetch employees',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
        };
    }
}

export async function create(body, user, req) {
    try {
        const { employeeId, ...employeeData } = body;

        // Force organizationId from authenticated user for admins so every
        // employee inherits the admin's org. Super-admin may pass it explicitly.
        if (user && user.role === 'admin') {
            employeeData.organizationId = user.organizationId;
        }

        if (employeeData.organizationId) {
            employeeData.organizationId = parseInt(employeeData.organizationId);
        }

        // Canonicalize email so login lookups match deterministically.
        if (typeof employeeData.email === 'string') {
            employeeData.email = employeeData.email.trim().toLowerCase();
        }
        if (typeof employeeData.personalEmail === 'string') {
            employeeData.personalEmail = employeeData.personalEmail.trim().toLowerCase();
        }

        console.log('[DEBUG] Creating employee with data:', { employeeId, ...employeeData });

        const requiredFields = {
            'Employee ID': employeeId,
            'Full Name': employeeData.name,
            'Job Title': employeeData.title,
            'Office Email': employeeData.email,
        };

        for (const [label, value] of Object.entries(requiredFields)) {
            if (!value || value.toString().trim() === '') {
                return { status: 400, body: { error: 'Validation Error', message: `${label} is a required field.` } };
            }
        }

        // Check organization license limit
        if (employeeData.organizationId) {
            const org = await prisma.organization.findUnique({
                where: { id: employeeData.organizationId },
                select: { limit: true, name: true, used: true },
            });

            if (!org) {
                console.warn(`[POST /api/employees] Organization ${employeeData.organizationId} not found`);
                return { status: 400, body: { error: 'Organization not found' } };
            }

            const actualCount = await prisma.employee.count({
                where: { organizationId: employeeData.organizationId, role: { not: 'admin' } },
            });

            console.log(`[POST /api/employees] Limit Check for ${org.name}: Used ${actualCount} / Limit ${org.limit}`);

            if (actualCount >= org.limit) {
                return {
                    status: 403,
                    body: {
                        error: 'Limit Reached',
                        message: `License limit reached for ${org.name}. (Limit: ${org.limit}, Current: ${actualCount}). Please upgrade your plan in the Super Admin portal.`,
                    },
                };
            }
        }

        // Convert date strings to Date objects if provided and not empty
        if (employeeData.joiningDate && employeeData.joiningDate !== '') {
            employeeData.joiningDate = new Date(employeeData.joiningDate);
        } else {
            delete employeeData.joiningDate;
        }

        if (employeeData.dob && employeeData.dob !== '') {
            employeeData.dob = new Date(employeeData.dob);
        } else {
            delete employeeData.dob;
        }

        // Generate a temporary password if none provided
        if (!employeeData.password) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let tempPassword = '';
            for (let i = 0; i < 8; i++) {
                tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            employeeData.password = tempPassword;
            employeeData.isTemporaryPassword = true;
        }

        if (!employeeData.status) {
            employeeData.status = 'Active';
        }

        // Keep the plaintext only for the welcome email; store the bcrypt hash.
        const plainPassword = employeeData.password;
        employeeData.password = await hashPassword(plainPassword);

        // Push the profile photo to MinIO and store its URL (instead of base64).
        if (employeeData.photo) {
            employeeData.photo = await persistDataUrl(employeeData.photo, {
                folder: `employee-photos/org-${employeeData.organizationId ?? 'none'}`,
                docType: 'photo',
            });
        }

        const employee = await prisma.employee.create({
            data: { employeeId, ...employeeData },
        });

        // Increment organization used count if assigned (counting only non-admin employees)
        if (employeeData.organizationId) {
            const actualCount = await prisma.employee.count({
                where: { organizationId: employeeData.organizationId, role: { not: 'admin' } },
            });

            await prisma.organization.update({
                where: { id: employeeData.organizationId },
                data: { used: actualCount },
            });
        }

        // Automation: Check for matching referral by personalEmail > email > (name + phone)
        try {
            const normalizedName = employee.name?.trim().toLowerCase();
            const normalizedPhone = employee.phone?.trim().replace(/\D/g, ''); // digits only

            const orConditions = [];

            if (employee.personalEmail) {
                orConditions.push({ referredEmail: employee.personalEmail.toLowerCase() });
            }
            orConditions.push({ referredEmail: employee.email.toLowerCase() });

            if (normalizedName && normalizedPhone) {
                orConditions.push({
                    referredName: { equals: normalizedName, mode: 'insensitive' },
                    referredPhone: { contains: normalizedPhone },
                });
            }

            const matchedReferrals = await prisma.referral.findMany({
                where: { OR: orConditions, status: { not: 'Hired' } },
            });

            const seen = new Set();
            for (const referral of matchedReferrals) {
                if (seen.has(referral.id)) continue;
                seen.add(referral.id);

                await prisma.referral.update({
                    where: { id: referral.id },
                    data: { status: 'Completed', points: { increment: 250 } },
                });

                await prisma.referralPoints.upsert({
                    where: { employeeId: referral.referrerId },
                    update: { points: { increment: 250 }, totalEarned: { increment: 250 } },
                    create: { employeeId: referral.referrerId, points: 250, totalEarned: 250, totalUsed: 0 },
                });

                console.log(`[Referral] Awarded 250 pts to employee ${referral.referrerId} for hiring ${employee.name}`);
            }
        } catch (referralError) {
            console.error('Error processing automated referral points:', referralError);
        }

        // Fire-and-forget welcome email — runs AFTER the response is sent.
        const afterResponse = async () => {
            const orgForEmail = await buildOrgForEmail(employeeData.organizationId, req).catch(() => null);
            sendWelcomeEmail({
                name: employee.name,
                email: employee.email,
                personalEmail: employee.personalEmail,
                password: plainPassword,
                org: orgForEmail,
            })
                .then(() => console.log(`[Welcome Email] Sent to ${employee.email}`))
                .catch((emailError) => console.error('[Welcome Email] Failed to send:', emailError.message));
        };

        return { status: 201, body: stripSensitive(employee), afterResponse };
    } catch (error) {
        console.error('[CRITICAL] Error creating employee:', error);

        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            console.log(`[POST /api/employees] Conflict detected on fields: ${target.join(', ')}`);

            if (target.includes('email')) {
                return { status: 400, body: { error: 'Conflict', message: 'An employee with this Office Email already exists in this organization.' } };
            }
            if (target.includes('employeeId')) {
                return { status: 400, body: { error: 'Conflict', message: `Employee ID "${body?.employeeId}" is already assigned in this organization.` } };
            }
            return { status: 400, body: { error: 'Conflict', message: `An employee with these unique details already exists (${target.join(', ')}).` } };
        }

        return { status: 500, body: { error: 'Internal Server Error', details: error.message } };
    }
}

export async function update(id, body, req) {
    try {
        const { employeeId, ...updateData } = body;
        console.log(`[DEBUG] PUT /api/employees/${id} request body:`, JSON.stringify(body, null, 2));

        // Remove sensitive fields that shouldn't be updated through this endpoint.
        // password and isTemporaryPassword are allowed for reset functionality.
        const { resetToken, resetTokenExpiry, role, expenseLimit, ...safeUpdateData } = updateData;

        if (safeUpdateData.joiningDate && safeUpdateData.joiningDate !== '') {
            safeUpdateData.joiningDate = new Date(safeUpdateData.joiningDate);
        } else if (safeUpdateData.joiningDate === '') {
            safeUpdateData.joiningDate = null;
        } else {
            delete safeUpdateData.joiningDate;
        }

        if (safeUpdateData.dob && safeUpdateData.dob !== '') {
            safeUpdateData.dob = new Date(safeUpdateData.dob);
        } else if (safeUpdateData.dob === '') {
            safeUpdateData.dob = null;
        } else {
            delete safeUpdateData.dob;
        }

        if (typeof safeUpdateData.email === 'string') {
            safeUpdateData.email = safeUpdateData.email.trim().toLowerCase();
        }
        if (typeof safeUpdateData.personalEmail === 'string') {
            safeUpdateData.personalEmail = safeUpdateData.personalEmail.trim().toLowerCase();
        }

        // Hash password resets before storing; the plaintext is kept only for
        // the reset email sent below.
        const plainPassword = safeUpdateData.password;
        if (plainPassword) {
            safeUpdateData.password = await hashPassword(plainPassword);
        }

        // Replace the employee's profile photo IN PLACE: a freshly-picked image
        // (data: URL) is uploaded to a stable per-employee object key, overwriting
        // the prior object, and any previous object stored under a different key
        // (e.g. an old random/migration key or a different extension) is deleted —
        // so re-uploads never accumulate duplicate files. The DB then holds the URL
        // of the latest image. An unchanged value (already an http/uploads URL)
        // passes through untouched.
        if (safeUpdateData.photo && safeUpdateData.photo.startsWith('data:')) {
            const existing = await prisma.employee.findUnique({
                where: { id: parseInt(id) },
                select: { organizationId: true, photo: true },
            });
            const mime = (safeUpdateData.photo.match(/^data:([^;]+);base64,/) || [])[1] || 'image/png';
            const objectKey = `employee-photos/org-${existing?.organizationId ?? 'none'}/employee-${parseInt(id)}.${extFromContentType(mime)}`;
            const newUrl = await persistDataUrlAt(safeUpdateData.photo, objectKey);
            // Delete the previous object only if it lived under a different key.
            const oldKey = objectKeyFromUrl(existing?.photo);
            if (oldKey && oldKey !== objectKeyFromUrl(newUrl)) {
                await removeObjectByUrl(existing.photo);
            }
            safeUpdateData.photo = newUrl;
        }

        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: {
                ...(employeeId && { employeeId }),
                ...(expenseLimit !== undefined && { expenseLimit: parseFloat(expenseLimit) }),
                ...safeUpdateData,
            },
        });

        const responseBody = stripSensitive(employee);

        // Fire-and-forget password reset email so the client isn't blocked on SMTP.
        let afterResponse = null;
        if (plainPassword) {
            afterResponse = async () => {
                try {
                    const orgForEmail = await buildOrgForEmail(employee.organizationId, req);
                    await sendPasswordResetEmail({
                        name: employee.name,
                        email: employee.email,
                        password: plainPassword,
                        org: orgForEmail,
                    });
                    console.log(`[Password Reset Email] Sent to ${employee.email}`);
                } catch (emailError) {
                    console.error('[Password Reset Email] Failed to send:', emailError.message);
                }
            };
        }

        return { status: 200, body: responseBody, afterResponse };
    } catch (error) {
        console.error('Error updating employee:', error);
        if (error.code === 'P2025') {
            return { status: 404, body: { error: 'Employee not found' } };
        }
        return { status: 500, body: { error: 'Failed to update employee' } };
    }
}

export async function remove(id) {
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: parseInt(id) },
            select: { organizationId: true },
        });

        await prisma.employee.delete({ where: { id: parseInt(id) } });

        if (employee?.organizationId) {
            const actualCount = await prisma.employee.count({
                where: { organizationId: employee.organizationId, role: { not: 'admin' } },
            });
            await prisma.organization.update({
                where: { id: employee.organizationId },
                data: { used: actualCount },
            });
        }
        return { status: 204, body: null };
    } catch (error) {
        console.error('Error deleting employee:', error);
        return { status: 500, body: { error: 'Failed to delete employee' } };
    }
}
