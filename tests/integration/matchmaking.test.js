const request = require('supertest');
const app = require('../../src/app');

let authToken;
let briefId;

beforeAll(async () => {
  const email = `match-${Date.now()}@example.com`;
  const reg = await request(app).post('/auth/register').send({
    email,
    password: 'MatchTest123!',
    company: 'Match Test Co',
  });
  authToken = reg.body.data.token;

  const brief = await request(app)
    .post('/sponsorship/briefs')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      campaignName: 'Match Test Campaign',
      sports: ['cricket'],
      targetCities: ['Mumbai'],
      campaignObjective: 'AWARENESS',
      contactPhone: '+919876543210',
    });
  briefId = brief.body.data.id;
});

describe('POST /matchmaking/v1/recommendations', () => {
  it('returns match results for a valid brief', async () => {
    const res = await request(app)
      .post('/matchmaking/v1/recommendations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ brief_id: briefId });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      athletes: expect.any(Array),
      leagues: expect.any(Array),
      venues: expect.any(Array),
    });
    expect(res.body.data.total_matched).toBeDefined();
  });

  it('accepts optional limits', async () => {
    const res = await request(app)
      .post('/matchmaking/v1/recommendations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        brief_id: briefId,
        limits: { athletes: 5, leagues: 3, venues: 3 },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.athletes.length).toBeLessThanOrEqual(5);
  });

  it('returns 400 when brief_id is missing', async () => {
    const res = await request(app)
      .post('/matchmaking/v1/recommendations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/matchmaking/v1/recommendations')
      .send({ brief_id: briefId });
    expect(res.status).toBe(401);
  });
});
