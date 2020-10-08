const FbUser = require('../models/FbUserModel');

exports.findOne = (req, res) => {
  let id = req.params.userId;
  if(!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.send({
      valid: false
    })
  }
  FbUser.findById(req.params.userId).then(user => {
    if(!user) {
      return res.send({
        valid: false
      })
    }

    res.send({
      valid: true,
      fb_id: user.fb_id
    })
  })
};