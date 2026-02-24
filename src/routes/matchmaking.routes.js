const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { recommendationsLimiter } = require('../middleware/rateLimiter');
const { runRecommendations } = require('../controllers/matchmaking.controller');

router.post('/v1/recommendations', auth, recommendationsLimiter, runRecommendations);

module.exports = router;
