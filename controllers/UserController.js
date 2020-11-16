const User = require("../models/UserModel")
const FbUser = require('../models/FbUserModel')
const ClaimSrm = require("../models/ClaimSrmModel")
const { body, validationResult } = require("express-validator")
const apiResponse  = require("../helpers/apiResponse")
const mongoose = require("mongoose")
const global = require("../helpers/global")
const { Connection, PublicKey, Transaction } = require('@solana/web3.js')
const slnUtils = require("../helpers/slnUtils")
const Utils = require("../helpers/utils")
const {web3ws, web3eth} = require("../helpers/web3")
const firebase = require('../helpers/firebase')
const { setQueues } = require('bull-board')
const Queue = require('bull');
const bigDecimal = require('js-big-decimal');
const { weiToPOC, srmToWei, weiToSRM } = require('../helpers/utils')
const { sendLuckyWheelLink } = require('../services/pancake')
var upload = require('../helpers/upload')
const Share = require('../models/ShareModel')
const mailer = require("../helpers/mailer")
var upload = require('../helpers/upload')
mongoose.set("useFindAndModify", false)

// 6VTiGtHw67jJxnftBMbmnE5g8jsGJhYfXm55csfWmS5W

const swapQueues = new Queue('swap', {redis: {port: process.env.REDIS_PORT, host: '127.0.0.1'}});
const claimQueues = new Queue('claim', {redis: {port: process.env.REDIS_PORT, host: '127.0.0.1'}});
const connection = new Connection('https://solana-api.projectserum.com', 'recent');
let sendEmail = true

claimQueues.process(async function(job, done) {
  console.log(job.data)
  // let acc = await web3ws.eth.accounts.recover(job.data.message, job.data.signature).toLowerCase()
  let fbId = job.data.message.slice(0, job.data.message.indexOf('.'))
  console.log('fb_id', fbId)
  let asrmAddress = job.data.message.slice(job.data.message.indexOf('.') + 1, job.data.message.lastIndexOf('.'))
  console.log('asrm', asrmAddress)
  let user = await User.findOne({fb_id: fbId})
  console.log(user)
  if (user.fb_id == fbId) {
    const wallet = await web3ws.eth.accounts.wallet.add(process.env.ASRM_PRIVATE_KEY);
    console.log('wallet', wallet)
    console.log('@@@@@', global.token_contract.methods)
    const asrmBalance = await global.token_contract.methods.balanceOf(wallet.address).call({from: wallet.address, gasPrice: '0'})
    console.log('asrmBalance', asrmBalance)
    // if (parseFloat(pocBalance) - process.env.ASRM_REWARD < 500000000000000000000) {
    //   // mailer.send('noreply@pocvietnam.com', 'im@loc.com.vn', "Pool's Warning!", "POC pool's balance is below 500")
    //   // mailer.send('noreply@pocvietnam.com', 'daohoangthanh@gmail.com', "Pool's Warning!", "POC Pool's balance is below 500")
    //   console.log('check balance')
    // }
    if (parseFloat(asrmBalance) > process.env.ASRM_REWARD) {
      try {
        console.log('try')
        global.token_contract.methods.transfer(asrmAddress, process.env.ASRM_REWARD)
        .send({from: wallet.address, gasPrice: '0'}
        ).then(async function (data) {
          console.log(data)
          await User.findOneAndUpdate({fb_id: fbId}, {$set:{wallet_address: asrmAddress, claimed: '1'}})
          job.progress(100)
          done()
        })
      } catch(ex) {
        throw new Error('Cannot confirm', ex)
      }
    } else {
      throw new Error('not enough aSRM')
      // mailer.send('noreply@pocvietnam.com', 'im@loc.com.vn', "POC pool's balance is running out")
      // mailer.send('noreply@pocvietnam.com', 'daohoangthanh@gmail.com', "POC Pool's balance is running out")
    }
  } else {
    throw new Error('Cannot confirm fbid', ex)
  }
})

