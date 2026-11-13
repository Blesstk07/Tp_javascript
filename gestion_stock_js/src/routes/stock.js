const router = require('express').Router();
const controller = require('../controllers/stock');

router.get('/', controller.listStock);
router.post('/entries', controller.createStockEntry);
router.get('/movements', controller.listStockMovements);

module.exports = router;
