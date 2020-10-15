var mongoose = require("mongoose")

var ClaimSrmSchema = new mongoose.Schema({
	tx_hash: {type: String, required: false, unique: true}
}, {timestamps: true})

module.exports = mongoose.model("ClaimSrm", ClaimSrmSchema)