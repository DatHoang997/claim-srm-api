var express = require("express")
var refRoute = require('./ref')
var app = express()

app.use("/", refRoute)

module.exports = app;

