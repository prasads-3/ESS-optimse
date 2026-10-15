import prisma from '../../../lib/prisma.js';

export async function GET(req, res) {
  try {
    // Run both DB queries in parallel
    const [loginLogs, orgs] = await Promise.all([
      prisma.loginLog.findMany({
        take: 10,
        orderBy: { loginTime: 'desc' },
        include: {
          employee: {
            select: { name: true }
          }
        }
      }),
      prisma.organization.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { name: true, createdAt: true }
      })
    ]);

    const activities = [
      ...loginLogs.map(log => ({
        actor: log.employee?.name || log.email || 'Unknown',
        action: 'logged in',
        entity: 'System',
        time: formatTime(log.loginTime),
        type: 'up',
        color: 'bg-emerald-500/10 text-emerald-500'
      })),
      ...orgs.map(org => ({
        actor: 'System',
        action: 'onboarded',
        entity: org.name,
        time: formatTime(org.createdAt),
        type: 'plus',
        color: 'bg-blue-500/10 text-blue-500'
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    res.json(activities);
  } catch (error) {
    console.error('[Super Admin Activity Error]', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
}

function formatTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString();
}
