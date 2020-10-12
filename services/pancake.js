const axios = require('axios');
const Conversation = require('../models/ConversationModel');
const FbUser = require('../models/FbUserModel');

const PAGE_ID = 492974120811420;

const POST_ID = 3311824925592978;

const ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiJhMjhlOGFiMy0zNmY0LTQ2OTYtYjdmOS1iZTA2NmQ3NTExNGMiLCJpYXQiOjE2MDEzNTE5ODQsImZiX25hbWUiOiJOZ3V5ZW4gUXVhbmcgVGllbiIsImZiX2lkIjoiMTQ3MDg4MDg2OTY5MzIyOSIsImV4cCI6MTYwOTEyNzk4NH0.SipSgCnkydAQ_1awIwG3jWReBD0r2d2-Uq9hdMM3PLk';

const ENDPOINT = `https://pages.fm/api/v1/pages/${PAGE_ID}/`;

const NUMBER_OF_TAGS = 1;

const CHATBOT_BACKLINK = 'http://m.me/492974120811420?ref=oueor6b2z.ref.';

exports.checkComment = async function() {
  let response;

  try {
    response = await getConversations();
  } catch(error) {
    return;
  }

  let conversations = response.data.conversations;

  console.log(`Number of conversations: ${conversations.length}`);

  for(let conversation of conversations) {
    Conversation.findOne({id: conversation.id, customer_id: conversation.customers[0].id}, function (error, result) {
      if(error) return;
      if(!result) {
        let save = new Conversation({id: conversation.id, customer_id: conversation.customers[0].id});
        save.save(function(error, data) {
          if (error) {
            return;
          } else if (data) {
            console.log(data);
            checkConversation(data.id, data.customer_id);
          }
        });
      } else {
        checkConversation(conversation.id, conversation.customers[0].id);
      }
    });
  }
}

function getConversations() {
  return axios.get(`${ENDPOINT}conversations?type=POST:${PAGE_ID}_${POST_ID},COMMENT`, {
    headers: {
      'page_id': PAGE_ID,
    },
    params: {
      'unread_first': true,
      'mode': 'NONE',
      'tags': '"ALL"',
      'access_token': ACCESS_TOKEN
    }
  })
}

async function checkConversation(conversationId, customerId) {
  console.log(`Checking conversation: ${conversationId}`);
  console.log(customerId);
  let response;
  try {
    response = await getMessages(conversationId, customerId);
  } catch(error) {
    return;
  }
  let content = response.data;
  let messages = content.messages;
  let last_message = messages.slice(-1)[0];
  if(!last_message.can_reply_privately || last_message.private_reply_conversation) {
    return;
  }
  let messageId = last_message.id;
  let message_tags = last_message.message_tags;
  message_tags = message_tags.filter((item, index) => {
    return message_tags.indexOf(item) === index;
  });
  if(message_tags.length >= NUMBER_OF_TAGS) {
    FbUser.findOne({fb_id: content.customers[0].fb_id}, function(error, result) {
      if(error) return;
      if(!result) {
        let user = new FbUser({fb_id: content.customers[0].fb_id});
        user.save(function(error, data) {
          if(error) {
            Conversation.deleteOne({id: conversationId, customer_id: customerId})
          } else if (data) {
            replyComment(conversationId, messageId, data._id);
          }
        });
      } else {
        replyComment(conversationId, messageId, result._id);
      }
    })
  }
}

function getMessages(conversationId, customerID) {
  console.log(`Getting messages of conversation: ${conversationId}`);
  return axios.get(`${ENDPOINT}conversations/${conversationId}/messages?access_token=${ACCESS_TOKEN}`, {
    headers: {
      'page_id': PAGE_ID,
    },
    params: {
      'customer_id': customerID,
      'user_view': true,
      'is_new_api': true,
    }
  })
}

function replyComment(conversationId, messageId, userId) {
  console.log(`Replying message: ${messageId}`);
  try {
    axios({
      method: 'post',
      url: `${ENDPOINT}conversations/${conversationId}/messages?access_token=${ACCESS_TOKEN}`,
      headers: {
        'conversation_id': conversationId,
        'page_id': PAGE_ID
      },
      data: {
        'message': `${CHATBOT_BACKLINK}${userId}`,
        'action': 'private_replies',
        'post_id': `${PAGE_ID}_${POST_ID}`,
        'message_id': messageId,
      }
    })
  } catch(error) {
    console.log(error);
    return;
  }
}