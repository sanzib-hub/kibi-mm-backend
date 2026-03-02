const { body, validationResult } = require('express-validator');

exports.validateBrief = [
  body('campaignName').trim().isLength({ min: 2, max: 120 }).withMessage('Campaign name must be 2–120 characters'),
  body('sports').isArray({ min: 1 }).withMessage('At least one sport must be selected'),
  body('sports.*').isString().trim().isLength({ min: 1 }),
  body('budget').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 10000000 }).withMessage('Budget must be between 0 and 1 Cr'),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.startDate && endDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be on or after start date');
      }
      return true;
    }),
  body('campaignObjective').optional().isIn(['AWARENESS', 'CONSIDERATION', 'CONVERSIONS', 'APP_INSTALLS', 'FOOTFALL', 'TRIALS', 'ACTIVATION', 'COMMUNITY', 'SALES', 'RECRUITMENT'])
    .withMessage('Invalid campaign objective'),
  body('industryCategory').optional().isIn(['D2C', 'D2C_FITNESS', 'APPAREL', 'FITNESS', 'FINTECH', 'EDUCATION', 'FMCG', 'CONSUMER_ELECTRONICS', 'AUTOMOTIVE', 'F&B', 'BEAUTY', 'SPORTS_BRANDS', 'TELECOM', 'REAL_ESTATE', 'E_COMMERCE', 'OTHER']),
  body('budgetRange').optional().isIn(['BARTER', 'INR_25K_1L', 'INR_1L_3L', 'INR_3L_10L', 'INR_10L_PLUS']),
  body('targetAudience').optional().isArray(),
  body('categoryConstraints').optional().isObject(),
  body('contactEmail').optional({ nullable: true }).isEmail().normalizeEmail().withMessage('Valid contact email required'),
  body('contactPhone')
    .if((value, { req }) => req.body.status !== 'DRAFT')
    .notEmpty().withMessage('Contact phone is required')
    .matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Valid phone number (7–20 digits) required'),
  body('targetCities').optional().isArray(),
  body('targetStates').optional().isArray(),
  body('deliverables').optional().isArray(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: 'VALIDATION_ERROR', fields: errors.array() });
    }
    next();
  },
];
