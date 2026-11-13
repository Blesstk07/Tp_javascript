const router = require('express').Router();
const controller = require('../controllers/categories');

router.get('/', controller.listCategories);
router.post('/', controller.createCategory);
router.put('/:id', controller.updateCategory);

module.exports = router;
