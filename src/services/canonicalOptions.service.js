/**
 * Returns distinct sports, cities, states from inventory (athletes, leagues, venues).
 * Used by brief form to ensure options align with actual data.
 */
const prisma = require('../lib/prismaClient');

async function getCanonicalOptions() {
  const [athletes, leagues, venues] = await Promise.all([
    prisma.athlete.findMany({ where: { status: 'active' }, select: { sport: true, city: true, state: true } }),
    prisma.league.findMany({ where: { status: 'active' }, select: { sport: true, city: true, state: true } }),
    prisma.venue.findMany({ where: { status: 'active' }, select: { city: true, state: true, sportsSupported: true } }),
  ]);

  const sportsSet = new Set();
  const citiesSet = new Set();
  const statesSet = new Set();

  for (const a of athletes) {
    if (a.sport) sportsSet.add(a.sport);
    if (a.city) citiesSet.add(a.city);
    if (a.state) statesSet.add(a.state);
  }
  for (const l of leagues) {
    if (l.sport) sportsSet.add(l.sport);
    if (l.city) citiesSet.add(l.city);
    if (l.state) statesSet.add(l.state);
  }
  for (const v of venues) {
    if (v.city) citiesSet.add(v.city);
    if (v.state) statesSet.add(v.state);
    if (v.sportsSupported) {
      try {
        const arr = JSON.parse(v.sportsSupported);
        if (Array.isArray(arr)) arr.forEach((s) => s && sportsSet.add(s));
        else if (typeof arr === 'string') sportsSet.add(arr);
      } catch {
        (String(v.sportsSupported).split(/[,;]/) || []).forEach((s) => s.trim() && sportsSet.add(s.trim()));
      }
    }
  }

  const sports = [...sportsSet].filter(Boolean).sort();
  const cities = [...citiesSet].filter(Boolean).sort();
  const states = [...statesSet].filter(Boolean).sort();

  return { sports, cities, states };
}

module.exports = { getCanonicalOptions };
