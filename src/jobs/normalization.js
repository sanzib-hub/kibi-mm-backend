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

const STATE_ALIASES = {
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  'andhra pradesh': 'Andhra Pradesh', 'telangana': 'Telangana',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'jammu and kashmir': 'Jammu and Kashmir', 'ladakh': 'Ladakh',
  'uttarakhand': 'Uttarakhand', 'uttaranchal': 'Uttarakhand',
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
  // Indian states / UTs
  'mh': 'Maharashtra', 'dl': 'Delhi', 'ka': 'Karnataka', 'tn': 'Tamil Nadu',
  'wb': 'West Bengal', 'rj': 'Rajasthan', 'gj': 'Gujarat', 'up': 'Uttar Pradesh',
  'ap': 'Andhra Pradesh', 'ts': 'Telangana', 'mp': 'Madhya Pradesh', 'pb': 'Punjab',
  'hr': 'Haryana', 'kl': 'Kerala', 'or': 'Odisha', 'jh': 'Jharkhand',
  'an': 'Andaman and Nicobar Islands', 'ch': 'Chandigarh', 'jk': 'Jammu and Kashmir',
  'py': 'Puducherry', 'nl': 'Nagaland', 'tr': 'Tripura', 'mz': 'Mizoram',
  'sk': 'Sikkim', 'ml': 'Meghalaya', 'uk': 'Uttarakhand',
  'dnh': 'Dadra and Nagar Haveli and Daman and Diu',
};

function normalizeSport(raw) {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  return SPORT_ALIASES[lower] || lower;
}

function normalizeCityState(rawCity, rawState) {
  const cityLower  = (rawCity  || '').trim().toLowerCase();
  const stateLower = (rawState || '').trim().toLowerCase();
  const normCity   = CITY_ALIASES[cityLower]  || titleCase((rawCity || '').trim());
  const normState  = STATE_ALIASES[stateLower] || STATE_ABBR[stateLower] || titleCase((rawState || '').trim());
  return { normCity, normState };
}

function titleCase(str) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

module.exports = { normalizeSport, normalizeCityState };
