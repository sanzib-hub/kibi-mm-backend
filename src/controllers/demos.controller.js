const demosService = require('../services/demos.service');

async function createDemo(req, res, next) {
  try {
    const result = await demosService.createDemoRequest(req.body, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { createDemo };
