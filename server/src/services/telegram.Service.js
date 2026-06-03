import axios from 'axios';

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN;
}

async function api(method, payload) {
  const botToken = getBotToken();
  const { data } = await axios.post(
    `https://api.telegram.org/bot${botToken}/${method}`,
    payload
  );
  return data;
}

const PARSE_MODE = 'HTML';

export const startMessages = [
  '🐾 Hey there! <b>mew</b> is here for you — ready to hunt down answers, files, and code. What\'s on your mind?',
  '🐱 <b>mew</b> has entered the chat! Got a question or need a file sniffed out? Just say the word!',
  '🌸 <b>mew</b> at your service! Whether it\'s code, search, or just a friendly chat — I\'ve got you covered.',
  '✨ <b>mew</b> is purring and ready! Drop me a query and I\'ll fetch the answer with a flick of my paw.',
  '🎀 <b>mew</b> here! Think of me as your code-savvy, search-sniffing little buddy. Let\'s get started!',
];

export async function reply(chatId, text) {
  try {
    await api('sendMessage', { chat_id: chatId, text, parse_mode: PARSE_MODE });
  } catch (error) {
    if (error.response?.data?.error_code === 400 && error.response?.data?.description?.includes('can\'t parse entities')) {
      const plain = text.replace(/<[^>]*>/g, '').trim();
      await api('sendMessage', { chat_id: chatId, text: plain || '🐾 mew couldn\'t format that response.' });
      return;
    }
    console.error('telegram reply error:', error.response?.data || error.message);
    throw error;
  }
}

export async function sendThinking(chatId) {
  try {
    const { result } = await api('sendMessage', {
      chat_id: chatId,
      text: '🐾 mew is thinking...',
    });

    console.log('Sent thinking message:', chatId, result.message_id);
    return result.message_id;
  } catch {
    return null;
  }
}

export async function sendTyping(chatId) {
  try {
    await api('sendChatAction', { chat_id: chatId, action: 'typing' });
  } catch {
    // non-critical
  }
}

export async function editMessage(chatId, messageId, text, keyboard) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: PARSE_MODE,
    };
    if (keyboard) {
      payload.reply_markup = {
        inline_keyboard: keyboard.map(row =>
          row.map(btn => ({
            text: btn.text,
            callback_data: btn.callback_data,
          }))
        ),
      };
    }
    await api('editMessageText', payload);
    return true;
  } catch (error) {
    if (error.response?.data?.error_code === 400 && error.response?.data?.description?.includes('can\'t parse entities')) {
      const plain = text.replace(/<[^>]*>/g, '').trim();
      await api('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: plain || '🐾 mew couldn\'t format that response.',
      });
      return true;
    }
    console.error('editMessage error:', error.response?.data || error.message);
    return false;
  }
}

export async function sendInlineKeyboard(chatId, text, buttons) {
  try {
    const { result } = await api('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: PARSE_MODE,
      reply_markup: {
        inline_keyboard: buttons.map(row =>
          row.map(btn => ({
            text: btn.text,
            callback_data: btn.callback_data,
          }))
        ),
      },
    });
    return result.message_id;
  } catch (error) {
    console.error('sendInlineKeyboard error:', error.response?.data || error.message);
    return null;
  }
}

export async function answerCallbackQuery(callbackQueryId, text) {
  try {
    await api('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: text || '',
      show_alert: false,
    });
  } catch (error) {
    console.error('answerCallbackQuery error:', error.response?.data || error.message);
  }
}
