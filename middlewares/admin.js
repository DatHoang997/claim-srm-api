const global = require('../helpers/global')
const User = require("../models/UserModel")
const apiResponse = require("../helpers/apiResponse")

const checkAdmin = async (req, res, next) => {
  let user = await User.findById(req.user._id)
  if (user.role == "administrator") {
    next()
  }
  // let isAdmin = await global.citizen_contract.methods.isAdmin(user.wallet_address).call()
  // if (isAdmin) {

  // }
  else return apiResponse.unauthorizedResponse(res, "You must be Admin to access this end point")
}

module.exports = checkAdmin;
