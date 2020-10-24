var mongoose = require("mongoose")

var PrizeSchema = new mongoose.Schema(
  {
    name: {type: String, required: true, unique: true},
    percentage: {type: Number, required: true},
    limit: {type: Number, required: true},
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model("Prize", PrizeSchema)