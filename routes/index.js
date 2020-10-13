var express = require("express")
var refRoute = require('./ref')
var app = express()

const { UI } = require('bull-board')
app.use("/", refRoute)
app.use('/queues/',
//  function () {
  UI
// }
)

module.exports = app;
