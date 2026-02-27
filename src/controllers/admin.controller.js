const adminService = require('../services/admin.service');

const ASSET_TYPES = ['athlete', 'league', 'venue'];

async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

async function getAssetDetail(req, res, next) {
  try {
    const { type, id } = req.params;
    if (!ASSET_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid asset type. Use athlete, league, or venue.' });
    }
    const asset = await adminService.getAssetDetail(type, id);
    res.json({ success: true, data: asset });
  } catch (err) {
    if (err.message === 'ASSET_NOT_FOUND' || err.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    next(err);
  }
}

async function getLeads(req, res, next) {
  try {
    const { page, limit, status, budgetMin, budgetMax, sport, city } = req.query;
    const result = await adminService.getLeads({
      page:      parseInt(page) || 1,
      limit:     parseInt(limit) || 20,
      status:    status || undefined,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      sport:     sport || undefined,
      city:      city || undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getLeadById(req, res, next) {
  try {
    const lead = await adminService.getLeadById(req.params.lead_id);
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
}

async function updateLead(req, res, next) {
  try {
    const lead = await adminService.updateLead(req.params.lead_id, req.body);
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
}

async function patchAsset(req, res, next) {
  try {
    const { type, id } = req.params;
    if (!ASSET_TYPES.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid asset type. Use athlete, league, or venue.' });
    }
    const asset = await adminService.updateAssetIncompatibleCategories(type, id, req.body);
    res.json({ success: true, data: asset });
  } catch (err) {
    if (err.code === 'P2025' || err.message?.includes('Record to update not found')) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    next(err);
  }
}

module.exports = { getLeads, getLeadById, updateLead, patchAsset, getDashboardStats, getAssetDetail };
