import prisma from '../lib/prisma.js';

try {
  // Check Employee columns
  const empCols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Employee' ORDER BY column_name`
  );
  console.log('Employee columns:', empCols.map(r => r.column_name).join(', '));

  // Check Organization columns
  const orgCols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Organization' ORDER BY column_name`
  );
  console.log('Organization columns:', orgCols.map(r => r.column_name).join(', '));

  // Check if organizationId exists
  const hasOrgId = empCols.some(r => r.column_name === 'organizationId');
  console.log('\nEmployee.organizationId exists in DB:', hasOrgId);

  const hasAddress = orgCols.some(r => r.column_name === 'address');
  console.log('Organization.address exists in DB:', hasAddress);

} catch (e) {
  console.error('Error:', e.message, e.code);
} finally {
  await prisma.$disconnect();
}
