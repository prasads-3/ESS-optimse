import prisma from './prisma.js';

export async function checkFeature(req, featureName) {
    if (!req.user) return { allowed: false, reason: 'Unauthorized' };
    if (req.user.role === 'super-admin') return { allowed: true };

    let orgId = req.user.organizationId;

    // Stale JWT fallback: if the token predates organizationId being embedded,
    // look it up from the employee record so we don't falsely 403.
    if (!orgId && req.user.id) {
        try {
            const emp = await prisma.employee.findUnique({
                where: { id: parseInt(req.user.id) },
                select: { organizationId: true }
            });
            if (emp?.organizationId) orgId = emp.organizationId;
        } catch (e) {
            console.error('[FEATURE-GATE] Failed to resolve organizationId from employee:', e.message);
        }
    }

    if (!orgId) return { allowed: false, reason: 'No organization associated with account' };

    const org = await prisma.organization.findUnique({
        where: { id: parseInt(orgId) },
        include: { subscriptionPlan: true }
    });

    if (!org || !org.subscriptionPlan) {
        // Fallback for organizations without an active plan (e.g. newly created)
        // We allow some basic features by default to avoid 403 errors during onboarding/migration
        console.warn(`[FEATURE-GATE] Org ${orgId} has no active plan. Using default fallback features.`);
        const fallbackFeatures = ['payslip', 'attendance', 'announcement', 'documentation'];
        const normalizedInput = featureName.toLowerCase().trim();
        if (fallbackFeatures.includes(normalizedInput)) return { allowed: true };
        
        return { allowed: false, reason: 'No active subscription plan found' };
    }

    const features = org.subscriptionPlan.features || [];
    const featuresArray = typeof features === 'string' ? (features.startsWith('[') ? JSON.parse(features) : [features]) : features;

    const normalizedInput = featureName.toLowerCase().trim();

    // Referral is always accessible — matches frontend AuthContext behavior
    if (normalizedInput === 'referral' || normalizedInput === 'refer' || normalizedInput === 'refer & earn') {
        return { allowed: true };
    }

    const hasFeature = (Array.isArray(featuresArray) ? featuresArray : []).some(f => {
        if (typeof f !== 'string') return false;
        const normalizedF = f.toLowerCase().trim();

        // Bidirectional inclusion check (match AuthContext.hasFeature)
        if (normalizedF.includes(normalizedInput)) return true;
        if (normalizedInput.includes(normalizedF)) return true;

        // Fuzzy logic for common typos and varied naming conventions
        if (normalizedInput === 'announcement' && (normalizedF.includes('announcment') || normalizedF.includes('announcement'))) return true;
        if (normalizedInput === 'payslip' && (
            normalizedF.includes('payroll') ||
            normalizedF.includes('salary') ||
            normalizedF.includes('asset') ||
            normalizedF.includes('payslip')
        )) return true;
        if (normalizedInput === 'tracking' && normalizedF.includes('track')) return true;
        if (normalizedInput === 'attendance' && (
            normalizedF.includes('attendence') ||
            normalizedF.includes('attend') ||
            normalizedF.includes('tracking')
        )) return true;
        if (normalizedInput === 'document' && (
            normalizedF.includes('documentation') ||
            normalizedF.includes('internal') ||
            normalizedF.includes('doc')
        )) return true;
        if (normalizedInput === 'referral' && (normalizedF.includes('refer') || normalizedF.includes('referral'))) return true;

        return false;
    });

    if (!hasFeature) {
        console.log(`[FEATURE-GATE] Denied access to "${featureName}" for Org ${orgId}. Features:`, featuresArray);
        return { allowed: false, reason: 'Feature not included in assigned plan' };
    }

    console.log(`[FEATURE-GATE] Allowed "${featureName}" for Org ${orgId} (role=${req.user.role})`);
    return { allowed: true };
}
