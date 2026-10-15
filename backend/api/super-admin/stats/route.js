import prisma from '../../../lib/prisma.js';

export async function GET(req, res) {
  if (!req.user || req.user.role !== 'super-admin') {
    return res.status(403).json({ error: 'Access Denied: Super Admin only' });
  }
  try {
    // Run all DB queries in parallel to eliminate sequential round-trips
    const [totalOrgs, activeSubs, orgs, planDistribution, expiredCount] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'Active' } }),
      prisma.organization.findMany({ select: { limit: true, used: true } }),
      prisma.organization.groupBy({ by: ['plan'], _count: { id: true } }),
      prisma.organization.count({ where: { status: 'Expired' } }),
    ]);

    const allocated = orgs.reduce((acc, org) => acc + org.limit, 0);
    const used = orgs.reduce((acc, org) => acc + org.used, 0);
    const utilization = allocated > 0 ? (used / allocated) * 100 : 0;

    // Mock trend data for now as we don't have historical records in schema
    const allocationTrend = [45, 52, 48, 61, 68, 72, 85]; // Last 7 months
    
    res.json({
      stats: {
        totalOrgs,
        activeSubs,
        allocated,
        utilization: utilization.toFixed(1) + '%',
        growth: {
          totalOrgs: '+8%',
          activeSubs: '+5%',
          allocated: '+12%',
          utilization: '+2%'
        }
      },
      planDistribution: planDistribution.map(p => ({
        label: p.plan,
        count: p._count.id,
        color: p.plan === 'Premium' ? 'bg-purple-500' : p.plan === 'Standard' ? 'bg-blue-500' : 'bg-emerald-500'
      })).concat([{ label: 'Expired', count: expiredCount, color: 'bg-rose-500' }]),
      allocationTrend,
      summary: {
        total: allocated,
        used: used,
        free: allocated - used
      }
    });
  } catch (error) {
    console.error('[Super Admin Stats Error]', error);
    res.status(500).json({ error: 'Failed to fetch super admin stats' });
  }
}
