import prisma from '../../../lib/prisma.js';

// The Notification table may not exist yet (migration not applied),
// or the Prisma client could be out of sync. In those cases we want the
// polling UI to keep working rather than flood the console with 500s.
const isMissingTableError = (error) => {
  if (!error) return false;
  if (error.code === 'P2021' || error.code === 'P2022') return true;
  const msg = error.message || '';
  return /does not exist|relation .* does not exist|Unknown arg|Invalid .* invocation/i.test(msg);
};

const numericUserId = (rawId) => {
  const n = parseInt(rawId, 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * GET /api/super-admin/notifications
 * Fetch notifications for super admin with pagination and filtering
 */
export async function GET(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const { page = 1, limit = 20, type, isRead } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const userIdNum = numericUserId(req.user.id);
    const recipientIdFilter = userIdNum !== null ? { recipientId: userIdNum } : {};

    const where = {
      recipientRole: 'super-admin',
      ...recipientIdFilter,
      ...(type ? { type } : {}),
      ...(isRead !== undefined ? { isRead: isRead === 'true' } : {})
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          customPlanRequest: {
            select: {
              id: true,
              organization: {
                select: { name: true }
              },
              status: true
            }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('[Super Admin Notifications] Notification table missing — returning empty. Run `npx prisma migrate deploy`.');
      return res.json({ notifications: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }
    console.error('[Super Admin Notifications Error]', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * PATCH /api/super-admin/notifications/:id
 * Mark a notification as read
 */
export async function PATCH(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const { id } = req.params;
    const userIdNum = numericUserId(req.user.id);

    const notification = await prisma.notification.update({
      where: {
        id: parseInt(id),
        ...(userIdNum !== null ? { recipientId: userIdNum } : {})
      },
      data: {
        isRead: true
      }
    });

    res.json(notification);
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('[Super Admin Notifications] Notification table missing — skipping update.');
      return res.json({ success: false, skipped: true });
    }
    console.error('[Super Admin Notifications Error]', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
}

/**
 * POST /api/super-admin/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function POST(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const userIdNum = numericUserId(req.user.id);
    await prisma.notification.updateMany({
      where: {
        ...(userIdNum !== null ? { recipientId: userIdNum } : {}),
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('[Super Admin Notifications] Notification table missing — nothing to mark.');
      return res.json({ success: true, message: 'No notifications to mark' });
    }
    console.error('[Super Admin Notifications Error]', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
}

/**
 * GET /api/super-admin/notifications/unread-count
 * Get unread notification count
 */
export async function GET_UNREAD_COUNT(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }

  try {
    const userIdNum = numericUserId(req.user.id);
    const count = await prisma.notification.count({
      where: {
        ...(userIdNum !== null ? { recipientId: userIdNum } : {}),
        recipientRole: 'super-admin',
        isRead: false
      }
    });

    res.json({ unreadCount: count });
  } catch (error) {
    // Degrade gracefully rather than 500'ing the UI polling loop on every tick.
    if (isMissingTableError(error)) {
      console.warn('[Super Admin Notifications] Notification table missing — returning 0. Run `npx prisma migrate deploy`.');
      return res.json({ unreadCount: 0 });
    }
    console.error('[Super Admin Notifications Error]', error);
    return res.json({ unreadCount: 0 });
  }
}
