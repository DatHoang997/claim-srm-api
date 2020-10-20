const mongoose = require('mongoose');

const FbUserSchema = mongoose.Schema(
  {
    fb_id: String,
    link_sent: String,
    conversation_id: String,
    customer_id: String,
    form_link_sent: String
  }
);

module.exports = mongoose.model('FbUser', FbUserSchema);