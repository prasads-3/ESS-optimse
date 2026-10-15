import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { hashPassword } from '../../lib/password.js';
import { persistDataUrl } from '../../lib/minio.js';

// Generate a readable temporary password (no ambiguous chars like 0/O/1/l).
function generateTempPassword(len = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createUniqueSlug(name) {
  const base = generateSlug(name);
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter++;
  }
}

export async function GET(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        logo: true,
        status: true,
        plan: true,
        limit: true,
        used: true,
        startDate: true,
        endDate: true,
        admin: true,
        subscriptionPlan: {
          select: { id: true, name: true, price: true, userLimit: true, color: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(orgs);
  } catch (error) {
    console.error('[Organizations GET Error]', error);
    return res.status(500).json({ error: 'Failed to fetch organizations' });
  }
}

export async function POST(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }
  try {
    const data = req.body;
    if (!data || !data.name || !data.admin) {
      return res.status(400).json({ error: 'Missing required fields: name and admin email are required' });
    }

    console.log(`[Organizations POST] Processing: "${data.name}" | Admin: "${data.admin}"`);

    const { planId } = data;
    let finalPlanId = planId ? parseInt(planId) : null;
    if (isNaN(finalPlanId)) finalPlanId = null;

    let planLimit = null;
    let planName = null;

    // Duplicate check before creation
    const existingOrg = await prisma.organization.findUnique({ where: { name: data.name } });
    if (existingOrg) {
      console.warn(`[Organizations POST] Conflict: Name "${data.name}" already exists`);
      return res.status(400).json({ error: 'Organization with this name already exists' });
    }

    // Removed global email check to allow isolation between organizations.
    // The same email can now be an admin/employee in multiple distinct organizations.
    const normalizedEmail = data.admin.toLowerCase().trim();

    // Resolve Plan Details only if explicitly provided
    if (finalPlanId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: finalPlanId } });
      if (plan) {
        planLimit = plan.userLimit;
        planName = plan.name;
      } else {
        console.warn(`[Organizations POST] Plan ID ${finalPlanId} not found in DB. Resetting to null.`);
        finalPlanId = null; // Prevent foreign key constraint failure
      }
    }
    // No auto-assignment of Basic plan — planId stays null until explicitly assigned

    // Date Parsing Safety
    const parseDate = (val) => {
      if (!val || val === '') return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const startDate = parseDate(data.startDate);
    const endDate = parseDate(data.endDate);

    console.log(`[Organizations POST] Creating DB records...`);

    // Generate unique slug from org name
    const slug = await createUniqueSlug(data.name);
    const tempPassword = data.password || 'admin123';

    // Push the logo to MinIO (outside the tx) and store only its URL — keeps the
    // multi-MB base64 blob out of the DB. Done before the transaction so the tx
    // stays short. Falls back to disk if MinIO is unreachable.
    const logoUrl = data.logo
      ? await persistDataUrl(data.logo, { folder: 'org-logos', docType: 'logo' })
      : null;

    // Transactional creation. Timeout bumped beyond the 5s default because
    // logos are stored inline as base64 data URLs (~2.67MB for a 2MB image),
    // and Neon write latency for the larger text payload can exceed 5s.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug,
          industry: data.industry || 'Technology',
          address: data.address || null,
          planId: finalPlanId,
          ...(planLimit !== null && { limit: planLimit }),
          ...(planName !== null && { plan: planName }),
          admin: normalizedEmail,
          logo: logoUrl,
          billingCycle: data.billingCycle || 'Monthly',
          status: 'Active',
          startDate: startDate,
          endDate: endDate
        }
      });
      console.log(`[Organizations POST] Org created with slug="${slug}", planId=${finalPlanId ?? 'none'}`);

      // 2. Create Admin Employee (marked as temporary password)
      const employeeId = `ADM-${Math.floor(1000 + Math.random() * 9000)}`;
      await tx.employee.create({
        data: {
          email: normalizedEmail,
          // Stored hashed; the plaintext is returned once via _credentials below
          password: await hashPassword(tempPassword),
          name: data.adminName || 'Admin User',
          title: 'Administrator',
          role: 'admin',
          organizationId: org.id,
          employeeId: employeeId,
          status: 'Active',
          department: 'Management',
          isTemporaryPassword: true
        }
      });

      return org;
    }, { maxWait: 5000, timeout: 30000 });

    // 3. Fetch final object with relationships
    const createdOrg = await prisma.organization.findUnique({
      where: { id: result.id },
      include: {
        subscriptionPlan: true
      }
    });

    console.log(`[Organizations POST] Success: ID ${result.id}, slug="${slug}"`);
    return res.status(201).json({
      ...createdOrg,
      _credentials: {
        slug,
        adminEmail: normalizedEmail,
        tempPassword,
      }
    });
  } catch (error) {
    console.error('[Organizations POST Error]', error);

    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      return res.status(400).json({ error: `Conflict on unique fields: ${target.join(', ')}` });
    }

    return res.status(500).json({
      error: 'Internal Server Error during organization creation',
      details: error.message,
      code: error.code
    });
  }
}

