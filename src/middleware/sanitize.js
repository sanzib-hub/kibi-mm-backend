const xssClean = require('xss-clean');

// Apply xss-clean to sanitize request body, query, and params
module.exports = xssClean();