swapQueues.process(async function(job, done) {
  console.log(job.data)
  let claimSrm = await ClaimSrm.findOne({tx_hast : job.data.txHash})
  console.log('txhash',claimSrm)
  console.log(claimSrm)
  if (claimSrm != null) {
    throw new Error('this txHash is already claimed')
  }
  let confirm = await web3ws.eth.getTransaction(job.data.txHash)
  console.log('transaction', confirm)
  let amount = weiToPOC(await web3ws.utils.hexToNumberString('0x' + confirm.input.slice(74)))
  console.log(amount, await web3ws.utils.hexToNumberString('0x' + confirm.input.slice(74)))
  let wallet = await web3ws.eth.accounts.recover(job.data.message, job.data.signature).toLowerCase()
  let srmAddress = job.data.message.slice(job.data.message.indexOf('.') + 1, job.data.message.lastIndexOf('.'))
  console.log('srmAddress',srmAddress)
  let result = srmToWei(bigDecimal.multiply(amount, 0.001))
  console.log('result', result, confirm.to == process.env.ASRM_CONTRACT_ADDRESS, confirm.from.toLowerCase() == wallet)
  if (confirm.to == process.env.ASRM_CONTRACT_ADDRESS && confirm.from.toLowerCase() == wallet) {
    let { address, publicKey, account, privateKey } = await Utils.getSolanaAccountAtIndex(process.env.SRM_MNEMONIC)
    console.log('@@@@@')
    try {
      const publicKey = new PublicKey(process.env.SRM_ADDRESS)
      const accountInfo = await connection.getAccountInfo(publicKey)
      let balance
      let amount
      console.log('accountInfo',accountInfo)
      if (!accountInfo) {
        throw new Error('No acount info')
      }
      console.log('accountInfo.owner', accountInfo.owner)
      console.log('accountInfo.owner.toBase58()',accountInfo.owner.toBase58() == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      if (accountInfo.owner.toBase58() == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        const data = slnUtils.parseTokenAccountData(accountInfo.data)
        if (data.amount < 1500000 && sendEmail == true) {
          sendEmail = false
          console.log('cucu')
          mailer.send('noreply@ezDeFi.com', 'dathoang997@gmail.com', "Bounty Warning!", "SRM pool's balance is below 200$")
        }
        if (data.amount > 1500000 && sendEmail == false) {
          sendEmail == true
        }
        // if (data.amount < 400000) {
        //   console.log('moneyyyyy')
        //   throw new Error('False')
        // }
        // let recentBlockhash = await connection.getRecentBlockhash('recent')
        // console.log('recentBlockhash',recentBlockhash)
        let transaction = new Transaction()
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
          let newTxHash = new ClaimSrm ({
            tx_hash: job.data.txHash,
            srm_tx_hash: transfer
          })
          newTxHash.save()
          job.progress(100)
          done()
          console.log('transfer',transfer)
        }).catch(error=>{
          console.log("error",error)
          throw new Error('transaction false', error)
        })
      }
      // if (!mint) {
      //   console.log('!mint')
      //   throw new Error('False')
      // }
    } catch (e) {
      throw new Error('Cannot confirm try catch')
    }
  } else {
    throw new Error('Cannot confirm')
  }
})

setQueues([swapQueues, claimQueues])

exports.claimASRM = [
  body("message", "message can not be empty.").not().isEmpty().trim(),
  body("signature", "signature can not be empty.").not().isEmpty().trim(),
  async function (req, res) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array())
    }
    console.log(req.body)
    const run = () => {
      claimQueues.add({
        type: 0,
        signature: req.body.signature,
        message: req.body.message,
      }, {lifo: true} );
      return apiResponse.successResponseWithData(res, "claim", req.body.amount)
    }
    setTimeout(run, 1000)
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
      swapQueues.add({
        message: req.body.message,
        signature: req.body.signature,
        txHash: req.body.txHash,
      }, {lifo: true} );
      return apiResponse.successResponseWithData(res, "swap success", req.body.amount)
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
  }
]

