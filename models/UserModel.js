var mongoose = require("mongoose")

var UserSchema = new mongoose.Schema({
	wallet_address: {type: String, required: false, unique: true,  sparse: true},
	fb_id: {type: String, required: false, unique: true},
	claimed: {type: String, required: false, unique: false},
	spin_number: {type: Number, required: true, default: 3}
}, {timestamps: true})

module.exports = mongoose.model("User", UserSchema)