var mongoose = require("mongoose")

var ClaimSrmSchema = new mongoose.Schema({
	tx_hash: {type: String, required: false, unique: true},
	tx_hash_srm: {type: String},
	status: {type: Boolean, required: false},
}, {timestamps: true})

module.exports = mongoose.model("ClaimSrm", ClaimSrmSchema)