const express = require('express');
const router = express.Router();
const { demosLimiter } = require('../middleware/rateLimiter');
const { validateDemo } = require('../validators/demo.validator');
const { createDemo } = require('../controllers/demos.controller');

router.post('/', demosLimiter, validateDemo, createDemo);

module.exports = router;
