const prisma = require('../lib/prismaClient');
const { computeScore } = require('./scoring.service');
const { runWithRelaxation } = require('./relaxation.service');
const weights = require('../config/matchWeights');

function safeParseJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function camelToSnake(str) {
  return str.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
}

/**
 * Main matchmaking entry point.
 * Loads brief, runs progressive relaxation, persists MatchRun + MatchResults,
 * and returns teaser payload.
 */
async function runMatchmaking(briefId, userId, options = {}) {
  const brief = await prisma.campaignBrief.findUnique({
    where: { id: briefId },
  });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');

  const parsedBrief = {
    ...brief,
    sports:             safeParseJson(brief.sports, []),
    targetCities:       safeParseJson(brief.targetCities, []),
    targetStates:       safeParseJson(brief.targetStates, []),
    assetCategories:    safeParseJson(brief.assetCategories, ['athlete', 'league', 'venue']),
    categoryConstraints: safeParseJson(brief.categoryConstraints, {}),
  };

  const { results, relaxationsApplied, isRelaxed } = await runWithRelaxation(
    (relaxOpts) => fetchAndScore(parsedBrief, relaxOpts)
  );

  // Persist MatchRun
  const matchRun = await prisma.matchRun.create({
    data: {
      briefId,
      paramsJson: JSON.stringify({
        sports: parsedBrief.sports,
        targetCities: parsedBrief.targetCities,
        targetStates: parsedBrief.targetStates,
        campaignObjective: parsedBrief.campaignObjective,
        assetCategories: parsedBrief.assetCategories,
        categoryConstraints: parsedBrief.categoryConstraints,
      }),
      relaxationsJson: JSON.stringify(relaxationsApplied),
      totalCandidates:
        results.athletes.length + results.leagues.length + results.venues.length,
    },
  });

  // Persist MatchResults
  const allItems = [
    ...results.athletes.map(r => ({ ...r, assetType: 'athlete' })),
    ...results.leagues.map(r  => ({ ...r, assetType: 'league' })),
    ...results.venues.map(r   => ({ ...r, assetType: 'venue' })),
  ];

  if (allItems.length > 0) {
    await prisma.matchResult.createMany({
      data: allItems.map(r => ({
        matchRunId:         matchRun.id,
        assetType:          r.assetType,
        assetId:            r.asset.id,
        score:              r.score,
        rank:               r.rank,
        scoreBreakdownJson: JSON.stringify(r.breakdown),
      })),
    });
  }

  return buildTeaserResponse(results, matchRun.id, isRelaxed, options.limits);
}

async function fetchAndScore(brief, relaxOpts) {
  const categories = brief.assetCategories || ['athlete', 'league', 'venue'];

  const [athletes, leagues, venues] = await Promise.all([
    categories.includes('athlete') ? fetchAthletes(brief, relaxOpts) : Promise.resolve([]),
    categories.includes('league')  ? fetchLeagues(brief, relaxOpts)  : Promise.resolve([]),
    categories.includes('venue')   ? fetchVenues(brief, relaxOpts)   : Promise.resolve([]),
  ]);

  return {
    athletes: scoreAndRank(athletes, 'athlete', brief, relaxOpts),
    leagues:  scoreAndRank(leagues,  'league',  brief, relaxOpts),
    venues:   scoreAndRank(venues,   'venue',   brief, relaxOpts),
  };
}

function isExcludedByCategoryConstraints(asset, brief) {
  const exclude = (brief.categoryConstraints?.exclude_categories || []);
  if (exclude.length === 0) return false;
  const assetIncompat = safeParseJson(asset.incompatibleCategories, []);
  if (!Array.isArray(assetIncompat) || assetIncompat.length === 0) return false;
  const exclSet = new Set(exclude.map(c => String(c).toUpperCase()));
  return assetIncompat.some(c => exclSet.has(String(c).toUpperCase()));
}

function scoreAndRank(assets, type, brief, relaxOpts) {
  return assets
    .filter(asset => !isExcludedByCategoryConstraints(asset, brief))
    .map(asset => {
      asset._type = type;
      const { score, breakdown } = computeScore(asset, brief, relaxOpts);
      return { asset, score, breakdown };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));
}

async function fetchAthletes(brief, relaxOpts) {
  const where = { status: 'active' };

  if (!relaxOpts.useCluster && brief.sports?.length) {
    where.sport = { in: brief.sports };
  }
  if (!relaxOpts.relaxCity && brief.targetCities?.length) {
    where.city = { in: brief.targetCities };
  } else if (!relaxOpts.relaxState && brief.targetStates?.length) {
    where.state = { in: brief.targetStates };
  }

  return prisma.athlete.findMany({ where });
}

async function fetchLeagues(brief, relaxOpts) {
  const where = { status: 'active' };

  if (!relaxOpts.useCluster && brief.sports?.length) {
    where.sport = { in: brief.sports };
  }
  if (!relaxOpts.relaxCity && brief.targetCities?.length) {
    where.city = { in: brief.targetCities };
  } else if (!relaxOpts.relaxState && brief.targetStates?.length) {
    where.state = { in: brief.targetStates };
  }

  return prisma.league.findMany({ where });
}

async function fetchVenues(brief, relaxOpts) {
  const where = { status: 'active' };

  // Venues: no single sport field; we filter by sports in-memory after DB fetch
  if (!relaxOpts.relaxCity && brief.targetCities?.length) {
    where.city = { in: brief.targetCities };
  } else if (!relaxOpts.relaxState && brief.targetStates?.length) {
    where.state = { in: brief.targetStates };
  }

  return prisma.venue.findMany({ where });
}

function buildTeaserResponse(results, matchRunId, isRelaxed, requestLimits) {
  const limits = {
    athlete: requestLimits?.athletes ?? weights.TEASER_MAX_ATHLETES ?? weights.TEASER_MAX_PER_CATEGORY ?? 3,
    league:  requestLimits?.leagues ?? weights.TEASER_MAX_LEAGUES ?? weights.TEASER_MAX_PER_CATEGORY ?? 3,
    venue:   requestLimits?.venues ?? weights.TEASER_MAX_VENUES ?? weights.TEASER_MAX_PER_CATEGORY ?? 3,
  };
  const allowed = weights.TEASER_FIELDS_ALLOWED;

  const tease = (items, type) =>
    items.slice(0, Math.min(100, limits[type] || 3)).map(r => {
      const obj = { asset_type: type, score: r.score, rank: r.rank };
      for (const [k, v] of Object.entries(r.asset)) {
        if (k.startsWith('_')) continue;
        const snakeKey = camelToSnake(k);
        if (allowed.has(snakeKey) || allowed.has(k)) {
          obj[snakeKey] = v;
        }
      }
      return obj;
    });

  return {
    match_run_id: matchRunId,
    is_relaxed: isRelaxed,
    athletes: tease(results.athletes, 'athlete'),
    leagues:  tease(results.leagues,  'league'),
    venues:   tease(results.venues,   'venue'),
    total_matched: {
      athletes: results.athletes.length,
      leagues:  results.leagues.length,
      venues:   results.venues.length,
    },
  };
}

module.exports = { runMatchmaking };
