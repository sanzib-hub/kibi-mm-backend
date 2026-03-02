const { google } = require('googleapis');
const prisma = require('../lib/prismaClient');
const config = require('../config');
const { normalizeSport, normalizeCityState } = require('./normalization');

const SHEET_TABS = {
  athletes: 'INVENTORY_ATHLETES',
  leagues:  'INVENTORY_LEAGUES',
  venues:   'INVENTORY_VENUES',
};

async function runEtl() {
  if (!config.googleSheetsId || !config.googleServiceAccountJson) {
    console.log('[ETL] Google Sheets not configured. Skipping ETL run.');
    return;
  }

  console.log('[ETL] Starting Google Sheets sync...');

  let credentials;
  try {
    credentials = JSON.parse(config.googleServiceAccountJson);
  } catch {
    console.error('[ETL] Invalid GOOGLE_SERVICE_ACCOUNT_JSON. Cannot parse.');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  await Promise.all([
    syncAthletes(sheets).catch(e => console.error('[ETL] Athletes sync failed:', e.message)),
    syncLeagues(sheets).catch(e => console.error('[ETL] Leagues sync failed:', e.message)),
    syncVenues(sheets).catch(e => console.error('[ETL] Venues sync failed:', e.message)),
  ]);

  console.log('[ETL] Sync complete.');
}

// Expected columns: Name, Sport, City, State, Tier, Bio, ImageUrl, SocialFollowers, Featured [, IncompatibleCategories]
async function syncAthletes(sheets) {
  const rows = await getSheetRows(sheets, SHEET_TABS.athletes);
  let upserted = 0, skipped = 0;

  for (const row of rows) {
    const [name, sport, city, state, tier, bio, imageUrl, followers, featured, incompatRaw] = row;
    if (!name || !sport || !city || !state) { skipped++; continue; }

    const normSport = normalizeSport(sport);
    const { normCity, normState } = normalizeCityState(city, state);
    const incompat = parseIncompatibleCategories(incompatRaw);

    await prisma.athlete.upsert({
      where: { name_city_state_sport: { name, city: normCity, state: normState, sport: normSport } },
      update: {
        tier: (tier || 'local').toLowerCase(),
        bio: bio || null,
        imageUrl: imageUrl || null,
        socialFollowers: parseInt(followers) || null,
        featuredFlag: (featured || '').toLowerCase() === 'true',
        incompatibleCategories: incompat,
        updatedAt: new Date(),
      },
      create: {
        name, sport: normSport, city: normCity, state: normState,
        tier: (tier || 'local').toLowerCase(),
        bio: bio || null,
        imageUrl: imageUrl || null,
        socialFollowers: parseInt(followers) || null,
        featuredFlag: (featured || '').toLowerCase() === 'true',
        incompatibleCategories: incompat,
        status: 'active',
        sourceSheet: SHEET_TABS.athletes,
      },
    });
    upserted++;
  }
  console.log(`[ETL] Athletes: ${upserted} upserted, ${skipped} skipped`);
}

// Expected columns: Name, Sport, City, State, Season, Level, Featured, LogoUrl [, IncompatibleCategories]
async function syncLeagues(sheets) {
  const rows = await getSheetRows(sheets, SHEET_TABS.leagues);
  let upserted = 0, skipped = 0;

  for (const row of rows) {
    const [name, sport, city, state, season, level, featured, logoUrl, incompatRaw] = row;
    if (!name || !sport || !city || !state) { skipped++; continue; }

    const normSport = normalizeSport(sport);
    const { normCity, normState } = normalizeCityState(city, state);
    const incompat = parseIncompatibleCategories(incompatRaw);

    await prisma.league.upsert({
      where: { name_city_state_sport: { name, city: normCity, state: normState, sport: normSport } },
      update: {
        season: season || null,
        level: (level || '').toLowerCase() || null,
        featuredFlag: (featured || '').toLowerCase() === 'true',
        logoUrl: logoUrl || null,
        incompatibleCategories: incompat,
        updatedAt: new Date(),
      },
      create: {
        name, sport: normSport, city: normCity, state: normState,
        season: season || null,
        level: (level || '').toLowerCase() || null,
        featuredFlag: (featured || '').toLowerCase() === 'true',
        logoUrl: logoUrl || null,
        incompatibleCategories: incompat,
        status: 'active',
        sourceSheet: SHEET_TABS.leagues,
      },
    });
    upserted++;
  }
  console.log(`[ETL] Leagues: ${upserted} upserted, ${skipped} skipped`);
}

// Expected columns: Name, Type, City, State, SportsSupported, Capacity, Featured, ImageUrl [, IncompatibleCategories]
async function syncVenues(sheets) {
  const rows = await getSheetRows(sheets, SHEET_TABS.venues);
  let upserted = 0, skipped = 0;

  for (const row of rows) {
    const [name, type, city, state, sports, capacity, featured, imageUrl, incompatRaw] = row;
    if (!name || !city || !state) { skipped++; continue; }

    const { normCity, normState } = normalizeCityState(city, state);
    const sportsArr = (sports || '').split(',')
      .map(s => normalizeSport(s.trim()))
      .filter(Boolean);
    const incompat = parseIncompatibleCategories(incompatRaw);

    await prisma.venue.upsert({
      where: { name_city_state: { name, city: normCity, state: normState } },
      update: {
        type: (type || 'venue').toLowerCase(),
        sportsSupported: JSON.stringify(sportsArr),
        capacity: parseInt(capacity) || null,
        featuredFlag: (featured || '').toLowerCase() === 'true',
        imageUrl: imageUrl || null,
        incompatibleCategories: incompat,
        updatedAt: new Date(),
      },
      create: {
        name, city: normCity, state: normState,
        type: (type || 'venue').toLowerCase(),
        sportsSupported: JSON.stringify(sportsArr),
        capacity: parseInt(capacity) || null,
        featuredFlag: (featured || '').toLowerCase() === 'true',
        imageUrl: imageUrl || null,
        incompatibleCategories: incompat,
        status: 'active',
        sourceSheet: SHEET_TABS.venues,
      },
    });
    upserted++;
  }
  console.log(`[ETL] Venues: ${upserted} upserted, ${skipped} skipped`);
}

function parseIncompatibleCategories(val) {
  if (!val || typeof val !== 'string') return null;
  const arr = val.split(/[,;]/).map(s => s.trim().toUpperCase()).filter(Boolean);
  return arr.length ? JSON.stringify(arr) : null;
}

async function getSheetRows(sheets, tabName) {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheetsId,
    range: `${tabName}!A2:Z`,
  });
  return resp.data.values || [];
}

module.exports = { runEtl };
