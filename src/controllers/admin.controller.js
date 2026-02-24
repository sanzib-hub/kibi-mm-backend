const adminService = require('../services/admin.service');

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

module.exports = { getLeads, getLeadById, updateLead };
