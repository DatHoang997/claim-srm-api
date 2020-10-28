var mongoose = require("mongoose")

var UsePrizeSchema = new mongoose.Schema({
  fb_id: {type: String, required: true},
  prize: {type: String, required: true}
}, {timestamps: true})

module.exports = mongoose.model("UsePrize", UsePrizeSchema)