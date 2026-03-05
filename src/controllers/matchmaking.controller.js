const matchmakingService = require('../services/matchmaking.service');

async function runRecommendations(req, res, next) {
  try {
    const briefId = parseInt(req.body.brief_id);
    if (!briefId || isNaN(briefId)) {
      return res.status(400).json({ success: false, error: 'Valid brief_id required' });
    }
    const limits = req.body.limits;
    const results = await matchmakingService.runMatchmaking(briefId, { limits });
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = { runRecommendations };
