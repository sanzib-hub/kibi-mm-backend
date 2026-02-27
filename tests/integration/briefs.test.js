const request = require('supertest');
const app = require('../../src/app');

let authToken;
let briefId;

describe('GET /sponsorship/briefs/canonical-options', () => {
  beforeAll(async () => {
    const email = `canon-${Date.now()}@example.com`;
    const reg = await request(app).post('/auth/register').send({
      email,
      password: 'CanonTest123!',
      company: 'Canon Test Co',
    });
    authToken = reg.body.data.token;
  });

  it('returns sports, cities, states from inventory', async () => {
    const res = await request(app)
      .get('/sponsorship/briefs/canonical-options')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('sports');
    expect(res.body.data).toHaveProperty('cities');
    expect(res.body.data).toHaveProperty('states');
    expect(Array.isArray(res.body.data.sports)).toBe(true);
    expect(Array.isArray(res.body.data.cities)).toBe(true);
    expect(Array.isArray(res.body.data.states)).toBe(true);
  });
});

describe('POST /sponsorship/briefs', () => {
  beforeAll(async () => {
    const email = `brief-test-${Date.now()}@example.com`;
    const reg = await request(app).post('/auth/register').send({
      email,
      password: 'BriefTest123!',
      firstName: 'Brief',
      lastName: 'Tester',
      company: 'Brief Test Co',
    });
    authToken = reg.body.data.token;
  });
  it('creates a brief and returns id + leadId', async () => {
    const res = await request(app)
      .post('/sponsorship/briefs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        campaignName: 'Test Campaign 2026',
        sports: ['cricket'],
        campaignObjective: 'AWARENESS',
        contactPhone: '+919876543210',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('leadId');
    expect(res.body.data.status).toBe('SUBMITTED');
    briefId = res.body.data.id;
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/sponsorship/briefs')
      .send({ campaignName: 'Test', sports: ['cricket'] });
    expect(res.status).toBe(401);
  });
});

describe('GET /sponsorship/briefs/:id', () => {
  it('returns the brief for the owner', async () => {
    const res = await request(app)
      .get(`/sponsorship/briefs/${briefId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.campaignName).toBe('Test Campaign 2026');
    expect(res.body.data.sports).toContain('cricket');
  });
});

describe('GET /sponsorship/briefs/:id/results', () => {
  it('returns results (possibly empty) for the owner', async () => {
    const res = await request(app)
      .get(`/sponsorship/briefs/${briefId}/results`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.athletes)).toBe(true);
  });
});
