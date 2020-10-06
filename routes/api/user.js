var express = require("express")
const UserController = require("../../controllers/UserController")

var router = express.Router()

router.post("/", UserController.claimZSRM)
router.post("/swap", UserController.swapSRM)

module.exports = router;