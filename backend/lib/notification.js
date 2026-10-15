import prisma from './prisma.js';

/**
 * Create a notification for specific users or all users with a role
 * @param {Object} params
 * @param {string} params.type - Notification type (e.g., "custom_plan_request")
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {number[]} [params.recipientIds] - Specific user IDs to notify (optional)
 * @param {string} [params.recipientRole] - Role to notify (e.g., "super-admin")
 * @param {string} [params.link] - Optional navigation link
 * @param {number} [params.customPlanRequestId] - Related custom plan request ID
 * @returns {Promise<Array>} Created notifications
 */
export async function createNotification({
  type,
  title,
  message,
  recipientIds,
  recipientRole,
  link,
  customPlanRequestId
}) {
  try {
    const notifications = [];

    // If specific recipient IDs are provided, create notifications for them
    if (recipientIds && recipientIds.length > 0) {
      for (const recipientId of recipientIds) {
        const notification = await prisma.notification.create({
          data: {
            type,
            title,
            message,
            recipientId,
            recipientRole: recipientRole || 'user',
            link: link || null,
            customPlanRequestId: customPlanRequestId || null
          }
        });
        notifications.push(notification);
      }
    } 
    // If recipientRole is provided, create notifications for all users with that role
    else if (recipientRole) {
      const recipients = await prisma.employee.findMany({
        where: { role: recipientRole },
        select: { id: true }
      });

      for (const recipient of recipients) {
        const notification = await prisma.notification.create({
          data: {
            type,
            title,
            message,
            recipientId: recipient.id,
            recipientRole,
            link: link || null,
            customPlanRequestId: customPlanRequestId || null
          }
        });
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a specific user
 * @param {number} userId - User ID
 * @param {boolean} [includeRead=false] - Include read notifications
 * @returns {Promise<Array>} User's notifications
 */
export async function getUserNotifications(userId, includeRead = false) {
  try {
    const where = {
      recipientId: userId,
      ...(includeRead ? {} : { isRead: false })
    };

    return await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param {number} notificationId - Notification ID
 * @param {number} userId - User ID (for verification)
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationRead(notificationId, userId) {
  try {
    return await prisma.notification.update({
      where: {
        id: notificationId,
        recipientId: userId
      },
      data: {
        isRead: true
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount(userId) {
  try {
    return await prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}
