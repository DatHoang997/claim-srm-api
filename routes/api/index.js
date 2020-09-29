let express             = require("express")
let user                = require("./user")
const auth              = require("../../middlewares/jwt")
const adminRole         = require("../../middlewares/admin")

let app = express()

app.use("/user/", user)

module.exports = app;