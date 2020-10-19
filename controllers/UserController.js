const User = require("../models/UserModel")
const FbUser = require('../models/FbUserModel')
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

// 6VTiGtHw67jJxnftBMbmnE5g8jsGJhYfXm55csfWmS5W

const queues = new Queue('queue', {redis: {port: process.env.REDIS_PORT, host: '127.0.0.1'}});
const connection = new Connection('http://testnet.solana.com', 'recent');

  queues.process(async function(job, done) {
    // done()
    if (job.data.type == 0) {
      console.log(job.data)
      // let acc = await web3ws.eth.accounts.recover(job.data.message, job.data.signature).toLowerCase()
      let fbId = job.data.message.slice(0, job.data.message.indexOf('.'))
      console.log('fb_id', fbId)
      let asrmAddress = job.data.message.slice(job.data.message.indexOf('.') + 1, job.data.message.lastIndexOf('.'))
      console.log('asrm', asrmAddress)
      let user = await User.findOne({fb_id: fbId})
      console.log(user)
      console.log(user.wallet_address)
      if (user.fb_id == fbId) {
        const wallet = await web3ws.eth.accounts.wallet.add(process.env.ASRM_PRIVATE_KEY);
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
                if (check.blockHash) {
                  clearInterval(checkFunction)
                  await User.findOneAndUpdate({fb_id: fbId}, {$set:{wallet_address: asrmAddress, claimed: '1'}})
                  job.progress(100)
                  done()
                }
              }
              let checkFunction = setInterval(lastCheck, 2000);
            })
          } catch(ex) {
            throw new Error('Cannot confirm', ex)
          }
        } else {
          throw new Error('not enough aSRM')
          // mailer.send('noreply@pocvietnam.com', 'im@loc.com.vn', "POC pool's balance is running out")
          // mailer.send('noreply@pocvietnam.com', 'daohoangthanh@gmail.com', "POC Pool's balance is running out")
        }
      }
    } else if (job.data.type == 1) {
      console.log(job.data)
      let claimSrm = await ClaimSrm.findOne({tx_hast : job.data.txHash})
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

        // let accountInfo = await connection.getAccountInfo(new PublicKey(address))
        // console.log(accountInfo, accountInfo.owner)
        // let mint, amount
        // if (!accountInfo) {
        //   console.log('!accountInfo')
        // }
        // console.log(accountInfo.owner.toBase58())
        // console.log('aloooo', new PublicKey(
        //   'G5xnaQGf5HmXSGqCCoQHWQDREgqzXRneFQY6sYAzVWc6',
        // ))
        // if (accountInfo.owner.toBase58() == new PublicKey('G5xnaQGf5HmXSGqCCoQHWQDREgqzXRneFQY6sYAzVWc6',)) {
        //   console.log('innnnnnnnnnn')
        //   console.log(slnUtils.parseTokenAccountData(accountInfo.data))
        //   const data = slnUtils.parseTokenAccountData(accountInfo.data)
        //   mint = data.mint
        //   amount = data.amount
        //   console.log('mint', mint, 'balance', amount)
        // }
        // if (!mint) {
        //   console.log('!mint')
        // }

        let recentBlockhash = await connection.getRecentBlockhash('recent')
        console.log('recentBlockhash',recentBlockhash)
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
      } else {
        throw new Error('False')
      }
    }
  })

  setQueues(queues)

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
      queues.add({
        type: 0,
        signature: req.body.signature,
        message: req.body.message,
      }, {lifo: true} );
      return apiResponse.successResponseWithData(res, "transfer success", req.body.amount)
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
      queues.add({
        type: 1,
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
    if (user.claimed == '0') {
      return apiResponse.successResponseWithData(res, "Mời bạn nhấn nút 'Nhận bounty' để chúng tôi chuyển tới bạn 300 aSRM", false)
    } else {
      return apiResponse.successResponseWithData(res, "this FB is already claimed", true)
    }

  }
]

const BOTBANHANG_FORM_URL = 'https://botbanhang.vn/app/1795330330742938/form/5f85729c817b370012f34006';

exports.sendForm = [
  function(req, res) {
    let fbId = req.body.fbId;
    FbUser.findOne({fb_id: fbId}, function(error, result) {
      if(error || !result || !result.conversation_id) {
        return;
      }
      let conversationId = result.conversation_id;
      let url = 'https://api-bounty.ezdefi.com/form';
      axios({
        method: 'post',
        url: `${ENDPOINT}conversations/${conversationId}/messages?access_token=${ACCESS_TOKEN}`,
        headers: {
          'conversation_id': conversationId,
          'page_id': process.env.FB_PAGE_ID
        },
        data: {
          'message': `Chúc mừng bạn đã nhận được Bounty từ ezDeFi. Chúng tôi vẫn còn những phần quà hấp dẫn dành cho bạn! Truy cập vào đường link này: ${url} để chúng tôi gửi quà tặng Cáp Kingdom 99k với giá 0 đồng và nhận cơ hội quay trúng Iphone Promax 11`,
          'action': 'reply_inbox',
          'thread_key': process.env.FB_THREAD_ID,
        }
      });
    });
  }
]

exports.redirectForm = [
  function (req, res) {
    res.redirect(BOTBANHANG_FORM_URL)
  }
]
