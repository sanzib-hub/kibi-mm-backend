const prisma = require('./src/lib/prismaClient');

afterAll(async () => {
  await prisma.$disconnect();
});
