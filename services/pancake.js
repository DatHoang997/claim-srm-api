const axios = require('axios');
const Conversation = require('../models/ConversationModel');
const FbUser = require('../models/FbUserModel');
const User = require('../models/UserModel');

const PAGE_ID = process.env.FB_PAGE_ID;

const POST_ID = process.env.FB_POST_ID;

const ACCESS_TOKEN = process.env.FB_PANCAKE_TOKEN;

const ENDPOINT = `https://pages.fm/api/v1/pages/${PAGE_ID}/`;

const NUMBER_OF_TAGS = process.env.NUMBER_OF_TAGS;

const DOWNLOAD_LINK = 'https://api-bounty.ezdefi.com/download';

exports.checkComment = async function() {
  let response;

  try {
    response = await getConversations();
  } catch(error) {
    return;
  }

  let conversations = response.data.conversations;

  // console.log(`Number of conversations: ${conversations.length}`);

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
  // console.log(`Checking conversation: ${conversationId}`);
  // console.log(customerId);
  let response;
  try {
    response = await getMessages(conversationId, customerId);
  } catch(error) {
    return;
  }
  let content = response.data;
  let messages = content.messages;
  let last_message = messages.slice(-1)[0];
  if(!last_message || !last_message.can_reply_privately || last_message.private_reply_conversation) {
    return;
  }
  let messageId = last_message.id;
  let message_tags = last_message.message_tags;
  message_tags = message_tags.filter((item, index) => {
    return (message_tags.indexOf(item) === index && item.type === 'user' && item.id != content.customers[0].fb_id);
  });
  let isValid = (message_tags.length >= NUMBER_OF_TAGS) ? true : false;
  let claimed = false;
  let user = await User.findOne({fb_id: content.customers[0].fb_id});
  if(user != null & user.claimed == '1') {
    claimed = true;
  }
  FbUser.findOne({fb_id: content.customers[0].fb_id}, function(error, result) {
    if(error) return;
    if(!result) {
      let user = new FbUser({fb_id: content.customers[0].fb_id, link_sent: '0', conversation_id: conversationId, customer_id: content.customers[0].id, customer_name: content.customers[0].name});
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
  // console.log(`Getting messages of conversation: ${conversationId}`);
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
    message = `ezDeFi cảm ơn bạn đã để lại comment. Tuy nhiên ID của bạn được ghi nhận đã tham gia nhận bounty. Nếu bạn chưa để lại thông tin và tham gia Vòng quay may mắn, vui lòng truy cập vào đường link chúng tôi đã gửi và làm theo hướng dẫn.`;
  } else {
    if(isValid) {
      message = `ezDeFi cảm ơn bạn đã để lại comment. Vui lòng truy cập vào đường link: ${DOWNLOAD_LINK}/${userId}/${userId} để có thể tải app ezDeFi và nhận Bounty. Mở app ezDeFi và truy cập vào Đ-app của chúng tôi để nhận ngay 300 aSRM.`;
    } else {
      message = 'ezDeFi cảm ơn bạn đã để lại comment. Tuy nhiên comment của bạn chưa hợp lệ (chưa đủ số lượng người tag hoặc bạn đã tag ở một comment trước đó). Xin vui lòng cập nhật lại comment để tiếp tục tham gia chương trình nhận quà tặng giá trị';
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
      FbUser.findOneAndUpdate({fb_id: userId}, {$set:{link_sent: '1', conversation_id: conversationId}}, function(error, result) {
        console.log('error', error);
        console.log('result', result);
      });
    }
  }).catch(function(error) {
    console.log(error);
    return;
  });
}

exports.sendLuckyWheelLink = async function(conversationId, fbId, customerId) {
  let response;
  let url = `https://api-bounty.ezdefi.com/lucky_wheel?fbId=${fbId}`;

  try {
    response = await getThreadKey(customerId);
  } catch(error) {
    return;
  }

  let threadKey = response.data.thread_key;

  if(!threadKey) {
    return;
  }

  axios({
    method: 'post',
    url: `${ENDPOINT}conversations/${conversationId}/messages?access_token=${ACCESS_TOKEN}`,
    headers: {
      'conversation_id': conversationId,
      'page_id': process.env.FB_PAGE_ID
    },
    data: {
      'message': `Chúc mừng bạn đã nhận được Bounty từ ezDeFi. Chúng tôi vẫn còn những phần quà hấp dẫn dành cho bạn! Truy cập vào đường link này: ${url} để tham gia vòng quay với cơ hội trúng thưởng Iphone Promax 11`,
      'action': 'reply_inbox',
      'thread_key': threadKey,
    }
  }).then(function(response) {
    FbUser.findOneAndUpdate({conversation_id: conversationId, customer_id: customerId}, {$set:{lucky_wheel_link_sent: '1'}}, function(error, result) {
      console.log('error', error);
      console.log('result', result);
    });
  }).catch(function(error) {
    console.log(error);
    return;
  });;
}

function getThreadKey(customerId) {
  return axios.get(`${ENDPOINT}/customers/${customerId}/inbox_preview`, {
    headers: {
      'page_id': PAGE_ID,
    },
    params: {
      'access_token': ACCESS_TOKEN
    }
  })  
}