export async function DELETE(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const orgId = parseInt(id);
    console.log(`[Organizations DELETE] Attempting to delete organization ID: ${orgId}`);

    // Check if it exists
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      console.warn(`[Organizations DELETE] Organization ID ${orgId} not found`);
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Explicitly delete related records to ensure full cleanup and bypass any potential cascade issues
    console.log(`[Organizations DELETE] Cleaning up related records for ID: ${orgId}`);

    // We use deleteMany for child records. Even with DB cascades, manual cleanup is safer if the user is seeing issues.
    await prisma.$transaction([
      prisma.employee.deleteMany({ where: { organizationId: orgId } }),
      prisma.policy.deleteMany({ where: { organizationId: orgId } }),
      prisma.holiday.deleteMany({ where: { organizationId: orgId } }),
      prisma.announcement.deleteMany({ where: { organizationId: orgId } }),
      prisma.organization.delete({ where: { id: orgId } })
    ]);

    console.log(`[Organizations DELETE] Success: Organization "${org.name}" and all related data deleted.`);
    return res.status(200).json({ message: 'Organization and all related data deleted successfully' });
  } catch (error) {
    console.error('[Organizations DELETE Error]', error);
    return res.status(500).json({
      error: 'Failed to delete organization',
      details: error.message,
      code: error.code
    });
  }
}

// Reset the organization admin's password. Generates a fresh temporary
// password, stores it hashed, flags it for change on next login, and returns
// the plaintext ONCE so the super-admin can copy/share it. The original
// password can never be retrieved (it is hashed), so resetting is the only
// way to hand out a known password.
export async function RESET_PASSWORD(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }
  try {
    const { id } = req.params;
    const orgId = parseInt(id);
    if (isNaN(orgId)) {
      return res.status(400).json({ error: 'Valid organization ID is required' });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Prefer the admin employee matching the org's current admin email; fall
    // back to the oldest admin-role employee in the org.
    const admin =
      (org.admin &&
        (await prisma.employee.findFirst({
          where: { organizationId: orgId, role: 'admin', email: org.admin },
        }))) ||
      (await prisma.employee.findFirst({
        where: { organizationId: orgId, role: 'admin' },
        orderBy: { createdAt: 'asc' },
      }));

    if (!admin) {
      return res.status(404).json({ error: 'No admin user found for this organization' });
    }

    const tempPassword = generateTempPassword();
    await prisma.employee.update({
      where: { id: admin.id },
      data: {
        password: await hashPassword(tempPassword),
        isTemporaryPassword: true,
      },
    });

    console.log(`[Organizations RESET_PASSWORD] Reset admin password for org ${orgId} (${admin.email})`);
    return res.status(200).json({ adminEmail: admin.email, tempPassword });
  } catch (error) {
    console.error('[Organizations RESET_PASSWORD Error]', error);
    return res.status(500).json({ error: 'Failed to reset admin password', details: error.message });
  }
}

