const constants         = require('./constants')
const citizen_abi       = require("../build/production/contracts/Citizen.json").abi
const pool_abi          = require("../build/production/contracts/POC_Pool.json").abi
const token_abi         = require("../build/production/contracts/POC_Token.json").abi
const {web3ws, web3eth} = require("./web3")

module.exports = {
    pool_contract: new web3ws.eth.Contract(pool_abi, constants.pool_address, { gas: '5000000', gasPrice: '0' }),
    citizen_contract: new web3ws.eth.Contract(citizen_abi, constants.citizen_address, { gas: '5000000', gasPrice: '0' }),
    token_contract : new web3ws.eth.Contract(token_abi, constants.token_address, { gas: '5000000', gasPrice: '0' }),
    usdt : new web3eth.eth.Contract(token_abi, constants.usdt_address, { gas: '5000000', gasPrice: '0' })
}
