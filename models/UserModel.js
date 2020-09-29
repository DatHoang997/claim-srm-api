var mongoose = require("mongoose")

var UserSchema = new mongoose.Schema({
	username: {type: String, required: true, unique: true},
	api_key: {type: String},
	ref_by: {type: String, required: false},
	wallet_address: {type: String, required: false, unique: true},
	email: {type: String, required: false},
	password: {type: String, required: false},
	isConfirmed: {type: Boolean, required: false, default: 0},
	confirmOTP: {type: String, required:false},
	otpTries: {type: Number, required:false, default: 0},
	merchantStatus: {type: Number, required: false, default: 0},
	refLink: {type: String, required: false},
	role: {type: String},
	exchange_limit: {type: String}
}, {timestamps: true})

// Virtual for user's full name
// UserSchema
// 	.virtual("fullName")
// 	.get(function () {
// 		return this.firstName + " " + this.lastName;
// 	})

module.exports = mongoose.model("User", UserSchema)