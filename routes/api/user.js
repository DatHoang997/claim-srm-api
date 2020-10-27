var express = require("express")
const UserController = require("../../controllers/UserController")

var router = express.Router()

router.post("/", UserController.claimASRM)
router.post("/swap", UserController.swapSRM)
router.post("/info", UserController.info)
router.get("/get_info/:wallet", UserController.getInfo)
router.get("/get_user/:fb_id", UserController.getUser)
router.get("/get_wallet/:wallet", UserController.getWallet)

module.exports = router;