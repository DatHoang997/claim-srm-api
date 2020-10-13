const User = require("../models/UserModel")
const ClaimSrm = require("../models/ClaimSrmModel")
const { body, validationResult, Result } = require("express-validator")
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
const { setQueues } = require('bull-board')
var Queue = require('bull');
const bigDecimal = require('js-big-decimal');
const {
  weiToPOC,
  srmToWei
} = require('../helpers/utils')

mongoose.set("useFindAndModify", false)

const queues = new Queue('queue', {redis: {port: process.env.REDIS_PORT, host: '127.0.0.1'}});
// console.log(queues)
const connection = new Connection('http://testnet.solana.com', 'recent');
  queues.process(async function(job, done) {
    // done()
    console.log(job.data)
    let claimSrm = await ClaimSrm.findOne({tx_hast : job.data.txHash})
    console.log(claimSrm)
    if (claimSrm != null) {
      console.log('falseeeeeeeeeee')
    }
    let confirm = await web3ws.eth.getTransaction(job.data.txHash)
    console.log('transaction', confirm)
    let amount = weiToPOC(await web3ws.utils.hexToNumberString('0x' + confirm.input.slice(74)))
    console.log(amount, await web3ws.utils.hexToNumberString('0x' + confirm.input.slice(74)))
    let wallet = await web3ws.eth.accounts.recover(job.data.message, job.data.signature).toLowerCase()
    let srmAddress = job.data.message.slice(job.data.message.indexOf('.') + 1, job.data.message.lastIndexOf('.'))
    console.log('srmAddress',srmAddress)
    let result = srmToWei(bigDecimal.multiply(amount, 1000))
    console.log('result', result)
    console.log(confirm.from.toLowerCase() == wallet,confirm.from , wallet)
    if (confirm.to == process.env.POC_CONTRACT_ADDRESS && confirm.from.toLowerCase() == wallet) {
      let { address, publicKey, account, privateKey } = await Utils.getSolanaAccountAtIndex(process.env.MNEMONIC)
      let recentBlockhash = await connection.getRecentBlockhash('recent')
      let transaction = new Transaction({recentBlockhash: recentBlockhash.blockhash})
      .add(
        slnUtils.transfer({
          owner: account.publicKey, // from SOL address
          source: new PublicKey(process.env.SRM_ADDRESS), // from SRM address
          destination: new PublicKey(srmAddress), // to SRM address
          amount: result //ok
        })
      )
      console.log(transaction)
      connection.sendTransaction(transaction, [account]).then(transfer=>{
        job.progress(100)
        done()
        console.log('transfer',transfer)
      }).catch(error=>{
        console.log("error",error)
        throw new Error(error)
      })
    }
  })

  setQueues(queues)

exports.claimASRM = [
  body("data", "data can not be empty.").not().isEmpty().trim(),
  body("signature", "signature can not be empty.").not().isEmpty().trim(),
  async function (req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array())
    }
    console.log(req.body)
    let fbId = req.body.data.slice(0, req.body.data.indexOf('.'))
    console.log('fb_id', fbId)
    let asrmAddress = req.body.data.slice(req.body.data.indexOf('.') + 1, req.body.data.lastIndexOf('.'))
    console.log('asrm', asrmAddress)
    let user = await User.findOne({fb_id: fbId})
    console.log(user)
    // if (user.claimed == '1') { //disable when testing
    //   return apiResponse.successResponse(res, "already claimed") //disable when testing
    // } //disable when testing
    // let check = await User.findOne({wallet_address: asrmAddress}) //disable when testing
    // if (check != null) { //disable when testing
    //   return apiResponse.successResponse(res, "already claimed") //disable when testing
    // } //disable when testing
    const wallet = await web3ws.eth.accounts.wallet.add(process.env.POC_PRIVATE_KEY);
    const pocBalance = await global.token_contract.methods.balanceOf(wallet.address).call({from: wallet.address, gasPrice: '0'})
    // if (parseFloat(pocBalance) - process.env.ASRM_REWARD < 500000000000000000000) {
    //   // mailer.send('noreply@pocvietnam.com', 'im@loc.com.vn', "Pool's Warning!", "POC pool's balance is below 500")
    //   // mailer.send('noreply@pocvietnam.com', 'daohoangthanh@gmail.com', "Pool's Warning!", "POC Pool's balance is below 500")
    //   console.log('check balance')
    // }
    if (parseFloat(pocBalance) > process.env.ASRM_REWARD) {
      try {
        global.token_contract.methods.transfer(asrmAddress, process.env.ASRM_REWARD)
        .send({from: wallet.address, gasPrice: '0'}
        ).then(async function (data) {
          const lastCheck = async () => {
            console.log('DONE')
            const check = await web3ws.eth.getTransaction(data.transactionHash)
            if (check.blockHash){
              clearInterval(checkFunction)
              await User.findOneAndUpdate({fb_id: fbId}, {$set:{wallet_address: asrmAddress, claimed: 1}})
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
  body("message", "data can not be empty.").not().isEmpty().trim(),
  body("signature", "signature can not be empty.").not().isEmpty().trim(),
  body("txHash", "txHash can not be empty.").not().isEmpty().trim(),
  async function (req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array())
    }

    const run = () => {
      queues.add({
        message: req.body.message,
        signature: req.body.signature,
        txHash: req.body.txHash,
      }, {lifo: true} );
      return apiResponse.successResponseWithData(res, "transfer success", req.body.amount)
    }
    setTimeout(run, 1000)
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
