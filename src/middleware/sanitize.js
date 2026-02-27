/**
 * Basic input sanitization middleware.
 * Strips common XSS patterns from request body, query, and params.
 * Replaces the deprecated xss-clean package.
 */

function stripXss(value) {
  if (typeof value === 'string') {
    return value
      .replace(/(<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>)/gi, '')
      .replace(/(<\s*\/?\s*script\b[^>]*>)/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/on\w+\s*=\s*(['"]?).*?\1/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(stripXss);
  }
  if (value !== null && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      clean[key] = stripXss(value[key]);
    }
    return clean;
  }
  return value;
}

function sanitize(req, _res, next) {
  if (req.body) req.body = stripXss(req.body);
  if (req.query) req.query = stripXss(req.query);
  if (req.params) req.params = stripXss(req.params);
  next();
}

module.exports = sanitize;
