const config = require('../config');

const STATUS_MAP = {
  BRIEF_NOT_FOUND:    404,
  USER_NOT_FOUND:     404,
  LEAD_NOT_FOUND:     404,
  FORBIDDEN:          403,
  VALIDATION_ERROR:   422,
  DUPLICATE_EMAIL:    409,
  INVALID_CREDENTIALS: 401,
  INVALID_STATUS:     422,
};

module.exports = function errorHandler(err, req, res, next) {
  const status = STATUS_MAP[err.message] || 500;
  const isProd = config.nodeEnv === 'production';

  if (status === 500) {
    console.error('[Error]', err);
  }

  res.status(status).json({
    success: false,
    error: isProd && status === 500 ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};
