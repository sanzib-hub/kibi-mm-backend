const express = require('express');
const router = express.Router();
const { briefsLimiter } = require('../middleware/rateLimiter');
const { validateBrief } = require('../validators/brief.validator');
const { getCanonicalOptions, createBrief, getBrief, getBriefResults, exportResultsCsv } = require('../controllers/briefs.controller');
const { submitDeliverable, getDeliverables } = require('../controllers/deliverables.controller');

router.get('/canonical-options',               getCanonicalOptions);
router.post('/',                               briefsLimiter, validateBrief, createBrief);
router.get('/:brief_id',                       getBrief);
router.get('/:brief_id/results/export',        exportResultsCsv);
router.get('/:brief_id/results',               getBriefResults);
router.post('/:briefId/deliverables',          submitDeliverable);
router.get('/:briefId/deliverables',           getDeliverables);

module.exports = router;
