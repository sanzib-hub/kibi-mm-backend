const prisma = require('../lib/prismaClient');
const notificationService = require('./notification.service');

function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

async function createBrief(data, user) {
  const brief = await prisma.$transaction(async (tx) => {
    const newBrief = await tx.campaignBrief.create({
      data: {
        brandAccountId: user.brandAccountId,
        brandUserId: user.id,
        campaignName: data.campaignName,
        industryCategory: data.industryCategory || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        budgetRange: data.budgetRange || null,
        budgetCurrency: data.budgetCurrency || 'INR',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        campaignObjective: data.campaignObjective || null,
        sports: safeJson(data.sports),
        targetAudience: safeJson(data.targetAudience),
        targetCities: safeJson(data.targetCities),
        targetStates: safeJson(data.targetStates),
        targetRegions: safeJson(data.targetRegions),
        assetCategories: safeJson(data.assetCategories || ['athlete', 'league', 'venue']),
        athleteTiers: safeJson(data.athleteTiers),
        deliverables: safeJson(data.deliverables),
        categoryConstraints: safeJson(data.categoryConstraints),
        notes: data.notes || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        status: data.status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
        submittedAt: data.status === 'DRAFT' ? null : new Date(),
      },
    });

    const lead = await tx.lead.create({
      data: {
        briefId: newBrief.id,
        status: 'NEW',
      },
    });

    return { brief: newBrief, lead };
  });

  // Send notifications if submitted (non-blocking)
  if (brief.brief.status === 'SUBMITTED') {
    const brandUser = await prisma.brandUser.findUnique({
      where: { id: user.id },
      include: { brandAccount: true },
    });
    notificationService.sendBriefSubmissionNotification(
      brief.brief,
      brandUser,
      brandUser.brandAccount
    );
  }

  return { id: brief.brief.id, leadId: brief.lead.id, status: brief.brief.status };
}

async function getBriefForUser(briefId, userId) {
  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');
  return parseBriefFields(brief);
}

const TEASER_FIELDS = new Set(['id', 'name', 'sport', 'city', 'state', 'tier', 'featured_flag', 'score', 'rank', 'asset_type', 'season', 'level', 'type', 'sports_supported']);

function toSnake(k) {
  return k.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
}

function hydrateTeaser(mr, asset) {
  const obj = { asset_type: mr.assetType, score: mr.score, rank: mr.rank };
  if (asset) {
    for (const [k, v] of Object.entries(asset)) {
      if (k.startsWith('_')) continue;
      const snake = toSnake(k);
      if (TEASER_FIELDS.has(snake) || TEASER_FIELDS.has(k)) obj[snake] = v;
    }
  }
  return obj;
}

async function getLatestResults(briefId, userId) {
  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');

  const matchRun = await prisma.matchRun.findFirst({
    where: { briefId },
    orderBy: { ranAt: 'desc' },
    include: { results: true },
  });

  if (!matchRun) return { match_run_id: null, is_relaxed: false, application_deadline: brief.applicationDeadline || null, athletes: [], leagues: [], venues: [], total_matched: { athletes: 0, leagues: 0, venues: 0 } };

  const athleteIds = matchRun.results.filter(r => r.assetType === 'athlete').map(r => r.assetId);
  const leagueIds = matchRun.results.filter(r => r.assetType === 'league').map(r => r.assetId);
  const venueIds = matchRun.results.filter(r => r.assetType === 'venue').map(r => r.assetId);

  const [athletes, leagues, venues] = await Promise.all([
    athleteIds.length ? prisma.athlete.findMany({ where: { id: { in: athleteIds } } }) : [],
    leagueIds.length ? prisma.league.findMany({ where: { id: { in: leagueIds } } }) : [],
    venueIds.length ? prisma.venue.findMany({ where: { id: { in: venueIds } } }) : [],
  ]);

  const athleteMap = Object.fromEntries(athletes.map(a => [a.id, a]));
  const leagueMap = Object.fromEntries(leagues.map(l => [l.id, l]));
  const venueMap = Object.fromEntries(venues.map(v => [v.id, v]));

  const toAsset = (mr) => {
    const map = mr.assetType === 'athlete' ? athleteMap : mr.assetType === 'league' ? leagueMap : venueMap;
    return hydrateTeaser(mr, map[mr.assetId]);
  };

  const athleteResults = matchRun.results.filter(r => r.assetType === 'athlete').map(toAsset);
  const leagueResults = matchRun.results.filter(r => r.assetType === 'league').map(toAsset);
  const venueResults = matchRun.results.filter(r => r.assetType === 'venue').map(toAsset);

  return {
    match_run_id: matchRun.id,
    is_relaxed: matchRun.relaxationsJson ? Object.keys(JSON.parse(matchRun.relaxationsJson || '{}')).length > 0 : false,
    application_deadline: brief.applicationDeadline || null,
    athletes: athleteResults,
    leagues: leagueResults,
    venues: venueResults,
    total_matched: { athletes: athleteResults.length, leagues: leagueResults.length, venues: venueResults.length },
  };
}

