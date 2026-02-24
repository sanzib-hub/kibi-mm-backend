const express = require('express');
const router = express.Router();

router.use('/auth',             require('./auth.routes'));
router.use('/sponsorship/briefs', require('./briefs.routes'));
router.use('/matchmaking',      require('./matchmaking.routes'));
router.use('/sponsorship/demos', require('./demos.routes'));
router.use('/admin',            require('./admin.routes'));

module.exports = router;
