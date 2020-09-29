var express = require("express")
const RefController = require("../controllers/RefController")

var router = express.Router()

router.get("/download/:username/:subid", RefController.download)
router.get("/download/:username", RefController.download)

module.exports = router;
