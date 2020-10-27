var express = require("express")
const UserController = require("../../controllers/UserController")

var router = express.Router()

router.post("/", UserController.claimASRM)
router.post("/swap", UserController.swapSRM)
router.get("/get_user/:fb_id", UserController.getUser)
router.post('/send_lucky_wheel', UserController.sendLuckyWheel)
router.post('/add_spin_number', UserController.addSpinNumber)

module.exports = router;