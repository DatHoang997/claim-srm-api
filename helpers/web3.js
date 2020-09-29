const Web3 = require("web3")
exports.web3ws = new Web3(process.env.NEXTY_WS);
exports.web3eth = new Web3('https://mainnet.infura.io/v3/43719754bb154bd5aaa96184a58f1647')
