const briefsService = require('../services/briefs.service');

async function createBrief(req, res, next) {
  try {
    const result = await briefsService.createBrief(req.body, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getBrief(req, res, next) {
  try {
    const brief = await briefsService.getBriefForUser(parseInt(req.params.brief_id), req.user.id);
    res.json({ success: true, data: brief });
  } catch (err) {
    next(err);
  }
}

async function getBriefResults(req, res, next) {
  try {
    const results = await briefsService.getLatestResults(parseInt(req.params.brief_id), req.user.id);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBrief, getBrief, getBriefResults };
