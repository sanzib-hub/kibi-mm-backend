const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ─── Brand Account + User ─────────────────────────────────────────────────
  const account = await prisma.brandAccount.upsert({
    where: { id: 1 },
    update: {},
    create: {
      company: 'Demo Brand Co.',
      industry: 'Consumer Goods',
      website: 'https://demobrand.com',
    },
  });

  await prisma.brandUser.upsert({
    where: { email: 'demo@demobrand.com' },
    update: {},
    create: {
      brandAccountId: account.id,
      email: 'demo@demobrand.com',
      passwordHash: await bcrypt.hash('Password123!', 10),
      firstName: 'Demo',
      lastName: 'User',
      role: 'owner',
    },
  });

  console.log('✓ Brand account and user created');
  console.log('\nSeed complete. Use Excel ETL or Google Sheets ETL to import inventory.');
  console.log('Login with: demo@demobrand.com / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
