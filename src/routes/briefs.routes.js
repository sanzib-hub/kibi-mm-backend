const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { briefsLimiter } = require('../middleware/rateLimiter');
const { validateBrief } = require('../validators/brief.validator');
const { createBrief, getBrief, getBriefResults } = require('../controllers/briefs.controller');

router.post('/',                     auth, briefsLimiter, validateBrief, createBrief);
router.get('/:brief_id',             auth, getBrief);
router.get('/:brief_id/results',     auth, getBriefResults);

module.exports = router;
