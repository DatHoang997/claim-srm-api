var mongoose = require("mongoose")

var UserSchema = new mongoose.Schema({
	wallet_address: {type: String, required: false, unique: true},
	fb_id: {type: String, required: false, unique: true},
	claimed: {type: String, required: false, unique: false},
}, {timestamps: true})

module.exports = mongoose.model("User", UserSchema)