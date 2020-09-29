var express = require("express")
const UserController = require("../../controllers/UserController")

var router = express.Router()

router.put("/register-merchant", UserController.registerMerchant)
router.get("/get-limit", UserController.getLimit)
router.get("/get-email", UserController.getEmail)
router.get("/get-max-allocation", UserController.getMaxAllocation)
router.get("/auth/check-admin", UserController.checkAdmin)
router.get("/auth/check-merchant-manager", UserController.checkMerchantManager)
router.put("/change-email/", UserController.changeEmail)
router.get("/:username", UserController.checkUserName)

module.exports = router;