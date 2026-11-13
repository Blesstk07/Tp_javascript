const router = require('express').Router();
const controller = require('../controllers/sales');

router.get('/', controller.listSales);
router.post('/', controller.createSale);
router.get('/:id', controller.getSale);

module.exports = router;
