/**
 * Excel CRM ETL — Import Athletes, Leagues, Venues from KIBI_Sponsorship_Master_CRM.xlsx
 *
 * Set EXCEL_CRM_PATH in .env or pass as argument.
 * Run: npm run etl:excel
 *
 * Optional column (Incompatible Categories): Add col L (Athletes), col K (Leagues), col M (Venues)
 * with values like "ALCOHOL,BETTING" to exclude assets from briefs that exclude those categories.
 */

const XLSX = require('xlsx');
const path = require('path');
const prisma = require('../lib/prismaClient');
const { normalizeSport, normalizeCityState } = require('./normalization');

const HEADER_ROW = 2; // Row index (0-based) where column headers are

// Column indices for INVENTORY_ATHLETES (row 2 = headers)
const ATHLETE_COLS = {
  name: 1,        // Athlete Name
  email: 2,       // Email
  sport: 3,       // Sport (Est.)
  status: 4,      // Status
  campaignActive: 5,
  notes: 6,
  igHandle: 7,
  igFollowers: 8,
  igCost: 9,
  phone: 10,
  incompatibleCategories: 11,  // Optional: ALCOHOL,BETTING etc.
};

// Column indices for INVENTORY_LEAGUES
const LEAGUE_COLS = {
  state: 0,       // State / UT
  sport: 1,       // Sport
  compType: 2,    // Competition Type
  name: 3,        // Competition / League Name
  organizer: 4,
  typicalWindow: 5,
  frequency: 6,
  footfall: 7,
  genderCategory: 8,
  venuesHostCities: 9,  // Usual Venues / Host Cities
  incompatibleCategories: 10,  // Optional
};

// Column indices for INVENTORY_VENUES
const VENUE_COLS = {
  venueId: 0,
  name: 1,
  sportType: 2,   // Sport / Type
  city: 3,
  state: 4,
  address: 5,
  capacity: 6,
  contactName: 7,
  contactPhone: 8,
  gpsLink: 9,
  notes: 10,
  dataSource: 11,
  incompatibleCategories: 12,  // Optional
};

function getDataRows(ws, headerRow = HEADER_ROW) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return rows.slice(headerRow + 1).filter(r => r && r.some(c => c !== '' && c !== '—'));
}

