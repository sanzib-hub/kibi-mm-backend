const deliverablesService = require('../services/deliverables.service');

async function submitDeliverable(req, res, next) {
  try {
    const briefId = parseInt(req.params.briefId);
    if (!briefId || isNaN(briefId)) {
      return res.status(400).json({ success: false, error: 'Valid briefId required' });
    }
    const { type, submissionUrl, description } = req.body;
    if (!type || !submissionUrl) {
      return res.status(400).json({ success: false, error: 'type and submissionUrl are required' });
    }
    const deliverable = await deliverablesService.submitDeliverable(briefId, { type, submissionUrl, description });
    res.status(201).json({ success: true, data: deliverable });
  } catch (err) {
    if (err.message === 'BRIEF_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Campaign brief not found' });
    }
    next(err);
  }
}

async function getDeliverables(req, res, next) {
  try {
    const briefId = parseInt(req.params.briefId);
    if (!briefId || isNaN(briefId)) {
      return res.status(400).json({ success: false, error: 'Valid briefId required' });
    }
    const deliverables = await deliverablesService.getDeliverables(briefId);
    res.json({ success: true, data: deliverables });
  } catch (err) {
    next(err);
  }
}

async function reviewDeliverable(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Valid deliverable id required' });
    }
    const { status, feedback } = req.body;
    if (!status || !['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be APPROVED, REJECTED, or REVISION_REQUESTED' });
    }
    const deliverable = await deliverablesService.reviewDeliverable(id, { status, feedback });
    res.json({ success: true, data: deliverable });
  } catch (err) {
    if (err.code === 'P2025' || err.message?.includes('Record to update not found')) {
      return res.status(404).json({ success: false, error: 'Deliverable not found' });
    }
    next(err);
  }
}

module.exports = { submitDeliverable, getDeliverables, reviewDeliverable };
