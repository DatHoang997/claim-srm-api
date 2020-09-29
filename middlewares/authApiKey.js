const User = require("../models/UserModel")
const Website = require("../models/WebsiteModel")
const apiResponse = require("../helpers/apiResponse")

const authApiKey = async (req, res, next) => {
  let api_key = req.header('api-key')
  let website = await Website.findOne({api_key})
  if (website && api_key) {
    let merchant = await User.findOne({_id: website.user})
    req.merchant = merchant
    req.website = website
    next()
  } else {
    return apiResponse.unauthorizedResponse(res, "API Key is invalid")
  }
}

module.exports = authApiKey;
