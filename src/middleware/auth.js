const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid authorization token' });
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    req.user = payload; // { id, brandAccountId, email, role }
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
