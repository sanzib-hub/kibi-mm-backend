const { body, validationResult } = require('express-validator');

exports.validateBrief = [
  body('campaignName').trim().isLength({ min: 2, max: 120 }).withMessage('Campaign name must be 2–120 characters'),
  body('sports').isArray({ min: 1 }).withMessage('At least one sport must be selected'),
  body('sports.*').isString().trim().isLength({ min: 1 }),
  body('budget').optional({ nullable: true }).isFloat({ min: 0, max: 10000000 }).withMessage('Budget must be between 0 and 1 Cr'),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ nullable: true }).isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.startDate && endDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be on or after start date');
      }
      return true;
    }),
  body('campaignObjective').optional().isIn(['AWARENESS', 'ACTIVATION', 'COMMUNITY', 'SALES', 'RECRUITMENT'])
    .withMessage('Invalid campaign objective'),
  body('contactEmail').optional({ nullable: true }).isEmail().normalizeEmail().withMessage('Valid contact email required'),
  body('contactPhone').optional({ nullable: true }).matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Valid phone number required'),
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
