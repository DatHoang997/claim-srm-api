var express = require("express")
const UserController = require("../controllers/UserController")

var router = express.Router()

router.get("/download/:fb_id", UserController.download)

module.exports = router;