const express = require('express');
const router = express.Router();
const { validateRegister, validateLogin, validateRefresh } = require('../validators/auth.validator');
const { register, login, refresh } = require('../controllers/auth.controller');

router.post('/register', validateRegister, register);
router.post('/login',    validateLogin,    login);
router.post('/refresh',  validateRefresh, refresh);

module.exports = router;
