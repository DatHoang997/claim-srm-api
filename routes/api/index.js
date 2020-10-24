let express  = require("express")
let user = require("./user")
let fbuser = require('./fbuser')
let minigame = require('./minigame')

let app = express()

app.use("/user/", user)
app.use('/fbusers/', fbuser)
app.use('/minigame/', minigame)

module.exports = app;