exports.getUser = [
  async function (req, res) {
    let user = await User.findOne({fb_id: req.params.fb_id})

    if (user == null) {
      return apiResponse.ErrorResponse(res, "not found fb_id")
    }
    if (user.claimed == '0') {
      return apiResponse.successResponseData(res, user)
    } else {
    return apiResponse.successResponseData(res, user)
    }
  }
]

exports.addSpinNumber = [
  async function (req, res) {
    let fbId = req.body.user_fb_id
    let friendFbId = req.body.friend_fb_id
    let user = await User.findOne({fb_id: fbId})
    if(!user) {
      console.log('abc')
      return apiResponse.successResponse(res)
    }
    let data = await Share.find({fb_id: fbId})
    let exist = data.find(item => item.fb_id == fbId && item.friend_fb_id == friendFbId);
    if(data.length >= process.env.MAX_SHARE_TIME || exist) {
      console.log('def')
      return apiResponse.successResponse(res)
    }
    let share = new Share({fb_id: fbId, friend_fb_id: friendFbId});
    await share.save()
    await User.findOneAndUpdate({fb_id: fbId},{$set:{spin_number: user.spin_number + 1}})

    console.log('xyz')
    return apiResponse.successResponse(res)
  }
]

exports.redirectToChatbot = [
  function(req, res) {
    res.redirect(`${process.env.FACEBOOK_CHATBOT_URL}${req.params.fb_id}`)
  }
]

exports.getWallet = [
  async function (req, res) {
    console.log(req.params.wallet)
    let user = await User.findOne({wallet_address: req.params.wallet})
    console.log(user)
    if (user == null) {
      return apiResponse.ErrorResponse(res, "not found wallet")
    }
    if (user.wallet_address) {
      return apiResponse.successResponseWithData(res, "Success", user.wallet_address)
    }
  }
]

exports.info = [
  upload.array('files'),
  async function (req, res) {
    console.log(req.body)
    let check = await User.findOne({wallet_address: req.body.wallet})
    if (!check) {
      return apiResponse.ErrorResponse(res, "wrong")
    }
    if (!check.name) {
      console.log('innnnn')
      try {
        let user = await User.findOneAndUpdate({wallet_address: req.body.wallet}, {$set:{name: req.body.name, address: req.body.address, phone: req.body.phoneNumber, viettel: req.body.viettel}})
        console.log(user)
        if (user) return apiResponse.successResponseWithData(res, "Success", user)
        else return apiResponse.ErrorResponse(res, "false")
      } catch (error) {
        return apiResponse.ErrorResponse(res, "not found wallet")
      }
    } else {
      return apiResponse.ErrorResponse(res, "filled")
    }
  }
]

exports.getInfo = [
  upload.array('files'),
  async function (req, res) {
    console.log(req.params.wallet)
    let user = await User.findOne({wallet_address: req.params.wallet})
    console.log(user)
    if (!user.name) {
      console.log(user)
      return apiResponse.successResponseWithData(res, "false", user)
    }
    if (user.name) {
      console.log('true', user)
      return apiResponse.successResponseWithData(res, "Success", user)
    }
  }
]

exports.sendLuckyWheel = [
  function(req, res) {
    let fbId = req.body.fbId;
    FbUser.findOne({fb_id: fbId}, function(error, result) {
      if(error || !result || !result.conversation_id || !result.customer_id) {
        return;
      }
      sendLuckyWheelLink(result.conversation_id, result.fb_id, result.customer_id);
    });
    return apiResponse.successResponse(res, 'Lucky wheel link sent');
  }
]

exports.redirectLuckyWheel = [
  function (req, res) {
    console.log('query', req.query);
    if(!req.query.fbId) {
      res.redirect(process.env.EZDEFI_HOME);
    }
    res.redirect(`${process.env.FB_LUCKY_WHEEL_URL}?mid=${req.query.fbId}`)
  }
]
