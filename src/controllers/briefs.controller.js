const briefsService = require('../services/briefs.service');
const canonicalOptionsService = require('../services/canonicalOptions.service');

async function getCanonicalOptions(req, res, next) {
  try {
    const options = await canonicalOptionsService.getCanonicalOptions();
    res.json({ success: true, data: options });
  } catch (err) {
    next(err);
  }
}

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

async function exportResultsCsv(req, res, next) {
  try {
    const csv = await briefsService.exportResultsCsv(parseInt(req.params.brief_id), req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="results-${req.params.brief_id}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { getCanonicalOptions, createBrief, getBrief, getBriefResults, exportResultsCsv };
