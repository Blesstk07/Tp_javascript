const router = require('express').Router();
const controller = require('../controllers/suppliers');

router.get('/', controller.listSuppliers);
router.post('/', controller.createSupplier);
router.put('/:id', controller.updateSupplier);

module.exports = router;
