const { body, validationResult } = require('express-validator');

exports.validateDemo = [
  body('brief_id').isInt({ min: 1 }).withMessage('Valid brief_id required'),
  body('contact_name').trim().isLength({ min: 1, max: 100 }).withMessage('Contact name required'),
  body('contact_email').isEmail().normalizeEmail().withMessage('Valid contact email required'),
  body('contact_phone').optional({ nullable: true }).matches(/^\+?[\d\s\-()]{7,20}$/),
  body('preferred_time').optional().isString().trim().isLength({ max: 200 }),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, error: 'VALIDATION_ERROR', fields: errors.array() });
    }
    next();
  },
];
