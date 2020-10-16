let express  = require("express")
let user = require("./user")
let fbuser = require('./fbuser')

let app = express()

app.use("/user/", user)
app.use('/fbusers/', fbuser)

module.exports = app;