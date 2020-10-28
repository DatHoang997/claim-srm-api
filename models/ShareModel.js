var mongoose = require("mongoose")

var ShareSchema = new mongoose.Schema({
  fb_id: {type: String, required: true},
  friend_fb_id: {type: String, required: true}
}, {timestamps: true})

module.exports = mongoose.model("Share", ShareSchema)