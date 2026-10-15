import prisma from '../../lib/prisma.js';
import { sendSalarySlipEmail } from '../../lib/email.js';
import { checkFeature } from '../../lib/feature-gate.js';
import { resolveOrgBranding } from '../../lib/org-branding.js';
import { checkSameOrg } from '../../lib/tenant.js';

export async function POST(req, res) {
    try {
        const {
            employeeId, employeeStrId, employeeName, department, designation, month, year, bankAccount,
            basicSalary, hra, transportAllowance, medicalAllowance, otherAllowance,
            pf, esi, professionalTax, incomeTax, otherDeduction,
            grossEarnings, totalDeductions, netPay,
            attendanceStatus, deductionReason
        } = req.body;

        const parsedEmployeeId = parseInt(employeeId);
        if (!employeeId || Number.isNaN(parsedEmployeeId)) {
            return res.status(400).json({ error: 'Valid Employee ID is required' });
        }

        // Tenant guard: the target employee must belong to the caller's org.
        const targetEmployee = await prisma.employee.findUnique({
            where: { id: parsedEmployeeId },
            select: { organizationId: true }
        });
        if (!targetEmployee) return res.status(404).json({ error: 'Employee not found' });
        if (!checkSameOrg(req, res, targetEmployee)) return;

        const missing = [];
        if (!employeeName || !String(employeeName).trim()) missing.push('employeeName');
        if (!department || !String(department).trim()) missing.push('department');
        if (!designation || !String(designation).trim()) missing.push('designation');
        if (!month) missing.push('month');
        if (!year) missing.push('year');
        if (missing.length) {
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        // Feature Gating
        const access = await checkFeature(req, 'payslip');
        if (!access.allowed) {
            return res.status(403).json({
                error: 'Feature Restricted',
                message: access.reason
            });
        }

        const salarySlip = await prisma.salarySlip.create({
            data: {
                employeeId: parsedEmployeeId,
                employeeStrId: employeeStrId || null,
                employeeName: String(employeeName).trim(),
                department: String(department).trim(),
                designation: String(designation).trim(),
                bankAccount: bankAccount || null,
                month: String(month),
                year: String(year),
                basicSalary: parseFloat(basicSalary) || 0,
                hra: parseFloat(hra) || 0,
                transportAllowance: parseFloat(transportAllowance) || 0,
                medicalAllowance: parseFloat(medicalAllowance) || 0,
                otherAllowance: parseFloat(otherAllowance) || 0,
                pf: parseFloat(pf) || 0,
                esi: parseFloat(esi) || 0,
                professionalTax: parseFloat(professionalTax) || 0,
                incomeTax: parseFloat(incomeTax) || 0,
                otherDeduction: parseFloat(otherDeduction) || 0,
                grossEarnings: parseFloat(grossEarnings) || 0,
                totalDeductions: parseFloat(totalDeductions) || 0,
                netPay: parseFloat(netPay) || 0,
                attendanceStatus: attendanceStatus || null,
                deductionReason: deductionReason || null
            },
            include: {
                employee: { select: { organizationId: true } }
            }
        });

        // Resolve branding via the employee's organizationId so the created
        // slip can be previewed/downloaded as PDF without a second round-trip.
        const branding = salarySlip.employee?.organizationId
            ? await resolveOrgBranding(salarySlip.employee.organizationId, req)
            : {};

        res.status(201).json({
            ...salarySlip,
            organizationName: branding.name || null,
            organizationLogo: branding.logoDataUrl || null,
            organizationAddress: branding.address || null,
            payslipConfig: branding.payslipConfig || null,
        });

        // Fire-and-forget notification email — don't block the HTTP response on SMTP.
        (async () => {
            try {
                const employee = await prisma.employee.findUnique({
                    where: { id: parseInt(employeeId) },
                    select: { email: true, personalEmail: true, employeeId: true, organizationId: true }
                });

                const officeEmail = employee?.email;
                const personal = employee?.personalEmail || null;
                const empStrId = employee?.employeeId || employeeStrId || 'N/A';

                if (!officeEmail) {
                    console.warn(`[Payslip Email] No email found for employee ID ${employeeId}. Notification skipped.`);
                    return;
                }

                const orgForEmail = employee.organizationId
                    ? await prisma.organization.findUnique({ where: { id: employee.organizationId }, select: { id: true, name: true, logo: true } }).catch(() => null)
                    : null;
                console.log(`[Payslip Email] Sending notification to ${officeEmail} for ${month} ${year}...`);
                await sendSalarySlipEmail(
                    officeEmail,
                    personal,
                    employeeName,
                    empStrId,
                    department,
                    month,
                    year,
                    orgForEmail
                );
                console.log('[Payslip Email] Sent successfully.');
            } catch (emailError) {
                console.error('[Payslip Email] Failed to send notification:', emailError);
            }
        })();
    } catch (error) {
        console.error('Error creating salary slip:', error);
        console.error('Request body was:', JSON.stringify(req.body));
        if (error.code === 'P2003') {
            return res.status(400).json({ error: 'Invalid Employee ID — employee does not exist' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Salary slip already exists for this employee/month/year' });
        }
        res.status(500).json({ error: 'Failed to create salary slip', details: error.message });
    }
}

export async function GET(req, res) {
    try {
        const { employeeId } = req.query;

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }

        const where = {};
        if (employeeId) {
            where.employeeId = parseInt(employeeId);
        }

        // Security: Filter by organization if restricted
        if (orgId) {
            where.employee = { organizationId: orgId };
        }

        const slips = await prisma.salarySlip.findMany({
            where,
            include: {
                employee: {
                    select: { organizationId: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Resolve each slip's org branding once per distinct organizationId. Logo is
        // returned as a base64 data URL so the client PDF renderer can embed it directly
        // without cross-origin image loading.
        const orgIds = [...new Set(slips.map(s => s.employee?.organizationId).filter(Boolean))];
        const brandingByOrg = new Map(
            await Promise.all(orgIds.map(async id => [id, await resolveOrgBranding(id, req)]))
        );

        const flattenedSlips = slips.map(slip => {
            const branding = brandingByOrg.get(slip.employee?.organizationId) || {};
            return {
                ...slip,
                organizationName: branding.name || null,
                organizationLogo: branding.logoDataUrl || null,
                organizationAddress: branding.address || null,
                payslipConfig: branding.payslipConfig || null,
            };
        });

        res.json(flattenedSlips);
    } catch (error) {
        console.error('Error fetching salary slips:', error);
        res.status(500).json({ error: 'Failed to fetch salary slips', details: error.message });
    }
}

export async function DELETE(req, res) {
    try {
        const { id } = req.params;
        const slipId = parseInt(id);

        if (isNaN(slipId)) {
            return res.status(400).json({ error: 'Invalid salary slip ID' });
        }

        const existing = await prisma.salarySlip.findUnique({
            where: { id: slipId },
            include: { employee: { select: { organizationId: true } } }
        });
        if (!existing) return res.status(404).json({ error: 'Salary slip not found' });
        if (!checkSameOrg(req, res, existing, { via: 'employee' })) return;

        await prisma.salarySlip.delete({
            where: { id: slipId }
        });

        res.json({ message: 'Salary slip deleted successfully' });
    } catch (error) {
        console.error('Error deleting salary slip:', error);
        res.status(500).json({ error: 'Failed to delete salary slip', details: error.message });
    }
}
