let global = require('../helpers/global')
const constants = require('../helpers/constants')
const utils = require('../helpers/utils')
const {web3ws} = require("../helpers/web3")
const init_cursor = 30307000
const block_to_scan = 500
const Block = require("../models/BlockModel")
const Transaction = require("../models/TransactionModel")
const User = require("../models/UserModel")
const Alias = require("../models/AliasModel")
const {notifyNewTx, notifyDistributeTx} = require('./sendMailService')

let latest_network_block = false
let cursor = 0

module.exports = async function (app) {
    if (cursor < init_cursor) {
        cursor = init_cursor
        let db_last_block = await Block.findOne().sort({ number: -1 }).catch(console.error)
        if (db_last_block) cursor = Math.max(cursor, db_last_block.number)
    }
    regenDateTime()
    keepUpdating()
    watchNewBlock()
}

async function watchNewBlock() {
    web3ws.eth.subscribe('newBlockHeaders')
        .on("data", async function (new_block) {
            latest_network_block = new_block
            // Remove all records which < block_number - 10000
            Block.deleteMany({ number: { $lte: cursor - 1000 } }, function (err, res) {
                if (err) console.log(err)
            })

            if (cursor >= new_block.number - 7) {
                await scanBlock(new_block.number - 6, new_block.number - 6, new_block.hash)
            }
        })
        .on("error", async function(error) {
            console.error(error)
            watchNewBlock()
        })
}

async function keepUpdating() {
    // to_block = latest_network_block.number
    // await scanBlock(cursor + 1, to_block, "-")
    // await utils.sleep(10000)
    // console.log(db_last_block)
    if (latest_network_block && cursor < latest_network_block.number - 6) {
        let to_block = Math.min(latest_network_block.number - 6, cursor + block_to_scan)
        await scanBlock(cursor + 1, to_block, "-")
    } else {
        await utils.sleep(10000)
    }
    keepUpdating()
}

