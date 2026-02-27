const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getLeads, getLeadById, updateLead, patchAsset, getDashboardStats, getAssetDetail } = require('../controllers/admin.controller');
const { reviewDeliverable } = require('../controllers/deliverables.controller');

router.get('/dashboard/stats',    adminAuth, getDashboardStats);
router.get('/leads',              adminAuth, getLeads);
router.get('/leads/:lead_id',     adminAuth, getLeadById);
router.patch('/leads/:lead_id',   adminAuth, updateLead);
router.get('/assets/:type/:id',   adminAuth, getAssetDetail);
router.patch('/assets/:type/:id', adminAuth, patchAsset);
router.patch('/deliverables/:id', adminAuth, reviewDeliverable);

module.exports = router;
