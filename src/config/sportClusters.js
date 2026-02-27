// Sport adjacency map: exact sport → cluster peers (used for relaxation pass 3)
// If a brief requests sport X but no assets found, expand to cluster peers
module.exports = {
  basketball:      ['streetball', '3x3 basketball'],
  soccer:          ['futsal', 'indoor soccer', 'beach soccer'],
  football:        ['flag football', 'arena football'],
  baseball:        ['softball', 'tee-ball'],
  hockey:          ['roller hockey', 'ice hockey', 'field hockey'],
  volleyball:      ['beach volleyball', 'indoor volleyball', 'beach soccer'],
  tennis:          ['pickleball', 'padel', 'squash'],
  'track and field': ['running', 'cross country', 'marathon', 'athletics'],
  running:         ['track and field', 'cross country', 'marathon'],
  swimming:        ['water polo', 'diving', 'triathlon'],
  'flag football': ['football'],
  badminton:       ['tennis', 'squash'],
  cricket:         ['baseball', 'cricket (t20)'],
  'cricket (t20)': ['cricket'],
  football:        ['football (isl)'],
  'football (isl)': ['football'],
  fitness:         ['swimming', 'running', 'gymnastics', 'yoga'],
  kabaddi:         [],
  yoga:            ['fitness'],
};
