const User = require("../models/UserModel")
const { body, validationResult } = require("express-validator")
const apiResponse  = require("../helpers/apiResponse")
const auth = require("../middlewares/jwt")
const mongoose = require("mongoose")
const global = require("../helpers/global")
const { Account, Connection, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js')
const slnUtils = require("../helpers/slnUtils")
const Utils = require("../helpers/utils")
const {web3ws, web3eth} = require("../helpers/web3")
const firebase = require('../helpers/firebase')
const axios = require("axios")

mongoose.set("useFindAndModify", false)

exports.claimZSRM = [
  body("data", "data can not be empty.").notEmpty().trim(),
  body("signature", "signature can not be empty.").notEmpty().trim(),
  async function (req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array())
    }
    console.log(req.body)
    let fbId = req.body.data.slice(0, req.body.data.indexOf('.'))
    console.log('fb_id', fbId)
    let zsrmAddress = req.body.data.slice(req.body.data.indexOf('.') + 1, req.body.data.lastIndexOf('.'))
    console.log('zsrm', zsrmAddress)
    let user = await User.findOne({fb_id: fbId})
    console.log(user)
    // if (user.claimed == '1') { //disable when testing
    //   return apiResponse.successResponse(res, "already claimed") //disable when testing
    // } //disable when testing
    // let check = await User.findOne({wallet_address: zsrmAddress}) //disable when testing
    // if (check != null) { //disable when testing
    //   return apiResponse.successResponse(res, "already claimed") //disable when testing
    // } //disable when testing
    const wallet = await web3ws.eth.accounts.wallet.add(process.env.POC_PRIVATE_KEY);
    const pocBalance = await global.token_contract.methods.balanceOf(wallet.address).call({from: wallet.address, gasPrice: '0'})
    // if (parseFloat(pocBalance) - process.env.SRM_REWARD < 500000000000000000000) {
    //   // mailer.send('noreply@pocvietnam.com', 'im@loc.com.vn', "Pool's Warning!", "POC pool's balance is below 500")
    //   // mailer.send('noreply@pocvietnam.com', 'daohoangthanh@gmail.com', "Pool's Warning!", "POC Pool's balance is below 500")
    //   console.log('check balance')
    // }
    if (parseFloat(pocBalance) > process.env.SRM_REWARD) {
      try {
        global.token_contract.methods.transfer(zsrmAddress, process.env.SRM_REWARD)
        .send({from: wallet.address, gasPrice: '0'}
        ).then(async function (data) {
          const lastCheck = async () => {
            console.log('DONE')
            const check = await web3ws.eth.getTransaction(data.transactionHash)
            if (check.blockHash){
              clearInterval(checkFunction)
              await User.findOneAndUpdate({fb_id: fbId}, {$set:{wallet_address: zsrmAddress, claimed: 1}})
              return apiResponse.successResponse(res, "transfer success")
            }
          }
          let checkFunction = setInterval(lastCheck, 2000);
        })
      } catch(ex) {
        throw new Error('Cannot confirm', ex)
      }
    } else {
      throw new Error('not enough POC')
      // mailer.send('noreply@pocvietnam.com', 'im@loc.com.vn', "POC pool's balance is running out")
      // mailer.send('noreply@pocvietnam.com', 'daohoangthanh@gmail.com', "POC Pool's balance is running out")
    }
  }
];

// r8YtgnjtH3rh4Wj2VYGWawXBNgapSohvgMJETGwNYDR  receive
exports.swapSRM = [
  // body("data", "data can not be empty.").notEmpty().trim(),
  // body("signature", "signature can not be empty.").notEmpty().trim(),
  async function (req, res) {
    // const errors = validationResult(req)
    // if (!errors.isEmpty()) {
    //   return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array())
    // }
    const connection = new Connection('http://testnet.solana.com', 'recent');

    let { address, publicKey, account, privateKey } = await Utils.getSolanaAccountAtIndex(process.env.MNEMONIC)
    const recentBlockhash = await connection.getRecentBlockhash('recent')
    let transaction = new Transaction({recentBlockhash: recentBlockhash.blockhash})
    .add(
      slnUtils.transfer({
        owner: account.publicKey, // from SOL address
        source: new PublicKey('3F4EXyNCLxxk5auyS1aN8rcMX6MGvTqdmEraN2CHtjec'), // from SRM address
        destination: new PublicKey('6VTiGtHw67jJxnftBMbmnE5g8jsGJhYfXm55csfWmS5W'), // to SRM address
        amount: 10 //ok
      }),
    )

    console.log(transaction)
    return connection.sendTransaction(transaction, [account]).then(transfer=>{
      console.log(transfer)
      return apiResponse.successResponseWithData(res, "transfer success", transfer)
    }).catch(error=>{
      console.log("error",error)
      throw new Error(error)
    })
  }
];

exports.download = [
  async function (req, res) {
    let refLink = await firebase.createRefLink(req.params.fb_id, req.params.ps_id)
    console.log(req.params)
    let user = await User.findOne({fb_id: req.params.fb_id})
    if (!user) {
      let data = new User({
        fb_id: req.params.fb_id,
        claimed: 0
      })
      data.save()
    }
    console.log(refLink)
    res.redirect(refLink)
    // return apiResponse.successResponseWithData(res, "Success", refLink)
    // }
  }
]

exports.getUser = [
  async function (req, res) {
    let user = await User.findOne({fb_id: req.params.fb_id})
    console.log(user)
    if (user.claimed == 0) {
      return apiResponse.successResponseWithData(res, "this FB is not claimed yet", false)
    } else {
      return apiResponse.successResponseWithData(res, "this FB is already claimed", true)
    }

  }
]