function safeInt(val) {
  if (val === '' || val == null) return null;
  const n = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function cell(row, col) {
  const v = row[col];
  return (v != null && String(v).trim() !== '' && String(v) !== '—') ? String(v).trim() : null;
}

function parseIncompatibleCategories(val) {
  if (!val) return null;
  const arr = String(val).split(/[,;]/).map(s => s.trim().toUpperCase()).filter(Boolean);
  return arr.length ? JSON.stringify(arr) : null;
}

async function syncAthletesFromExcel(rows) {
  let upserted = 0, skipped = 0;

  for (const row of rows) {
    const name = cell(row, ATHLETE_COLS.name);
    const sportRaw = cell(row, ATHLETE_COLS.sport);
    if (!name) { skipped++; continue; }

    // Athletes in CRM have no city/state — use Pan India default for matching
    const city = 'Pan India';
    const state = 'All States';
    const normSport = normalizeSport(sportRaw || 'general');
    const { normCity, normState } = normalizeCityState(city, state);

    const followers = safeInt(cell(row, ATHLETE_COLS.igFollowers));
    const tier = (cell(row, ATHLETE_COLS.status) || 'active').toLowerCase() === 'active' ? 'micro' : 'local';
    const incompat = parseIncompatibleCategories(cell(row, ATHLETE_COLS.incompatibleCategories));

    try {
      await prisma.athlete.upsert({
        where: { name_city_state_sport: { name, city: normCity, state: normState, sport: normSport } },
        update: {
          tier,
          bio: cell(row, ATHLETE_COLS.notes) || null,
          socialFollowers: followers,
          featuredFlag: (cell(row, ATHLETE_COLS.campaignActive) || '').toLowerCase() === 'yes',
          incompatibleCategories: incompat,
          updatedAt: new Date(),
        },
        create: {
          name,
          sport: normSport,
          city: normCity,
          state: normState,
          tier,
          bio: cell(row, ATHLETE_COLS.notes) || null,
          socialFollowers: followers,
          featuredFlag: (cell(row, ATHLETE_COLS.campaignActive) || '').toLowerCase() === 'yes',
          incompatibleCategories: incompat,
          status: 'active',
          sourceSheet: 'INVENTORY_ATHLETES',
          externalId: cell(row, ATHLETE_COLS.email) || null,
        },
      });
      upserted++;
    } catch (e) {
      skipped++;
      if (e.code !== 'P2002') console.warn('[Excel ETL] Athlete skip:', name, e.message);
    }
  }

  console.log(`[Excel ETL] Athletes: ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

async function syncLeaguesFromExcel(rows) {
  let upserted = 0, skipped = 0;

  for (const row of rows) {
    const name = cell(row, LEAGUE_COLS.name);
    const stateRaw = cell(row, LEAGUE_COLS.state);
    const sportRaw = cell(row, LEAGUE_COLS.sport);
    if (!name || !stateRaw) { skipped++; continue; }

    const normSport = normalizeSport(sportRaw || 'general');
    const { normCity, normState } = normalizeCityState(stateRaw, stateRaw);
    const incompat = parseIncompatibleCategories(cell(row, LEAGUE_COLS.incompatibleCategories));

    try {
      await prisma.league.upsert({
        where: { name_city_state_sport: { name, city: normCity, state: normState, sport: normSport } },
        update: {
          season: cell(row, LEAGUE_COLS.typicalWindow) || null,
          level: (cell(row, LEAGUE_COLS.compType) || '').toLowerCase().replace(/\s+/g, '_') || null,
          featuredFlag: false,
          incompatibleCategories: incompat,
          updatedAt: new Date(),
        },
        create: {
          name,
          sport: normSport,
          city: normCity,
          state: normState,
          season: cell(row, LEAGUE_COLS.typicalWindow) || null,
          level: (cell(row, LEAGUE_COLS.compType) || '').toLowerCase().replace(/\s+/g, '_') || null,
          featuredFlag: false,
          incompatibleCategories: incompat,
          status: 'active',
          sourceSheet: 'INVENTORY_LEAGUES',
        },
      });
      upserted++;
    } catch (e) {
      skipped++;
      if (e.code !== 'P2002') console.warn('[Excel ETL] League skip:', name, e.message);
    }
  }

  console.log(`[Excel ETL] Leagues: ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

async function syncVenuesFromExcel(rows) {
  let upserted = 0, skipped = 0;

  for (const row of rows) {
    const name = cell(row, VENUE_COLS.name);
    const cityRaw = cell(row, VENUE_COLS.city);
    const stateRaw = cell(row, VENUE_COLS.state);

    if (!name || !cityRaw || !stateRaw) { skipped++; continue; }
    if (name.includes('IMPORT PENDING') || name.includes('—')) { skipped++; continue; }

    const { normCity, normState } = normalizeCityState(cityRaw, stateRaw);
    const typeRaw = cell(row, VENUE_COLS.sportType) || 'venue';
    const type = typeRaw.toLowerCase().replace(/\s+/g, '_').slice(0, 50);
    const sportsStr = typeRaw;
    const sportsArr = sportsStr ? [normalizeSport(sportsStr.split(/[,/]/)[0] || 'general')] : [];
    const incompat = parseIncompatibleCategories(cell(row, VENUE_COLS.incompatibleCategories));

    try {
      await prisma.venue.upsert({
        where: { name_city_state: { name, city: normCity, state: normState } },
        update: {
          type,
          sportsSupported: JSON.stringify(sportsArr),
          capacity: safeInt(cell(row, VENUE_COLS.capacity)),
          incompatibleCategories: incompat,
          updatedAt: new Date(),
        },
        create: {
          name,
          city: normCity,
          state: normState,
          type,
          sportsSupported: JSON.stringify(sportsArr),
          capacity: safeInt(cell(row, VENUE_COLS.capacity)),
          incompatibleCategories: incompat,
          status: 'active',
          sourceSheet: 'INVENTORY_VENUES',
          externalId: cell(row, VENUE_COLS.venueId) || null,
        },
      });
      upserted++;
    } catch (e) {
      skipped++;
      if (e.code !== 'P2002') console.warn('[Excel ETL] Venue skip:', name, e.message);
    }
  }

  console.log(`[Excel ETL] Venues: ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

async function runExcelEtl(excelPath) {
  const resolved = path.resolve(
    excelPath ||
    process.env.EXCEL_CRM_PATH ||
    'c:\\Users\\lenovo\\OneDrive\\Desktop\\kibi-sponsorship\\KIBI_Sponsorship_Master_CRM.xlsx'
  );

  console.log('[Excel ETL] Reading:', resolved);

  const wb = XLSX.readFile(resolved);

  const athleteRows = wb.Sheets['INVENTORY_ATHLETES'] ? getDataRows(wb.Sheets['INVENTORY_ATHLETES']) : [];
  const leagueRows = wb.Sheets['INVENTORY_LEAGUES'] ? getDataRows(wb.Sheets['INVENTORY_LEAGUES']) : [];
  const venueRows = wb.Sheets['INVENTORY_VENUES'] ? getDataRows(wb.Sheets['INVENTORY_VENUES']) : [];

  console.log(`[Excel ETL] Rows: Athletes=${athleteRows.length}, Leagues=${leagueRows.length}, Venues=${venueRows.length}`);

  await syncAthletesFromExcel(athleteRows);
  await syncLeaguesFromExcel(leagueRows);
  await syncVenuesFromExcel(venueRows);

  console.log('[Excel ETL] Complete.');
}

module.exports = { runExcelEtl, syncAthletesFromExcel, syncLeaguesFromExcel, syncVenuesFromExcel };
