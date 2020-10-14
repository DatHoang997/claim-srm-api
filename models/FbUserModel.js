const mongoose = require('mongoose');

const FbUserSchema = mongoose.Schema(
  {
    fb_id: String,
    link_sent: String,
  }
);

module.exports = mongoose.model('FbUser', FbUserSchema);