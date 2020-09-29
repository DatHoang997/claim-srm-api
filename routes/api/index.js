let express             = require("express")
let authRouter          = require("./auth")
let transactionRouter   = require("./transaction")
let bookRouter          = require("./book")
let website             = require("./website")
let userWebsite         = require("./user.website")
let admin               = require("./admin")
let user                = require("./user")
let other               = require("./other")
let merchantLead        = require("./merchantLead")
let affiliate           = require("./affiliate")
let category            = require("./category")
let pocstats            = require("./pocstats")
let exchange            = require("./exchange")
const { UI }            = require('bull-board')
const auth              = require("../../middlewares/jwt")
const adminRole         = require("../../middlewares/admin")

let app = express()

app.use('/admin/queues/',
//  function () {
  UI
// }
)
app.use("/auth/", authRouter)
app.use("/transaction/", transactionRouter)
app.use("/book/", bookRouter)
app.use("/website/", website)
app.use("/user/website/", userWebsite)
app.use("/admin/", admin)
app.use("/user/", user)
app.use("/merchant-lead/", merchantLead)
app.use("/affiliate/", affiliate)
app.use("/category", category)
app.use("/", other)
app.use("/pocstats", pocstats)
app.use("/exchange", exchange)

module.exports = app;