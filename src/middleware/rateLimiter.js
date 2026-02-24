const rateLimit = require('express-rate-limit');

// 20 brief creations per user per day
exports.briefsLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `briefs:${req.user?.id ?? req.ip}`,
  message: { success: false, error: 'Brief submission limit reached. Try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 10 recommendation runs per hour per brief
exports.recommendationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `rec:${req.user?.id ?? req.ip}:${req.body?.brief_id ?? 'na'}`,
  message: { success: false, error: 'Recommendation run limit reached. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});
