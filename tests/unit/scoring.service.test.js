const { computeScore } = require('../../src/services/scoring.service');

describe('scoring.service computeScore', () => {
  it('returns higher score for exact sport + city match', () => {
    const asset = {
      _type: 'athlete',
      sport: 'cricket',
      city: 'Mumbai',
      state: 'Maharashtra',
    };
    const brief = {
      sports: ['cricket'],
      targetCities: ['mumbai'],
      campaignObjective: 'AWARENESS',
    };
    const result = computeScore(asset, brief);
    expect(result.score).toBeGreaterThan(80);
    expect(result.breakdown.sportScore).toBe(1);
    expect(result.breakdown.geoScore).toBe(1);
  });

  it('returns lower score when sport does not match', () => {
    const asset = {
      _type: 'athlete',
      sport: 'football',
      city: 'Mumbai',
      state: 'Maharashtra',
    };
    const brief = {
      sports: ['cricket'],
      targetCities: ['mumbai'],
      campaignObjective: 'AWARENESS',
    };
    const result = computeScore(asset, brief);
    expect(result.breakdown.sportScore).toBe(0);
    expect(result.score).toBeLessThanOrEqual(55);
  });

  it('returns partial geo score when no target cities/states in brief', () => {
    const asset = {
      _type: 'league',
      sport: 'cricket',
      city: 'Delhi',
      state: 'Delhi',
    };
    const brief = {
      sports: ['cricket'],
      targetCities: [],
      targetStates: [],
      campaignObjective: 'COMMUNITY',
    };
    const result = computeScore(asset, brief);
    expect(result.breakdown.geoScore).toBe(0.5);
  });

  it('applies penalty when relaxCity is used', () => {
    const asset = {
      _type: 'athlete',
      sport: 'cricket',
      city: 'Pune',
      state: 'Maharashtra',
    };
    const brief = {
      sports: ['cricket'],
      targetCities: ['mumbai'],
      targetStates: ['Maharashtra'],
      campaignObjective: 'AWARENESS',
    };
    const relaxed = computeScore(asset, brief, { relaxCity: true });
    expect(relaxed.breakdown.penalty).toBeGreaterThan(0);
  });
});