async function updateBriefStatus(briefId, status) {
  return prisma.campaignBrief.update({
    where: { id: briefId },
    data: { status, submittedAt: status === 'SUBMITTED' ? new Date() : undefined },
  });
}

function parseBriefFields(brief) {
  const safe = (v) => { try { return JSON.parse(v); } catch { return v; } };
  return {
    ...brief,
    sports:             safe(brief.sports),
    targetAudience:     safe(brief.targetAudience),
    targetCities:       safe(brief.targetCities),
    targetStates:       safe(brief.targetStates),
    targetRegions:   safe(brief.targetRegions),
    assetCategories: safe(brief.assetCategories),
    athleteTiers:       safe(brief.athleteTiers),
    deliverables:       safe(brief.deliverables),
    categoryConstraints: safe(brief.categoryConstraints),
  };
}

async function exportResultsCsv(briefId, userId) {
  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');

  const matchRun = await prisma.matchRun.findFirst({
    where: { briefId },
    orderBy: { ranAt: 'desc' },
    include: { results: true },
  });

  if (!matchRun) return '';

  const athleteIds = matchRun.results.filter(r => r.assetType === 'athlete').map(r => r.assetId);
  const leagueIds = matchRun.results.filter(r => r.assetType === 'league').map(r => r.assetId);
  const venueIds = matchRun.results.filter(r => r.assetType === 'venue').map(r => r.assetId);

  const [athletes, leagues, venues] = await Promise.all([
    athleteIds.length ? prisma.athlete.findMany({ where: { id: { in: athleteIds } } }) : [],
    leagueIds.length ? prisma.league.findMany({ where: { id: { in: leagueIds } } }) : [],
    venueIds.length ? prisma.venue.findMany({ where: { id: { in: venueIds } } }) : [],
  ]);

  const athleteMap = Object.fromEntries(athletes.map(a => [a.id, a]));
  const leagueMap = Object.fromEntries(leagues.map(l => [l.id, l]));
  const venueMap = Object.fromEntries(venues.map(v => [v.id, v]));

  const lines = [];

  // Athletes
  const athleteResults = matchRun.results.filter(r => r.assetType === 'athlete');
  if (athleteResults.length > 0) {
    lines.push('Type,Name,Sport,City,State,Tier,Score,Followers');
    for (const mr of athleteResults) {
      const a = athleteMap[mr.assetId];
      if (!a) continue;
      lines.push([
        'Athlete',
        csvEscape(a.name),
        csvEscape(a.sport),
        csvEscape(a.city),
        csvEscape(a.state),
        csvEscape(a.tier),
        mr.score,
        a.socialFollowers || '',
      ].join(','));
    }
  }

  // Leagues
  const leagueResults = matchRun.results.filter(r => r.assetType === 'league');
  if (leagueResults.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Type,Name,Sport,City,State,Level,Score,Season');
    for (const mr of leagueResults) {
      const l = leagueMap[mr.assetId];
      if (!l) continue;
      lines.push([
        'League',
        csvEscape(l.name),
        csvEscape(l.sport),
        csvEscape(l.city),
        csvEscape(l.state),
        csvEscape(l.level || ''),
        mr.score,
        csvEscape(l.season || ''),
      ].join(','));
    }
  }

  // Venues
  const venueResults = matchRun.results.filter(r => r.assetType === 'venue');
  if (venueResults.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Type,Name,VenueType,City,State,Score,Capacity,SportsSupported');
    for (const mr of venueResults) {
      const v = venueMap[mr.assetId];
      if (!v) continue;
      lines.push([
        'Venue',
        csvEscape(v.name),
        csvEscape(v.type),
        csvEscape(v.city),
        csvEscape(v.state),
        mr.score,
        v.capacity || '',
        csvEscape(v.sportsSupported || ''),
      ].join(','));
    }
  }

  return lines.join('\n');
}

function csvEscape(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = { createBrief, getBriefForUser, getLatestResults, updateBriefStatus, exportResultsCsv };
