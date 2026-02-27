const request = require('supertest');
const app = require('../../src/app');

describe('POST /auth/register', () => {
  it('creates a new brand account and returns token', async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/auth/register')
      .send({
        email,
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        company: 'Test Co',
        industry: 'D2C',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('account');
    expect(res.body.data.account.company).toBe('Test Co');
  });
});

describe('POST /auth/login', () => {
  const email = `login-${Date.now()}@example.com`;

  beforeAll(async () => {
    await request(app).post('/auth/register').send({
      email,
      password: 'LoginPass123!',
      firstName: 'Login',
      lastName: 'Test',
      company: 'Login Co',
      industry: 'FMCG',
    });
  });

  it('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'LoginPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('account');
  });

  it('returns 401 for invalid password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });
});
