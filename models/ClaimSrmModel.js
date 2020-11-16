var mongoose = require("mongoose")

var ClaimSrmSchema = new mongoose.Schema({
	tx_hash: {type: String, required: false, unique: true},
	srm_tx_hash: {type: String, required: false},
	status: {type: Boolean, required: false},
}, {timestamps: true})

module.exports = mongoose.model("ClaimSrm", ClaimSrmSchema)