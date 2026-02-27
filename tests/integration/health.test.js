const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  it('returns 200 with ok: true when DB is reachable', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: 'kibi-backend',
      db: 'ok',
    });
    expect(res.body.timestamp).toBeDefined();
  });
});
