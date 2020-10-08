var express = require('express');
const FbUserController = require('../../controllers/FbUserController');

var router = express.Router();

router.get('/:userId', FbUserController.findOne);

module.exports = router;