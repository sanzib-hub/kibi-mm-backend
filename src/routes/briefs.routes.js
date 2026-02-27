const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { briefsLimiter } = require('../middleware/rateLimiter');
const { validateBrief } = require('../validators/brief.validator');
const { getCanonicalOptions, createBrief, getBrief, getBriefResults, exportResultsCsv } = require('../controllers/briefs.controller');
const { submitDeliverable, getDeliverables } = require('../controllers/deliverables.controller');

router.get('/canonical-options',               auth, getCanonicalOptions);
router.post('/',                               auth, briefsLimiter, validateBrief, createBrief);
router.get('/:brief_id',                       auth, getBrief);
router.get('/:brief_id/results/export',        auth, exportResultsCsv);
router.get('/:brief_id/results',               auth, getBriefResults);
router.post('/:briefId/deliverables',          auth, submitDeliverable);
router.get('/:briefId/deliverables',           auth, getDeliverables);

module.exports = router;
