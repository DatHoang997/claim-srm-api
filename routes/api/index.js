const express = require("express")
const auth = require("../../middlewares/jwt")
const adminRole = require("../../middlewares/admin")
const user = require("./user")

let app = express()

app.use("/claim-srm/", user)

module.exports = app;