import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.loginLog.findMany({
        take: 5,
        orderBy: { loginTime: 'desc' },
        select: {
          id: true,
          email: true,
          loginTime: true,
          logoutTime: true,
          loginLat: true,
          logoutLat: true,
          logoutCity: true
        }
    });
    console.log(JSON.stringify(logs, null, 2));
    await prisma.$disconnect();
}

main().catch(console.error);
