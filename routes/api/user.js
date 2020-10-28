var express = require("express")
const UserController = require("../../controllers/UserController")

var router = express.Router()

router.post("/", UserController.claimASRM)
router.post("/swap", UserController.swapSRM)
router.post("/info", UserController.info)
router.get("/get_info/:wallet", UserController.getInfo)
router.get("/get_user/:fb_id", UserController.getUser)
router.get("/get_wallet/:wallet", UserController.getWallet)
router.post('/send_lucky_wheel', UserController.sendLuckyWheel)
router.post('/add_spin_number', UserController.addSpinNumber)

module.exports = router;