const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getLeads, getLeadById, updateLead } = require('../controllers/admin.controller');

router.get('/leads',          adminAuth, getLeads);
router.get('/leads/:lead_id', adminAuth, getLeadById);
router.patch('/leads/:lead_id', adminAuth, updateLead);

module.exports = router;
