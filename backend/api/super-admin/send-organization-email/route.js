import prisma from '../../../lib/prisma.js';
import { sendOrganizationBroadcastEmail } from '../../../lib/email.js';

// Same defensive handling used by other super-admin routes: if the
// EmailBroadcast table hasn't been pushed yet, don't 500 the whole flow —
// the email still sends; we just skip persisting history.
const isMissingTableError = (error) => {
  if (!error) return false;
  if (error.code === 'P2021' || error.code === 'P2022') return true;
  const msg = error.message || '';
  return /does not exist|relation .* does not exist|Unknown arg|Invalid .* invocation/i.test(msg);
};

// RFC-5322-lite check — good enough to skip obviously broken addresses
// (empty, missing @, no domain dot) before handing them to nodemailer.
const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/**
 * POST /api/send-organization-email
 *
 * Super Admin enters an Admin email; we resolve the organization that admin
 * belongs to, gather every employee email under that org, and broadcast the
 * message to all of them (admin included). Duplicates are removed and invalid
 * addresses dropped before sending. Outcome is persisted to EmailBroadcast.
 *
 * Body: { adminEmail, subject, message }
 * Returns: { success, totalRecipients, sentCount, failedCount }
 */
export async function POST(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  const { adminEmail, subject, message } = req.body || {};

  if (!adminEmail || !isValidEmail(adminEmail)) {
    return res.status(400).json({ error: 'A valid adminEmail is required' });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'subject is required' });
  }
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const normalizedAdmin = adminEmail.trim().toLowerCase();

  try {
    // 1. Resolve the organization from the admin email. Prefer the
    //    Organization.admin field (the canonical admin-of-record), then fall
    //    back to an Employee record carrying that email (covers admins who were
    //    onboarded as employees but the org row wasn't updated).
    let org = await prisma.organization.findFirst({
      where: { admin: { equals: normalizedAdmin, mode: 'insensitive' } },
    });

    if (!org) {
      const adminEmployee = await prisma.employee.findFirst({
        where: { email: { equals: normalizedAdmin, mode: 'insensitive' } },
        select: { organizationId: true },
      });
      if (adminEmployee?.organizationId) {
        org = await prisma.organization.findUnique({ where: { id: adminEmployee.organizationId } });
      }
    }

    if (!org) {
      return res.status(404).json({ error: 'No organization found for that admin email' });
    }

    // 2. Fetch every employee under that organization.
    const employees = await prisma.employee.findMany({
      where: { organizationId: org.id },
      select: { email: true },
    });

    // 3. Build a deduped, validated recipient set (admin + all employees).
    //    Lowercase keys dedupe case variants; we keep the original-cased
    //    address for sending/display.
    const seen = new Set();
    const recipients = [];
    for (const raw of [normalizedAdmin, ...employees.map((e) => e.email)]) {
      if (!isValidEmail(raw)) continue;
      const key = raw.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      recipients.push(raw.trim());
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipient emails found for this organization' });
    }

    // 4. Send. sendEmail loops per-recipient and returns successes + failures.
    const { results, errors } = await sendOrganizationBroadcastEmail({
      subject: subject.trim(),
      message: message.trim(),
      recipients,
      org,
    });

    const sentCount = results?.length ?? 0;
    const failedCount = errors?.length ?? 0;

    // 5. Persist history (best-effort — never fail the request on a log error).
    //    One EmailRecipient row per address replaces the deprecated
    //    recipients/failures JSON arrays; a failure is status='failed'
    //    + errorMessage on the recipient row.
    try {
      const failureByEmail = new Map(
        (errors ?? [])
          .filter((f) => f && f.recipient)
          .map((f) => [String(f.recipient).trim().toLowerCase(), f.error || 'unknown error'])
      );
      const now = new Date();
      await prisma.emailBroadcast.create({
        data: {
          organizationId: org.id,
          adminEmail: normalizedAdmin,
          subject: subject.trim(),
          message: message.trim(),
          totalRecipients: recipients.length,
          sentCount,
          failedCount,
          sentBy: req.user.email || 'super-admin',
          recipientRows: {
            create: recipients.map((email) => {
              const error = failureByEmail.get(email.toLowerCase());
              return {
                email,
                status: error ? 'failed' : 'sent',
                sentAt: error ? null : now,
                failedAt: error ? now : null,
                errorMessage: error ?? null,
              };
            }),
          },
        },
      });
    } catch (logErr) {
      if (!isMissingTableError(logErr)) {
        console.error('[send-organization-email] Failed to record history:', logErr);
      } else {
        console.warn('[send-organization-email] EmailBroadcast table missing — skipping history. Run `npx prisma db push`.');
      }
    }

    return res.json({
      success: failedCount === 0,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      organization: org.name,
    });
  } catch (error) {
    console.error('[send-organization-email] Error:', error);
    return res.status(500).json({ error: 'Failed to send organization email' });
  }
}

/**
 * GET /api/super-admin/email-history
 * Recent org-wide broadcasts for the Super Admin dashboard.
 */
export async function GET(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const { limit = 25 } = req.query;
    const history = await prisma.emailBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 25, 100),
      select: {
        id: true,
        adminEmail: true,
        subject: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    });
    res.json({ history });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('[send-organization-email] EmailBroadcast table missing — returning empty history.');
      return res.json({ history: [] });
    }
    console.error('[send-organization-email] History error:', error);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
}
