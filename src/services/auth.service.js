const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prismaClient');
const config = require('../config');

async function register({ company, email, password, firstName, lastName }) {
  const existing = await prisma.brandUser.findUnique({ where: { email } });
  if (existing) throw new Error('DUPLICATE_EMAIL');

  const account = await prisma.brandAccount.create({
    data: { company, industry: null, website: null },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.brandUser.create({
    data: {
      brandAccountId: account.id,
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'owner',
    },
  });

  const token = generateToken(user, account.id);
  return { token, user: safeUser(user), account: { id: account.id, company: account.company } };
}

async function login({ email, password }) {
  const user = await prisma.brandUser.findUnique({
    where: { email },
    include: { brandAccount: true },
  });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const token = generateToken(user, user.brandAccountId);
  return { token, user: safeUser(user), account: { id: user.brandAccount.id, company: user.brandAccount.company } };
}

function generateToken(user, brandAccountId) {
  return jwt.sign(
    { id: user.id, brandAccountId, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    brandAccountId: user.brandAccountId,
  };
}

module.exports = { register, login };