// Scan specific blocks
async function scanBlock(_from_block, _to_block, _hash) {
    console.log("Scan block", _from_block, "to", _to_block, "for events. Current hash", _hash)
    let transactionAddedPromise = new Promise(async function (resolve, reject) {
        await global.pool_contract.getPastEvents('transactionAdded', { fromBlock: _from_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                addTransactionToDb(eventResult, _to_block, _hash)
                resolve(true)
            }
        })
    })

    let transactionRevokedPromise = new Promise(async function (resolve, reject) {
        await global.pool_contract.getPastEvents('transactionRevoked', { fromBlock: _from_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                for await (let event of eventResult) {
                    console.log("Transaction Revoked", event.returnValues._uid)
                    await Transaction.updateMany({uid: event.returnValues._uid}, {$set: {status: constants.tx_status.REVOKED}}, function (err, res) {
                        if (err) console.log(err)
                    })
                }
                resolve(true)
            }
        })
    })

    let transactionDistributedPromise = new Promise(async function (resolve, reject) {
        await global.pool_contract.getPastEvents('transactionDistributed', { fromBlock: _from_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                for await (let event of eventResult) {
                    console.log("Transaction Distributed", event.returnValues._uid, event.transactionHash)
                    await Transaction.updateMany({uid: event.returnValues._uid}, {$set: {status: constants.tx_status.DISTRIBUTED, distributed_hash: event.transactionHash}}, function (err, res) {
                        if (err) console.log(err)
                        else notifyDistributeTx(event.returnValues._uid, event.transactionHash)
                    })
                }
                resolve(true)
            }
        })
    })

    let citizenAddedPromise = new Promise(async function (resolve, reject) {
        await global.citizen_contract.getPastEvents('citizenAdded', { fromBlock: _from_block, toBlock: _to_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                for await (let event of eventResult) {
                    let new_citizen = new User({
                        username: event.returnValues._username.toLowerCase(), 
                        ref_by: event.returnValues._ref_by.toLowerCase(),
                        wallet_address: event.returnValues._wallet_address.toLowerCase()
                    })
                    new_citizen.save().catch(console.error)
                }
                resolve(true)
            }
        })
    })


    let aliasAddedPromise = new Promise(async function (resolve, reject) {
        await global.citizen_contract.getPastEvents('aliasAdded', { fromBlock: _from_block, toBlock: _to_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                for await (let event of eventResult) {
                    let new_alias = new Alias({
                        username: event.returnValues._username.toLowerCase(), 
                        ref_by: event.returnValues._alias.toLowerCase(),
                    })
                    new_alias.save().catch(console.error)
                }
                resolve(true)
            }
        })
    })


    let aliasDeletedPromise = new Promise(async function (resolve, reject) {
        await global.citizen_contract.getPastEvents('aliasDeleted', { fromBlock: _from_block, toBlock: _to_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                Alias.deleteOne({ alias: event.returnValues._alias.toLowerCase() }, function (err, res) {
                    if (err) console.log(err)
                })
                resolve(true)
            }
        })
    })

    let refUpdatedPromise = new Promise(async function (resolve, reject) {
        await global.citizen_contract.getPastEvents('refUpdated', { fromBlock: _from_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                for await (let event of eventResult) {
                    console.log("Ref Updated", event.returnValues._username, event.returnValues._ref_by)
                    User.updateOne({ username: event.returnValues._username }, { $set: {ref_by: event.returnValues._ref_by.toLowerCase()} }, function (err, res) {
                        if (err) console.log(err)
                    })
                }
                resolve(true)
                return
            }
        })
    })


    let walletUpdatedPromise = new Promise(async function (resolve, reject) {
        await global.citizen_contract.getPastEvents('walletUpdated', { fromBlock: _from_block, toBlock: _to_block }, async function (error, eventResult) {
            if (error) {
                console.log('Error in myEvent event handler: ' + error)
                resolve(false)
            } else {
                if (eventResult.length == 0) {
                    resolve(true)
                    return
                }
                for await (let event of eventResult) {
                    console.log("Wallet Updated", event.returnValues._username, event.returnValues._wallet_address)
                    User.updateOne({ username: event.returnValues._username }, { $set: {wallet_address: event.returnValues._wallet_address.toLowerCase()} }, function (err, res) {
                        if (err) console.log(err)
                    })
                }
                resolve(true)
                return
            }   
        })
    })

    await Promise.all([transactionAddedPromise, transactionRevokedPromise, transactionDistributedPromise, citizenAddedPromise, aliasAddedPromise, aliasDeletedPromise, refUpdatedPromise, walletUpdatedPromise]).then(async function (values) {
        if (values.every(Boolean)) await (new Block({ number: _to_block })).save().catch(function () {
            console.error("Error while saving new cursor to database. Maybe there was a fork.")
        }) // Write block number to database
        cursor = _to_block
        return values.every(Boolean)
    });
}

async function addTransactionToDb(eventResult, _to_block, hash) {
    for await (let event of eventResult) {
        let ref_by = event.returnValues._ref_by
        let level = 0
        if (ref_by == "foundation") ref_by = false
        let direct_ref_by = ref_by
        notifyNewTx(event.returnValues._uid, direct_ref_by, event.returnValues._merchant, event.returnValues._amount)
        while (ref_by && level < 10) {
            let new_transaction = new Transaction({
                uid: event.returnValues._uid,
                ref_by,
                direct_ref_by,
                level,
                amount: event.returnValues._amount,
                merchant: event.returnValues._merchant,
                release: event.returnValues._release,
                status: constants.tx_status.PENDING,
                commision: event.returnValues._ref_rates[level] * event.returnValues._amount * process.env.MINT_RATE / 10000,
                regenerate: hash.length > 60 ? true : false,
                added_hash: event.transactionHash
            })
            new_transaction.save().catch(function () {
                console.log("error on adding new tx to db")
            })
            ref_by = await utils.getRefBy(ref_by)
            level++
        }
    }
}

async function regenDateTime() {
    let currentTx = await Transaction.findOne({regenerate: false, distributed_hash: {$ne: null}}).catch(console.error)
    if (currentTx) {
        console.log("Updating tx:", currentTx.uid)
        let release = new Date(currentTx.release * 1000)
        // Calculate commission
        // Get transaction block time
        if (currentTx.distributed_hash) {
            let tx = await web3ws.eth.getTransaction(currentTx.distributed_hash)
            if (tx.blockNumber) {
                await Transaction.updateOne({_id: currentTx._id}, {$set: {createdAt: release, updatedAt: release, regenerate: true}}).catch(console.error)
                console.log("Done")
            }
        }
    }
    regenDateTime()
}