export async function PATCH(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    console.log('[Organizations PATCH] Updating org', id, 'with data:', req.body);

    // Build update data object explicitly to avoid P2009 errors from unexpected payload fields
    const updateData = {};
    const allowedFields = ['name', 'industry', 'status', 'admin', 'billingCycle', 'address', 'logo'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Normalize admin email if provided
    if (updateData.admin) {
      updateData.admin = String(updateData.admin).toLowerCase().trim();
    }

    // Handle planId Assignment & Sync
    if (req.body.planId !== undefined && req.body.planId !== null) {
      const pId = (typeof req.body.planId === 'string' && req.body.planId !== '')
        ? parseInt(req.body.planId)
        : typeof req.body.planId === 'number' ? req.body.planId : null;

      updateData.planId = pId;

      if (pId && !isNaN(pId)) {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: pId } });
        if (plan) {
          console.log(`[Organizations PATCH] Syncing Plan "${plan.name}" (Limit: ${plan.userLimit}) to Org ${id}`);
          updateData.limit = plan.userLimit;
          updateData.plan = plan.name;
        } else {
          console.warn(`[Organizations PATCH] Plan ID ${pId} not found for Org ${id}`);
        }
      } else if (pId === null) {
        // Plan was unassigned
        updateData.plan = "No Plan";
        updateData.limit = 35; // Fallback to default schema limit
      }
    }

    // Handle explicit limit override (if provided)
    if (req.body.limit !== undefined && req.body.limit !== null && req.body.limit !== '') {
      const explicitLimit = parseInt(req.body.limit);
      if (!isNaN(explicitLimit)) {
        updateData.limit = explicitLimit;
      }
    }

    // Handle priceOverride
    if (req.body.priceOverride !== undefined) {
      updateData.priceOverride = (req.body.priceOverride === '' || req.body.priceOverride === null) ? null : parseFloat(req.body.priceOverride);
    }

    // Handle startDate
    if (req.body.startDate !== undefined) {
      updateData.startDate = req.body.startDate && req.body.startDate !== '' ? new Date(req.body.startDate) : null;
    }

    // Handle endDate
    if (req.body.endDate !== undefined) {
      updateData.endDate = req.body.endDate && req.body.endDate !== '' ? new Date(req.body.endDate) : null;
    }

    console.log('[Organizations PATCH] Final updateData:', updateData);

    const orgId = parseInt(id);

    // If admin email is being changed, sync it on the linked admin Employee record(s).
    if (updateData.admin) {
      const currentOrg = await prisma.organization.findUnique({ where: { id: orgId } });
      if (currentOrg && currentOrg.admin && currentOrg.admin !== updateData.admin) {
        await prisma.employee.updateMany({
          where: { organizationId: orgId, role: 'admin', email: currentOrg.admin },
          data: { email: updateData.admin }
        });
      }
    }

    // If a new logo (base64) is provided, push it to MinIO and store only the
    // URL. The previous logo object is left in place (not deleted). An unchanged
    // value (already a URL) passes through untouched.
    if (typeof updateData.logo === 'string' && updateData.logo.startsWith('data:')) {
      updateData.logo = await persistDataUrl(updateData.logo, { folder: 'org-logos', docType: 'logo' });
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
      include: {
        subscriptionPlan: true
      }
    });

    console.log('[Organizations PATCH] Success:', org);
    return res.status(200).json(org);
  } catch (error) {
    console.error('[Organizations PATCH Error]', error);
    console.error('[Organizations PATCH Error Details]', error.message, error.code, error.meta);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Organization with this name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.status(500).json({
      error: 'Failed to update organization',
      details: error.message,
      code: error.code
    });
  }
}
