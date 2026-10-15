// Multi-level approval escalation shared across Leave, Expense and Fund (Money)
// requests. The flow is sequential up the reporting chain:
//
//   employee → direct manager (reportsTo) → that manager's manager → … → Admin
//
// State lives on each request row:
//   - currentApproverId : the employee who must act now.
//       * non-null  → awaiting that specific person (a manager, or an admin if
//                     they are next in line).
//       * null while status is "Pending" → awaiting the ADMIN POOL (any org
//         admin may finalize).
//   - approvalHistory   : audit trail [{ approverId, approverName, action, note, at }].
//
// Rules (confirmed): a rejection at any level ends the request immediately;
// an admin is the terminal authority and may only act once the request has
// reached them (their assignment, or the admin pool). No self-approval.

import { resolveManager } from './manager.js';
import { createNotification } from './notification.js';
import { sendApprovalPendingEmail } from './email.js';

const APPROVALS_LINK = '/user/approvals';

// Where the requester's in-app "decision" notification should point.
const REQUESTER_LINK = {
    leave: '/user/leaves',
    expense: '/user/expenses',
    fund: '/user',
};

const KIND_LABEL = { leave: 'Leave', expense: 'Expense', fund: 'Fund' };

// Fund requests use "Disabled" instead of "Rejected" for a declined request.
const rejectStatus = (kind) => (kind === 'fund' ? 'Disabled' : 'Rejected');

const num = (v) => (v == null ? null : Number(v));

/**
 * Can `actor` (the logged-in user: { id, role }) act on this request right now?
 * Enforced before any approve/reject.
 */
export function canActOn(request, actor) {
    if (!request || !actor) return false;
    if (String(request.status || '').toLowerCase() !== 'pending') return false;
    // No self-approval.
    if (num(actor.id) === num(request.employeeId)) return false;

    // Admin override: an org admin is the terminal authority and may finalize a
    // request at ANY stage — including while it is still awaiting a manager —
    // not only once it has escalated to the admin pool. (The route already
    // enforced same-organization before calling this.)
    if (actor.role === 'admin') return true;

    if (request.currentApproverId != null) {
        return num(actor.id) === num(request.currentApproverId);
    }
    // Admin-pool stage: any org admin may finalize.
    return actor.role === 'admin';
}

/**
 * Resolve the FIRST approver for a brand-new request. Returns
 * { currentApproverId, approver } where approver is null when the request
 * goes straight to the admin pool (employee has no resolvable manager).
 */
export async function computeInitialApprover(requester, prisma) {
    const { managerId, managerEmail, managerName } = await resolveManager(requester, prisma);
    if (managerId && num(managerId) !== num(requester.id)) {
        return { currentApproverId: managerId, approver: { id: managerId, email: managerEmail, name: managerName } };
    }
    return { currentApproverId: null, approver: null };
}

/**
 * Fire the "awaiting your approval" notifications for a freshly-submitted
 * request. `approver` is the result of computeInitialApprover (or null → admin
 * pool). Safe to call in the background (in-app writes awaited, email
 * fire-and-forget).
 */
export async function notifyInitial({ kind, requesterName, summary, approver, organizationId, org, prisma }) {
    if (approver) {
        await notifyApprover({ kind, requesterName, summary, approver, org });
    } else {
        await notifyAdminPool({ kind, requesterName, summary, organizationId, org, prisma });
    }
}

/**
 * Apply an approve/reject action and compute the new state + notifications.
 * Performs the escalation lookups (awaited) and sends approver / admin-pool /
 * requester in-app notifications; emails are fire-and-forget.
 *
 * Returns { data, finalized, decision } where `data` is what to persist on the
 * request row (status, currentApproverId, approvalHistory).
 */
