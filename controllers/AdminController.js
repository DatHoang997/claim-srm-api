const Website             = require("../models/WebsiteModel")
const User                = require("../models/UserModel")
const apiResponse         = require("../helpers/apiResponse")
const Category            = require("../models/CategoryModel")
const auth                = require("../middlewares/jwt")
const admin               = require("../middlewares/admin")
const merchantManager     = require("../middlewares/merchantManager")
let mongoose              = require("mongoose")
let generateUUID          = require("../helpers/generateUUID")

let {merchant_status} = require("../helpers/constants")
mongoose.set("useFindAndModify", false)

exports.acceptWebsite = [
  auth,
  merchantManager,
  async function (req, res) {
    let website = await Website.findById(req.params.id)
    if (website === null) {
      return apiResponse.notFoundResponse(res, "Website not exists with this id")
    } else {
      let apiKey;
      while (1) {
        apiKey = generateUUID()
        let checkUniqueApiKey = await Website.findOne({api_key: apiKey})
        if(!checkUniqueApiKey) break
      }
      Website.findByIdAndUpdate(req.params.id, {'accepted': 1, 'api_key': apiKey}, function (err) {
        if (err) {
          return apiResponse.ErrorResponse(res, err)
        } else {
          return apiResponse.successResponse(res, "Accept website Success")
        }
      })
    }
  }
];

exports.rejectWebsite = [
  auth,
  merchantManager,
  async function (req, res) {
    let website = await Website.findById(req.params.id)
    if (website === null) {
      return apiResponse.notFoundResponse(res, "Website not exists with this id")
    } else {
      Website.findByIdAndUpdate(req.params.id, {'accepted': 2}, function (err) {
        if (err) {
          return apiResponse.ErrorResponse(res, err)
        } else {
          return apiResponse.successResponse(res, "Reject website Success")
        }
      })
    }
  }
];

exports.pauseWebsite = [
  auth,
  merchantManager,
  async function (req, res) {
    let website = await Website.findById(req.params.id)
    if (website === null) {
      return apiResponse.notFoundResponse(res, "Website not exists with this id")
    } else {
      Website.findByIdAndUpdate(req.params.id, {'accepted': 3}, function (err) {
        if (err) {
          return apiResponse.ErrorResponse(res, err)
        } else {
          return apiResponse.successResponse(res, "pause website Success")
        }
      })
    }
  }
];

exports.listWaitingAccept = [
  auth,
  merchantManager,
  async function (req, res) {
    let listWebsite = await Website.find({$or:[{accepted: 0}, {accepted: 3}]})
    for(let websiteKey in listWebsite) {
      let cate = await Category.findById(listWebsite[websiteKey].category)
      if (listWebsite[websiteKey].type== 'sale') {
        listWebsite[websiteKey].set('cate', cate.title, {strict: false});
      }
      let creator = await User.findById(listWebsite[websiteKey].user)
      listWebsite[websiteKey].set('creator', creator.username, {strict: false});
    }
    return apiResponse.successResponseWithData(res, "Operation success", listWebsite)
  }
]

exports.listAccepted = [
  auth,
  async function (req, res) {
    let listWebsite = await Website.find({accepted: 1})
    for(let websiteKey in listWebsite) {
      let cate = await Category.findById(listWebsite[websiteKey].category)
      if (listWebsite[websiteKey].type == 'sale') {
        listWebsite[websiteKey].set('cate', cate.title, {strict: false});
      }
      let creator = await User.findById(listWebsite[websiteKey].user)
      listWebsite[websiteKey].set('creator', creator.username, {strict: false});
    }
    return apiResponse.successResponseWithData(res, "Operation success", listWebsite)
  }
];


exports.acceptMerchant = [
  auth,
  merchantManager,
  async function (req, res) {
    let user = await User.findById(req.params.userId)
    if(user === null) return apiResponse.notFoundResponse(res, "Website not exists with this id")
    if(user.merchantStatus === merchant_status.REQUESTING || user.merchantStatus === merchant_status.PAUSE) {
      // let apiKey;
      // while (1) {
      //   apiKey = generateUUID()
      //   let userCheckUniqueApiKey = await User.findOne({api_key: apiKey})
      //   if(!userCheckUniqueApiKey) break
      // }
      //
      // user.api_key = apiKey
      user.merchantStatus = merchant_status.IS_MERCHANT
      user.save()
      return apiResponse.successResponse(res, "Accept merchant Success")
    } else {
      apiResponse.ErrorResponse(res, "This user have not registered become to merchant")
    }
  }
];

exports.rejectMerchant = [
  auth,
  merchantManager,
  async function (req, res) {
    let user = await User.findById(req.params.userId)
    if(user === null) return apiResponse.notFoundResponse(res, "Website not exists with this id")
    if(user.merchantStatus === merchant_status.REQUESTING || user.merchantStatus === merchant_status.PAUSE || user.merchantStatus === merchant_status.IS_MERCHANT) {
      user.merchantStatus = merchant_status.IS_NOT_MERCHANT
      user.save()
      return apiResponse.successResponse(res, "Reject merchant Success")
    } else {
      apiResponse.ErrorResponse(res, "This user have not registered become to merchant")
    }
  }
];

exports.pauseMerchant = [
  auth,
  merchantManager,
  async function (req, res) {
    let user = await User.findById(req.params.userId)
    if(user === null) return apiResponse.notFoundResponse(res, "Website not exists with this id")
    if(user.merchantStatus === merchant_status.REQUESTING || user.merchantStatus === merchant_status.PAUSE || user.merchantStatus === merchant_status.IS_MERCHANT)  {
      user.merchantStatus = merchant_status.PAUSE
      user.save()
      return apiResponse.successResponse(res, "Reject merchant Success")
    } else {
      apiResponse.ErrorResponse(res, "This user have not registered become to merchant")
    }
  }
];

exports.listRegister = [
  auth,
  merchantManager,
  async function (req, res) {
    let users = await User.find({$or:[{merchantStatus: merchant_status.REQUESTING}, {merchantStatus: merchant_status.PAUSE}]})
    return apiResponse.successResponseWithData(res, "All user requesting to become merchant", users)
  }
];

exports.listRegistered = [
  auth,
  merchantManager,
  async function (req, res) {
    let users = await User.find({merchantStatus: merchant_status.IS_MERCHANT})
    return apiResponse.successResponseWithData(res, "All merchant", users)
  }
];
