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

  // ─── Athletes ─────────────────────────────────────────────────────────────
  const athletes = [
    { name: 'Marcus Johnson', sport: 'basketball', city: 'Chicago', state: 'Illinois', tier: 'regional', featuredFlag: true, bio: 'Point guard, 50k followers', socialFollowers: 50000 },
    { name: 'Sofia Rivera', sport: 'soccer', city: 'Los Angeles', state: 'California', tier: 'national', featuredFlag: true, bio: 'Forward, US Youth National Team', socialFollowers: 120000 },
    { name: 'Tyler Brooks', sport: 'football', city: 'Houston', state: 'Texas', tier: 'local', featuredFlag: false, bio: 'High school QB, rising star', socialFollowers: 8000 },
    { name: 'Aisha Washington', sport: 'track and field', city: 'Atlanta', state: 'Georgia', tier: 'regional', featuredFlag: false, bio: '100m specialist', socialFollowers: 22000 },
    { name: 'Jake Nguyen', sport: 'baseball', city: 'New York', state: 'New York', tier: 'local', featuredFlag: false, bio: 'AAA pitcher', socialFollowers: 5000 },
    { name: 'Elena Vasquez', sport: 'volleyball', city: 'Miami', state: 'Florida', tier: 'regional', featuredFlag: true, bio: 'Beach volleyball pro', socialFollowers: 35000 },
    { name: 'Darius King', sport: 'basketball', city: 'Los Angeles', state: 'California', tier: 'national', featuredFlag: true, bio: 'G-League standout', socialFollowers: 200000 },
    { name: 'Priya Patel', sport: 'tennis', city: 'Chicago', state: 'Illinois', tier: 'regional', featuredFlag: false, bio: 'ITF ranked player', socialFollowers: 18000 },
    { name: 'Carlos Mendez', sport: 'soccer', city: 'Houston', state: 'Texas', tier: 'local', featuredFlag: false, bio: 'Amateur league star', socialFollowers: 3500 },
    { name: 'Zoe Campbell', sport: 'swimming', city: 'Phoenix', state: 'Arizona', tier: 'regional', featuredFlag: true, bio: 'State champion swimmer', socialFollowers: 14000 },
  ];

  for (const a of athletes) {
    await prisma.athlete.upsert({
      where: { name_city_state_sport: { name: a.name, city: a.city, state: a.state, sport: a.sport } },
      update: a,
      create: { ...a, status: 'active' },
    });
  }
  console.log(`✓ ${athletes.length} athletes seeded`);

  // ─── Leagues ──────────────────────────────────────────────────────────────
  const leagues = [
    { name: 'Chicago Amateur Basketball League', sport: 'basketball', city: 'Chicago', state: 'Illinois', season: 'Fall/Winter', level: 'amateur', featuredFlag: true },
    { name: 'LA Soccer Premier League', sport: 'soccer', city: 'Los Angeles', state: 'California', season: 'Year-round', level: 'semi-pro', featuredFlag: true },
    { name: 'Texas Youth Football Conference', sport: 'football', city: 'Houston', state: 'Texas', season: 'Fall', level: 'amateur', featuredFlag: false },
    { name: 'Southeast Track Series', sport: 'track and field', city: 'Atlanta', state: 'Georgia', season: 'Spring/Summer', level: 'amateur', featuredFlag: false },
    { name: 'NYC Metro Baseball League', sport: 'baseball', city: 'New York', state: 'New York', season: 'Spring/Summer', level: 'semi-pro', featuredFlag: true },
    { name: 'Miami Beach Volleyball Tour', sport: 'volleyball', city: 'Miami', state: 'Florida', season: 'Year-round', level: 'semi-pro', featuredFlag: true },
    { name: 'Phoenix Swim Series', sport: 'swimming', city: 'Phoenix', state: 'Arizona', season: 'Winter/Spring', level: 'amateur', featuredFlag: false },
    { name: 'Windy City Tennis Open', sport: 'tennis', city: 'Chicago', state: 'Illinois', season: 'Summer', level: 'amateur', featuredFlag: false },
    { name: 'SoCal Indoor Soccer League', sport: 'soccer', city: 'Los Angeles', state: 'California', season: 'Year-round', level: 'amateur', featuredFlag: false },
    { name: 'Houston Flag Football League', sport: 'flag football', city: 'Houston', state: 'Texas', season: 'Fall', level: 'amateur', featuredFlag: false },
  ];

  for (const l of leagues) {
    await prisma.league.upsert({
      where: { name_city_state_sport: { name: l.name, city: l.city, state: l.state, sport: l.sport } },
      update: l,
      create: { ...l, status: 'active' },
    });
  }
  console.log(`✓ ${leagues.length} leagues seeded`);

  // ─── Venues ───────────────────────────────────────────────────────────────
  const venues = [
    { name: 'United Center', type: 'arena', city: 'Chicago', state: 'Illinois', sportsSupported: JSON.stringify(['basketball', 'hockey']), capacity: 20000, featuredFlag: true },
    { name: 'SoFi Stadium', type: 'stadium', city: 'Los Angeles', state: 'California', sportsSupported: JSON.stringify(['football', 'soccer']), capacity: 70000, featuredFlag: true },
    { name: 'NRG Stadium', type: 'stadium', city: 'Houston', state: 'Texas', sportsSupported: JSON.stringify(['football', 'soccer']), capacity: 71000, featuredFlag: true },
    { name: 'State Farm Arena', type: 'arena', city: 'Atlanta', state: 'Georgia', sportsSupported: JSON.stringify(['basketball']), capacity: 21000, featuredFlag: false },
    { name: 'Yankee Stadium', type: 'stadium', city: 'New York', state: 'New York', sportsSupported: JSON.stringify(['baseball', 'soccer']), capacity: 54000, featuredFlag: true },
    { name: 'Hard Rock Stadium', type: 'stadium', city: 'Miami', state: 'Florida', sportsSupported: JSON.stringify(['football', 'soccer', 'volleyball']), capacity: 65000, featuredFlag: true },
    { name: 'Chicago Sports Complex', type: 'complex', city: 'Chicago', state: 'Illinois', sportsSupported: JSON.stringify(['basketball', 'volleyball', 'tennis', 'badminton']), capacity: 5000, featuredFlag: false },
    { name: 'LA Fitness Sports Club', type: 'gym', city: 'Los Angeles', state: 'California', sportsSupported: JSON.stringify(['basketball', 'swimming', 'fitness']), capacity: 500, featuredFlag: false },
    { name: 'Phoenix Aquatic Center', type: 'complex', city: 'Phoenix', state: 'Arizona', sportsSupported: JSON.stringify(['swimming', 'diving', 'water polo']), capacity: 3000, featuredFlag: true },
    { name: 'Miami Beach Volleyball Courts', type: 'field', city: 'Miami', state: 'Florida', sportsSupported: JSON.stringify(['volleyball', 'beach soccer']), capacity: 2000, featuredFlag: false },
  ];

  for (const v of venues) {
    await prisma.venue.upsert({
      where: { name_city_state: { name: v.name, city: v.city, state: v.state } },
      update: v,
      create: { ...v, status: 'active' },
    });
  }
  console.log(`✓ ${venues.length} venues seeded`);

  console.log('\nSeed complete!');
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
