module.exports = Object.freeze({
  SPORT_MATCH_WEIGHT:    parseFloat(process.env.W_SPORT)     || 0.40,
  GEO_MATCH_WEIGHT:      parseFloat(process.env.W_GEO)       || 0.30,
  OBJECTIVE_FIT_WEIGHT:  parseFloat(process.env.W_OBJECTIVE)  || 0.20,
  FEATURED_BOOST_WEIGHT: parseFloat(process.env.W_FEATURED)   || 0.10,

  // Score penalties applied when a relaxation is used
  CITY_RELAXATION_PENALTY:    0.05,
  STATE_RELAXATION_PENALTY:   0.10,
  SPORT_CLUSTER_PENALTY:      0.08,
  OBJECTIVE_RELAX_PENALTY:    0.05,

  // Max teaser results per category returned to brand users
  TEASER_MAX_PER_CATEGORY: 3,

  // Fields brand users are allowed to see in teaser responses
  TEASER_FIELDS_ALLOWED: new Set([
    'id', 'name', 'sport', 'city', 'state', 'tier',
    'featured_flag', 'score', 'rank', 'asset_type',
    'season', 'level', 'type',
  ]),
});
