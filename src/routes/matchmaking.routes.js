const express = require('express');
const router = express.Router();
const { recommendationsLimiter } = require('../middleware/rateLimiter');
const { runRecommendations } = require('../controllers/matchmaking.controller');

router.post('/v1/recommendations', recommendationsLimiter, runRecommendations);

module.exports = router;
