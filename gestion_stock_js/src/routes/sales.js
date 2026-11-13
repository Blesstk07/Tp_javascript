const router = require('express').Router();
const controller = require('../controllers/sales');

// TODO : implémenter les méthodes conformément à CONTRAT_API.md.
// Les routes provisoires retournent 501 tant que le contrôleur n'est pas développé.
router.all('*', controller.notImplemented);

module.exports = router;
