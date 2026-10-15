import prisma from '../../lib/prisma.js';
import { createNotification } from '../../lib/notification.js';
import { sendCustomPlanRequestEmail } from '../../lib/email.js';

export async function POST(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin only' });
  }

  try {
    const { users, duration, features, specialReq } = req.body;

    if (!req.user.organizationId) {
      return res.status(400).json({ error: 'User does not belong to an organization.' });
    }

    const orgId = req.user.organizationId;

    // Fetch organization name
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, logo: true }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Create the custom plan request
    const request = await prisma.customPlanRequest.create({
      data: {
        organizationId: orgId,
        users: users.toString(),
        duration,
        features: features || '',
        specialReq: specialReq || '',
        status: "Pending"
      }
    });

    // Create in-app notifications for all super-admins
    try {
      await createNotification({
        type: 'custom_plan_request',
        title: 'New Custom Plan Request',
        message: `${req.user.name} from ${organization.name} has submitted a custom plan request for ${users} users.`,
        recipientRole: 'super-admin',
        link: '/super-admin/custom-requests',
        customPlanRequestId: request.id
      });
      console.log(`[Custom Plan] Notifications created for super-admins, request ID: ${request.id}`);
    } catch (notifErr) {
      console.error('[Custom Plan] Failed to create notifications:', notifErr);
      // Don't fail the request if notification creation fails
    }

    // Send email notifications to all super-admins
    try {
      const superAdmins = await prisma.employee.findMany({
        where: { role: 'super-admin' },
        select: { email: true, name: true }
      });

      if (superAdmins && superAdmins.length > 0) {
        const superAdminEmails = superAdmins.map(sa => sa.email);

        await sendCustomPlanRequestEmail({
          adminName: req.user.name,
          organizationName: organization.name,
          users: users.toString(),
          duration,
          features: features || '',
          specialReq: specialReq || '',
          superAdminEmails,
          org: organization
        });
        console.log(`[Custom Plan] Email notifications sent to ${superAdminEmails.length} super-admins`);
      }
    } catch (emailErr) {
      console.error('[Custom Plan] Failed to send email notifications:', emailErr);
      // Don't fail the request if email sending fails
    }

    return res.status(201).json(request);
  } catch (err) {
    console.error("Error creating custom plan request:", err);
    return res.status(500).json({ error: "Failed to create custom plan request" });
  }
}

export async function GET(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const requests = await prisma.customPlanRequest.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching custom plan requests:", err);
    return res.status(500).json({ error: "Failed to fetch custom plan requests" });
  }
}

export async function PATCH(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Missing request ID' });
    }

    const updated = await prisma.customPlanRequest.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating custom plan request:", err);
    return res.status(500).json({ error: "Failed to update custom plan request" });
  }
}
