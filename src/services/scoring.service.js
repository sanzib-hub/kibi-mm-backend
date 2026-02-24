const weights = require('../config/matchWeights');
const clusters = require('../config/sportClusters');

const OBJECTIVE_AFFINITY = {
  AWARENESS:   { athlete: 1.0, league: 0.8, venue: 0.6 },
  ACTIVATION:  { athlete: 0.7, league: 1.0, venue: 1.0 },
  COMMUNITY:   { athlete: 0.8, league: 1.0, venue: 0.9 },
  SALES:       { athlete: 0.9, league: 0.6, venue: 0.5 },
  RECRUITMENT: { athlete: 1.0, league: 0.7, venue: 0.4 },
};

/**
 * Compute MatchScore [0,100] for one asset against a brief.
 * @param {Object} asset      - DB row with _type injected
 * @param {Object} brief      - parsed brief fields
 * @param {Object} relaxOpts  - { relaxCity, relaxState, useCluster, relaxObjective }
 * @returns {{ score: number, breakdown: Object }}
 */
function computeScore(asset, brief, relaxOpts = {}) {
  const sportScore    = calcSportScore(asset, brief, relaxOpts);
  const geoScore      = calcGeoScore(asset, brief, relaxOpts);
  const objectiveScore = calcObjectiveScore(asset, brief, relaxOpts);
  const featuredScore = asset.featuredFlag ? 1.0 : 0.0;

  const raw =
    weights.SPORT_MATCH_WEIGHT    * sportScore +
    weights.GEO_MATCH_WEIGHT      * geoScore +
    weights.OBJECTIVE_FIT_WEIGHT  * objectiveScore +
    weights.FEATURED_BOOST_WEIGHT * featuredScore;

  let penalty = 0;
  if (relaxOpts.relaxCity)      penalty += weights.CITY_RELAXATION_PENALTY;
  if (relaxOpts.relaxState)     penalty += weights.STATE_RELAXATION_PENALTY;
  if (relaxOpts.useCluster)     penalty += weights.SPORT_CLUSTER_PENALTY;
  if (relaxOpts.relaxObjective) penalty += weights.OBJECTIVE_RELAX_PENALTY;

  const score = Math.max(0, Math.round((raw - penalty) * 100 * 100) / 100);

  return {
    score,
    breakdown: { sportScore, geoScore, objectiveScore, featuredScore, penalty },
  };
}

function calcSportScore(asset, brief, relaxOpts) {
  const assetSports = getAssetSports(asset);
  const briefSports = (brief.sports || []).map(s => s.toLowerCase());

  const exactMatch = assetSports.some(s => briefSports.includes(s.toLowerCase()));
  if (exactMatch) return 1.0;

  if (relaxOpts.useCluster) {
    const clusterMatch = assetSports.some(s => {
      const peers = clusters[s.toLowerCase()] || [];
      return briefSports.some(b => peers.map(p => p.toLowerCase()).includes(b)) ||
             briefSports.some(b => (clusters[b] || []).map(p => p.toLowerCase()).includes(s.toLowerCase()));
    });
    if (clusterMatch) return 0.6;
  }

  return 0.0;
}

function calcGeoScore(asset, brief, relaxOpts) {
  const assetCity  = (asset.city  || '').toLowerCase();
  const assetState = (asset.state || '').toLowerCase();
  const cities  = (brief.targetCities  || []).map(c => c.toLowerCase());
  const states  = (brief.targetStates  || []).map(s => s.toLowerCase());

  if (!relaxOpts.relaxCity) {
    if (cities.length === 0 && states.length === 0) return 0.5; // no geo filter = partial match
    if (cities.includes(assetCity)) return 1.0;
    return 0.0;
  }

  if (relaxOpts.relaxCity && !relaxOpts.relaxState) {
    if (states.length === 0) return 0.5;
    return states.includes(assetState) ? 0.7 : 0.0;
  }

  // Pass 2+: region/national - all assets pass with low score
  return 0.4;
}

function calcObjectiveScore(asset, brief, relaxOpts) {
  const objective = (brief.campaignObjective || 'AWARENESS').toUpperCase();
  const assetType = asset._type;
  const affinity  = OBJECTIVE_AFFINITY[objective] || OBJECTIVE_AFFINITY['AWARENESS'];
  const base = affinity[assetType] || 0.5;
  return relaxOpts.relaxObjective ? base * 0.8 : base;
}

function getAssetSports(asset) {
  if (asset._type === 'venue') {
    try { return JSON.parse(asset.sportsSupported || '[]'); }
    catch { return []; }
  }
  return [asset.sport].filter(Boolean);
}

module.exports = { computeScore };
