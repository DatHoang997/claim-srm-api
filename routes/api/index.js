let express             = require("express")
let user                = require("./user")
const adminRole         = require("../../middlewares/admin")
const auth              = require("../../middlewares/jwt")
let fbuser = require('./fbuser')

let app = express()

app.use("/user/", user)
app.use('/fbusers/', fbuser)

module.exports = app;