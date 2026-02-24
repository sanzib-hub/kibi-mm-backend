const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateDemo } = require('../validators/demo.validator');
const { createDemo } = require('../controllers/demos.controller');

router.post('/', auth, validateDemo, createDemo);

module.exports = router;
