const router = require('express').Router();
const controller = require('../controllers/products');

router.get('/', controller.listProducts);
router.post('/', controller.createProduct);
router.get('/:id', controller.getProduct);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;