export async function advanceApproval({ kind, request, requester, actor, action, note, summary, org, prisma }) {
    const history = Array.isArray(request.approvalHistory) ? [...request.approvalHistory] : [];
    history.push({
        approverId: num(actor.id),
        approverName: actor.name || null,
        action,
        note: note || null,
        at: new Date().toISOString(),
    });

    const requesterName = requester?.name || 'An employee';
    const organizationId = requester?.organizationId ?? request.organizationId ?? null;

    // ---- Rejection ends the chain immediately ----
    if (action === 'reject') {
        await notifyRequesterDecision({ kind, requester, decision: rejectStatus(kind), prisma });
        return { data: { status: rejectStatus(kind), currentApproverId: null, approvalHistory: history }, finalized: true, decision: rejectStatus(kind) };
    }

    // ---- Approval ----
    // An admin is the terminal authority: their approval finalizes regardless of
    // whether they were the assigned approver or acted from the admin pool.
    if (actor.role === 'admin') {
        await notifyRequesterDecision({ kind, requester, decision: 'Approved', prisma });
        return { data: { status: 'Approved', currentApproverId: null, approvalHistory: history }, finalized: true, decision: 'Approved' };
    }

    // A manager approved → escalate to THEIR manager; if none, to the admin pool.
    let nextId = null;
    const actorEmployee = await prisma.employee.findUnique({
        where: { id: num(actor.id) },
        select: { id: true, name: true, reportsTo: true, reportsToName: true, organizationId: true },
    });
    if (actorEmployee) {
        const { managerId, managerEmail, managerName } = await resolveManager(actorEmployee, prisma);
        const seen = new Set(history.map((h) => num(h.approverId)));
        // Cycle guard: skip self, the requester, and anyone who already acted.
        if (managerId && num(managerId) !== num(actor.id) && num(managerId) !== num(request.employeeId) && !seen.has(num(managerId))) {
            nextId = managerId;
            await notifyApprover({ kind, requesterName, summary, approver: { id: managerId, email: managerEmail, name: managerName }, org });
        }
    }

    if (nextId == null) {
        await notifyAdminPool({ kind, requesterName, summary, organizationId, org, prisma });
    }

    return { data: { status: 'Pending', currentApproverId: nextId, approvalHistory: history }, finalized: false };
}

// ── notification helpers ───────────────────────────────────────────────────

async function notifyApprover({ kind, requesterName, summary, approver, org }) {
    const label = KIND_LABEL[kind] || 'Request';
    if (approver.id) {
        await createNotification({
            type: kind,
            title: `${label} request awaiting your approval`,
            message: `${requesterName} submitted ${summary}. It needs your approval.`,
            recipientIds: [approver.id],
            recipientRole: 'user',
            link: APPROVALS_LINK,
        }).catch((e) => console.error('[approval] notifyApprover in-app error:', e));
    }
    if (approver.email) {
        sendApprovalPendingEmail({
            approverEmail: approver.email,
            approverName: approver.name,
            requesterName,
            kind,
            summary,
            org,
        }).catch((e) => console.error('[approval] notifyApprover email error:', e));
    }
}

async function notifyAdminPool({ kind, requesterName, summary, organizationId, org, prisma }) {
    if (!organizationId) return;
    const label = KIND_LABEL[kind] || 'Request';
    const admins = await prisma.employee.findMany({
        where: { organizationId: Number(organizationId), role: 'admin' },
        select: { id: true, email: true, name: true },
    });
    const adminIds = admins.map((a) => a.id).filter(Boolean);
    if (adminIds.length > 0) {
        await createNotification({
            type: kind,
            title: `${label} request awaiting final approval`,
            message: `${requesterName} submitted ${summary}. It has reached the admin level for final approval.`,
            recipientIds: adminIds,
            recipientRole: 'admin',
            link: APPROVALS_LINK,
        }).catch((e) => console.error('[approval] notifyAdminPool in-app error:', e));
    }
    const emails = Array.from(new Set(
        [...admins.map((a) => a.email), org?.admin].filter(Boolean).map((e) => String(e).trim().toLowerCase())
    ));
    for (const email of emails) {
        sendApprovalPendingEmail({
            approverEmail: email,
            approverName: null,
            requesterName,
            kind,
            summary,
            org,
            finalStage: true,
        }).catch((e) => console.error('[approval] notifyAdminPool email error:', e));
    }
}

async function notifyRequesterDecision({ kind, requester, decision, prisma }) {
    if (!requester?.id) return;
    const label = KIND_LABEL[kind] || 'Request';
    await createNotification({
        type: kind,
        title: `${label} request ${decision}`,
        message: `Your ${label.toLowerCase()} request has been ${decision.toLowerCase()}.`,
        recipientIds: [requester.id],
        recipientRole: 'user',
        link: REQUESTER_LINK[kind] || '/user',
    }).catch((e) => console.error('[approval] notifyRequesterDecision in-app error:', e));
}

// Convenience: build the one-line human summary used in notifications/emails.
export function buildSummary(kind, request) {
    if (kind === 'leave') {
        const s = request.startDate ? new Date(request.startDate).toLocaleDateString('en-GB') : '';
        const e = request.endDate ? new Date(request.endDate).toLocaleDateString('en-GB') : '';
        return `a ${request.type || ''} leave request (${s} – ${e})`.replace(/\s+/g, ' ').trim();
    }
    if (kind === 'expense') {
        return `an expense claim of ₹${Number(request.totalAmount || 0).toLocaleString()}`;
    }
    return `a fund request of ₹${Number(request.amount || 0).toLocaleString()}`;
}
