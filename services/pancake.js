const axios = require('axios');
const Conversation = require('../models/ConversationModel');
const FbUser = require('../models/FbUserModel');
const User = require('../models/UserModel');

const PAGE_ID = 1795330330742938;

const POST_ID = 2744359005840061;

const ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiJhMjhlOGFiMy0zNmY0LTQ2OTYtYjdmOS1iZTA2NmQ3NTExNGMiLCJpYXQiOjE2MDI1NzY3ODYsImZiX25hbWUiOiJOZ3V5ZW4gUXVhbmcgVGllbiIsImZiX2lkIjoiMTQ3MDg4MDg2OTY5MzIyOSIsImV4cCI6MTYxMDM1Mjc4Nn0.mRE-sFlxRVX-_Ljj1-iRLsDzOqsOECwVyCRlYHGlVJE';

const ENDPOINT = `https://pages.fm/api/v1/pages/${PAGE_ID}/`;

const NUMBER_OF_TAGS = 5;

const DOWNLOAD_LINK = 'https://api-bounty.ezdefi.com/download';

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
    return (message_tags.indexOf(item) === index && item.type != 'page');
  });
  let isValid = (message_tags.length >= NUMBER_OF_TAGS) ? true : false;
  let claimed = false;
  User.findOne({fb_id: content.customers[0].fb_id}, function(error, result) {
    if(error) {
      return;
    }

    if(result && result.claimed == 1) {
      claimed = true;
    }
  })
  FbUser.findOne({fb_id: content.customers[0].fb_id}, function(error, result) {
    if(error) return;
    if(!result) {
      let user = new FbUser({fb_id: content.customers[0].fb_id, link_sent: '0'});
      user.save(function(error, data) {
        if(error) {
          Conversation.deleteOne({id: conversationId, customer_id: customerId})
        } else if (data) {
          replyComment(conversationId, messageId, data.fb_id, isValid, claimed);
        }
      });
    } else {
      replyComment(conversationId, messageId, result.fb_id, isValid, claimed);
    }
  })
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

function replyComment(conversationId, messageId, userId, isValid, claimed) {
  console.log(`Replying message: ${messageId}`);
  let message = '';
  if(claimed) {
    message = `ezDeFi cảm ơn bạn đã để lại comment, tuy nhiên bạn đã nhận được bounty rồi. Mời bạn vui lòng điền thông tin và tham gia vòng quay may mắn (nếu như bạn chưa tham gia) để có cơ hội nhận được iPhone 11 Pro Max`;
  } else {
    if(isValid) {
      message = `Cảm ơn bạn đã tham gia chương trình. Vui lòng click vào đây để download app và nhận bounty ${DOWNLOAD_LINK}/${userId}/${userId}`;
    } else {
      message = 'EzDeFi cảm ơn bạn đã để lại comment. Tuy nhiên comment của bạn chưa hợp lệ (chưa đủ số lượng người tag hoặc bạn đã tag ở một comment trước đó). Xin vui lòng cập nhật lại comment để tiếp tục tham gia chương trình nhận quà tặng giá trị';
    }
  }
  axios({
    method: 'post',
    url: `${ENDPOINT}conversations/${conversationId}/messages?access_token=${ACCESS_TOKEN}`,
    headers: {
      'conversation_id': conversationId,
      'page_id': PAGE_ID
    },
    data: {
      'message': message,
      'action': 'private_replies',
      'post_id': `${PAGE_ID}_${POST_ID}`,
      'message_id': messageId,
    }
  }).then(function(response) {
    if(isValid && !claimed) {
      FbUser.findOneAndUpdate({fb_id: userId}, {$set:{link_sent: '1'}}, function(error, result) {
        console.log('error', error);
        console.log('result', result);
      });
    }
  }).catch(function(error) {
    console.log(error);
    return;
  });
}