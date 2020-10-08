let express             = require("express")
let user                = require("./user")
let fbuser = require('./fbuser')
const auth              = require("../../middlewares/jwt")
const adminRole         = require("../../middlewares/admin")

let app = express()

app.use("/user/", user)
app.use('/fbusers/', fbuser)

module.exports = app;