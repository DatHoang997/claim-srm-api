const apiResponse = require('../helpers/apiResponse')
const Prize = require('../models/PrizeModel')
const User = require('../models/UserModel')
const UserPrize = require('../models/UserPrizeModel')

function getPrizes() {
  return prize = [
    {
      key: 'iphone',
      name: 'iPhone 11 Pro Max',
      percentage: 1,
      limit: 1
    },
    {
      key: '10k',
      name: 'Thẻ Viettel 10K',
      percentage: 7,
      limit: 500
    },
    {
      key: '20k',
      name: 'Thẻ Viettel 20K',
      percentage: 5,
      limit: 150
    },
    {
      key: '50k',
      name: 'Thẻ Viettel 50K',
      percentage: 5,
      limit: 90
    },
    {
      key: '100k',
      name: 'Thẻ Viettel 100K',
      percentage: 1,
      limit: 30
    },
    {
      key: 'miss',
      name: 'Mất lượt',
      percentage: 81,
      limit: 30000
    },
  ];
}

exports.getPrize = async function(req, res) {
  let user = await User.findOne({fb_id: req.body.fb_id})

  if(!user) {
    return apiResponse.ErrorResponse(res, 'User not exist')
  }

  if(user.spin_number == 0) {
    return apiResponse.ErrorResponse(res, 'Out of spin number')
  }

  let missPrize = {
    key: 'miss',
    name: 'Mất lượt',
    percentage: 81,
    limit: 30000
  };
  let prizes = await Prize.find();
  let expanded = prizes.flatMap(prize => Array(prize.percentage).fill(prize.limit > 0 ? prize : missPrize));
  let prize = expanded[Math.floor(Math.random() * expanded.length)];
  await Prize.findOneAndUpdate({name: prize.name}, {$set:{limit: prize.limit - 1}});
  await User.findOneAndUpdate({fb_id: req.body.fb_id}, {$set:{spin_number: user.spin_number - 1}})
  let userPrize = new UserPrize({fb_id: req.body.fb_id, prize: prize.name})
  await userPrize.save()
  return apiResponse.successResponseData(res, {
    spin_number: user.spin_number - 1,
    prize: prize.name
  });
}