const mongoose = require('mongoose');

const ConversationSchema = mongoose.Schema(
  {
    id: String,
    customer_id: String
  }
);

module.exports = mongoose.model('Conversation', ConversationSchema);