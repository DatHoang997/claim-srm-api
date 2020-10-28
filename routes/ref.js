var express = require("express")
const UserController = require("../controllers/UserController")

var router = express.Router()

router.get("/download/:fb_id/:ps_id", UserController.download)
router.get('/ref/:fb_id', UserController.redirectToChatbot)
router.get('/lucky_wheel', UserController.redirectLuckyWheel);

module.exports = router;