const request = require('supertest');
const app = require('../../src/app');

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

describe('GET /admin/leads', () => {
  it('returns leads list with admin key', async () => {
    const res = await request(app)
      .get('/admin/leads')
      .set('X-Admin-Key', ADMIN_KEY);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 401 without admin key', async () => {
    const res = await request(app).get('/admin/leads');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid admin key', async () => {
    const res = await request(app)
      .get('/admin/leads')
      .set('X-Admin-Key', 'wrong-key');
    expect(res.status).toBe(401);
  });
});
