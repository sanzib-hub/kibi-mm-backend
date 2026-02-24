const SPORT_ALIASES = {
  'bball':              'basketball',
  'b-ball':             'basketball',
  'hoops':              'basketball',
  'footbal':            'football',
  'american football':  'football',
  'gridiron':           'football',
  'footy':              'soccer',
  'football (soccer)':  'soccer',
  'association football': 'soccer',
  'futbol':             'soccer',
  'mlb':                'baseball',
  'nfl':                'football',
  'nba':                'basketball',
  'nhl':                'hockey',
  'mls':                'soccer',
  'athletics':          'track and field',
  'gym':                'fitness',
};

const CITY_ALIASES = {
  'new york city': 'New York',
  'nyc':           'New York',
  'la':            'Los Angeles',
  'l.a.':          'Los Angeles',
  'chi':           'Chicago',
  'chitown':       'Chicago',
  'philly':        'Philadelphia',
  'sf':            'San Francisco',
  'd.c.':          'Washington',
  'dc':            'Washington',
  'bengaluru':     'Bangalore',
  'bombay':        'Mumbai',
  'calcutta':      'Kolkata',
  'madras':        'Chennai',
};

const STATE_ABBR = {
  'al': 'Alabama', 'ak': 'Alaska', 'az': 'Arizona', 'ar': 'Arkansas',
  'ca': 'California', 'co': 'Colorado', 'ct': 'Connecticut', 'de': 'Delaware',
  'fl': 'Florida', 'ga': 'Georgia', 'hi': 'Hawaii', 'id': 'Idaho',
  'il': 'Illinois', 'in': 'Indiana', 'ia': 'Iowa', 'ks': 'Kansas',
  'ky': 'Kentucky', 'la': 'Louisiana', 'me': 'Maine', 'md': 'Maryland',
  'ma': 'Massachusetts', 'mi': 'Michigan', 'mn': 'Minnesota', 'ms': 'Mississippi',
  'mo': 'Missouri', 'mt': 'Montana', 'ne': 'Nebraska', 'nv': 'Nevada',
  'nh': 'New Hampshire', 'nj': 'New Jersey', 'nm': 'New Mexico', 'ny': 'New York',
  'nc': 'North Carolina', 'nd': 'North Dakota', 'oh': 'Ohio', 'ok': 'Oklahoma',
  'or': 'Oregon', 'pa': 'Pennsylvania', 'ri': 'Rhode Island', 'sc': 'South Carolina',
  'sd': 'South Dakota', 'tn': 'Tennessee', 'tx': 'Texas', 'ut': 'Utah',
  'vt': 'Vermont', 'va': 'Virginia', 'wa': 'Washington', 'wv': 'West Virginia',
  'wi': 'Wisconsin', 'wy': 'Wyoming',
  // Indian states
  'mh': 'Maharashtra', 'dl': 'Delhi', 'ka': 'Karnataka', 'tn': 'Tamil Nadu',
  'wb': 'West Bengal', 'rj': 'Rajasthan', 'gj': 'Gujarat', 'up': 'Uttar Pradesh',
};

function normalizeSport(raw) {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  return SPORT_ALIASES[lower] || lower;
}

function normalizeCityState(rawCity, rawState) {
  const cityLower  = (rawCity  || '').trim().toLowerCase();
  const stateLower = (rawState || '').trim().toLowerCase();
  const normCity   = CITY_ALIASES[cityLower]  || titleCase(rawCity.trim());
  const normState  = STATE_ABBR[stateLower]   || titleCase(rawState.trim());
  return { normCity, normState };
}

function titleCase(str) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

module.exports = { normalizeSport, normalizeCityState };
