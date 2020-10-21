const mongoose = require('mongoose');

const FbUserSchema = mongoose.Schema(
  {
    fb_id: String,
    link_sent: String,
    conversation_id: String,
    customer_id: String,
    lucky_wheel_link_sent: String
  }
);

module.exports = mongoose.model('FbUser', FbUserSchema);