const mongoose = require('mongoose');

const FbUserSchema = mongoose.Schema(
  {
    fb_id: String,
  }
);

module.exports = mongoose.model('FbUser', FbUserSchema);