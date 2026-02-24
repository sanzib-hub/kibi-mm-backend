const config = require('../config');

module.exports = function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== config.adminApiKey) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  next();
};
