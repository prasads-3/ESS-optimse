import prisma from '../../../lib/prisma.js';

export async function POST(req, res) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin only' });
  }

  try {
    const { payslipConfig } = req.body;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID not found in session' });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        payslipConfig: payslipConfig
      }
    });

    return res.status(200).json({ 
      message: 'Payslip configuration updated successfully',
      payslipConfig: updatedOrg.payslipConfig 
    });
  } catch (error) {
    console.error('[Payslip Config Update Error]', error);
    return res.status(500).json({ error: 'Failed to update payslip configuration' });
  }
}

export async function GET(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID not found in session' });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { payslipConfig: true }
    });

    return res.status(200).json(org.payslipConfig || {});
  } catch (error) {
    console.error('[Payslip Config GET Error]', error);
    return res.status(500).json({ error: 'Failed to fetch payslip configuration' });
  }
}
