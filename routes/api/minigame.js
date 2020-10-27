const router = require('express').Router();
const MinigameController = require('../../controllers/MinigameController');

router.post('/', MinigameController.getPrize);

module.exports = router
