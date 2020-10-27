var mongoose = require("mongoose")

var UserSchema = new mongoose.Schema({
	wallet_address: {type: String, required: false, unique: true,  sparse: true},
	fb_id: {type: String, required: false, unique: true},
	claimed: {type: String, required: false, unique: false},
	name: {type: String, required: false, unique: false},
	phone: {type: String, required: false, unique: false},
	address: {type: String, required: false, unique: false},
	viettel: {type: String, required: false, unique: false},
}, {timestamps: true})

module.exports = mongoose.model("User", UserSchema)