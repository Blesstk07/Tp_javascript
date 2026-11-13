const router = require('express').Router();
const controller = require('../controllers/dashboard');

router.get('/', controller.getDashboard);

module.exports = router;
