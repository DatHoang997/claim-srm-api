const User = require("../models/UserModel")
const { body, validationResult } = require("express-validator")
const apiResponse  = require("../helpers/apiResponse")
const auth = require("../middlewares/jwt")
var mongoose = require("mongoose")
var {merchant_status} = require("../helpers/constants")
const global = require("../helpers/global")

mongoose.set("useFindAndModify", false)

/**
 * List Book.
 *
 * @returns {Object}
 */
exports.registerMerchant = [
  auth,
  async function (req, res) {
    const user = await User.findById(req.user._id)
    if (user.merchantStatus === merchant_status.IS_NOT_MERCHANT) {
      user.merchantStatus = merchant_status.REQUESTING
      user.save()
      return apiResponse.successResponseWithData(res, "Register merchant Success", user)
    } else {
      apiResponse.ErrorResponse(res, "This user have not registered become to merchant")
    }
  }
];

exports.checkUserName = [
  async function (req, res) {
    return await global.citizen_contract.methods.citizen(req.params.username.toLowerCase()).call()
      .then(function(result){
        if (result.wallet_address != "0x0000000000000000000000000000000000000000") {
          apiResponse.successResponse(res, "success")
        } else {
          apiResponse.ErrorResponse(res, "User does not exist")
        }
      })
  }
];

exports.checkAdmin = [
  auth,
  async function (req, res) {
    const user = await User.findById(req.user._id)
    if (user.role === 'administrator') {
      return apiResponse.successResponseWithData(res, "is Admin", true)
    }else {
      return apiResponse.successResponseWithData(res, "is not Admin", false)
    }
  }
];

exports.checkMerchantManager = [
  auth,
  async function (req, res) {
    const user = await User.findById(req.user._id)
    if (user.role === "merchant_manager") {
      return apiResponse.successResponseWithData(res, "is merchant manager", true)
    }else {
      return apiResponse.successResponseWithData(res, "is not merchant manager", false)
    }
  }
];

exports.getEmail = [
  auth,
  async function (req, res) {
    const user = await User.findById(req.user._id)
    if (user) {
      return apiResponse.successResponseWithData(res, "Email", user.email)
    }else {
      apiResponse.ErrorResponse(res, "user does not exist")
    }
  }
];

exports.getMaxAllocation = [
  auth,
  async function (req, res) {
    const user = await User.findById(req.user._id)
    if (user) {
      return apiResponse.successResponseWithData(res, "max allocation", user.exchange_limit)
    }else {
      apiResponse.ErrorResponse(res, "user does not exist")
    }
  }
];

exports.changeEmail = [
  auth,
  body("email").isLength({ min: 1 }).trim().withMessage("Email must be specified.")
		.isEmail().withMessage("Email must be a valid email address.").custom((value) => {
			return User.findOne({email : value.toLowerCase()}).then((user) => {
				if (user) {
					return Promise.reject("E-mail already in use")
				}
			})
		}),
  async function (req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(res, "Email must be a valid email address.", errors.array())
    }
    const user = await User.findById(req.user._id)
    if (user) {
      user.email = req.body.email
      user.save()
      return apiResponse.successResponseWithData(res, "Email", user.email)
    }else {
      apiResponse.ErrorResponse(res, "user does not exist")
    }
  }
];

exports.getLimit = [
  auth,
  async function (req, res) {
    const user = await User.findById(req.user._id)
    if (user) {
      return apiResponse.successResponseWithData(res, "Limit", user.exchange_limit)
    }else {
      apiResponse.ErrorResponse(res, "user does not exist")
    }
  }
];
