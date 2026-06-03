import { processQuery } from './chat.Service.js';
import { sendThinking, reply, sendTyping, sendInlineKeyboard, editMessage, answerCallbackQuery, startMessages } from './telegram.Service.js';
import { exec } from 'child_process';
import { platform } from 'os';
import { promisify } from 'util';
import { postTweet } from './Twitter.Service.js';

const pendingCommands = new Map();
const isWin = platform() === 'win32';
const execAsync = promisify(exec);

export async function handleWebhook(payload) {
  try {
    if (payload?.callback_query) {
      return await handleCallbackQuery(payload.callback_query);
    }

    const message = payload?.message;

    if (!message?.text) {
      return { ok: true };
    }

    const chatId = message.chat.id;
    const userQuery = message.text;

    if (message.entities?.some(e => e.type === 'bot_command' && userQuery.slice(e.offset, e.offset + e.length) === '/start')) {
      const msg = startMessages[Math.floor(Math.random() * startMessages.length)];
      await reply(chatId, msg);
      return { ok: true };
    }

    const thinkingMsgId = await sendThinking(chatId);
    sendTyping(chatId);

    try {
      const { answer, result, toolName, needsApproval } = await processQuery(userQuery);
      if (needsApproval) {
        const prefix = toolName === 'twitter' ? 'twitter' : 'terminal';
        const buttons = [[
          { text: 'Approve ✅', callback_data: `${prefix}_approve` },
          { text: 'Reject ❌', callback_data: `${prefix}_reject` },
        ]];

        if (thinkingMsgId) {
          await editMessage(chatId, thinkingMsgId, answer, buttons);
          const key = `${chatId}:${thinkingMsgId}`;
          console.log('Pending command:', { key, toolName, result });
          pendingCommands.set(key, { ...result, _tool: toolName });
        } else {
          const approvalMsgId = await sendInlineKeyboard(chatId, answer, buttons);
          if (approvalMsgId) {
            const key = `${chatId}:${approvalMsgId}`;
            pendingCommands.set(key, { ...result, _tool: toolName });
          }
        }
      } else {
        if (thinkingMsgId) {
          await editMessage(chatId, thinkingMsgId, answer);
        } else {
          await reply(chatId, answer);
        }
      }
      console.log('Done ✅');
    } catch (err) {
      const fallback = '🐾 mew ran into an error. Try again.';
      if (thinkingMsgId) {
        await editMessage(chatId, thinkingMsgId, fallback);
      } else {
        await reply(chatId, fallback);
      }
      throw err;
    }

    return { ok: true };
  } catch (error) {
    console.error('handleWebhook error:', error.message);
    throw error;
  }
}

async function executeCommand(command) {
  const opts = {
    encoding: 'utf8',
    timeout: 30000,
    cwd: process.cwd(),
  };

  if (!isWin) {
    const { stdout, stderr } = await execAsync(command, opts);
    if (stderr) throw new Error(stderr);
    return stdout;
  }

  try {
    const { stdout, stderr } = await execAsync(command, { ...opts, shell: 'powershell.exe' });
    if (stderr) throw new Error(stderr);
    return stdout;
  } catch (err) {
    const msg = err.stderr?.toString().trim();
    if (msg && !msg.includes('non-zero exit code')) throw new Error(msg);
  }

  try {
    const { stdout, stderr } = await execAsync(command, opts);
    if (stderr) throw new Error(stderr);
    return stdout;
  } catch (err) {
    const msg = err.stderr?.toString().trim();
    if (msg && !msg.includes('non-zero exit code')) throw new Error(msg);
  }

  throw new Error(isWin
    ? 'Command not found on Windows. Unix commands (wc, grep, find) are not available. Try PowerShell equivalents or install Git Bash.'
    : 'Command not found.');
}

async function handleCallbackQuery(callbackQuery) {
  const { data, message, from, id: callbackId } = callbackQuery;
  const chatId = message.chat.id;
  const messageId = message.message_id;
  const key = `${chatId}:${messageId}`;

  console.log('Received callback query:', { message : message });

  await answerCallbackQuery(callbackId);

  if (data.endsWith('_reject')) {
    pendingCommands.delete(key);
    await reply(chatId, '❌ <b>Cancelled</b>\n\nNo changes were made.');
    return { ok: true };
  }

  const cmd = pendingCommands.get(key);
  if (!cmd) {
    await reply(chatId, '⏳ This action has expired. Please send your query again.');
    return { ok: true };
  }

  pendingCommands.delete(key);

  if (data === 'twitter_approve') {
    const result = await postTweet({ content: cmd.content });
    if (result.success) {
      const tweetId = result.data?.data?.id;
      const link = tweetId ? `https://x.com/user/status/${tweetId}` : '';
      await reply(chatId, `✅ <b>Tweet posted!</b>${link ? `\n\n${link}` : ''}`);
    } else {
      await reply(chatId, `❌ <b>Failed to post tweet</b>\n\n${result.message}`);
    }

    return { ok: true };
  }

  if (data === 'terminal_approve') {
    const fullCommand = [cmd.command, ...(cmd.args || [])].join(' ');

    console.log('Executing approved command:', { chatId, command: fullCommand });

    const shutdownOps = ['shutdown', 'restart'];
    const sleepOps = ['sleep', 'hibernate'];

    if (cmd.operation && shutdownOps.includes(cmd.operation)) {
      await reply(chatId, `⛔ <b>System ${cmd.operation}</b>\n\n<pre><code class="language-bash">$ ${fullCommand}</code></pre>\n\nShutting down...`);
      await executeCommand(fullCommand);
      return { ok: true };
    }

    if (cmd.operation && sleepOps.includes(cmd.operation)) {
      await reply(chatId, `💤 <b>Going to sleep...</b>\n\n<pre><code class="language-bash">$ ${fullCommand}</code></pre>\n\n😴 See you later!`);
      try {
        await executeCommand(fullCommand);
        await reply(chatId, `☀️ <b>Back!</b>\n\n<pre><code class="language-bash">$ ${fullCommand}</code></pre>\n\nSystem woke up successfully.`);
      } catch {
        // command may fail silently after wake, nbd
      }
      return { ok: true };
    }

    await reply(chatId, `🔄 <b>Executing:</b>\n\n<pre><code class="language-bash">$ ${fullCommand}</code></pre>\n\n⏳ Running...`);

    try {
      const output = await executeCommand(fullCommand);
      const escapedOutput = output
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const resultMsg = `✅ <b>Command completed</b>\n\n<pre><code class="language-bash">$ ${fullCommand}</code></pre>\n\n<pre><code class="language-bash">${escapedOutput || '(no output)'}</code></pre>`;

      await reply(chatId, resultMsg);
    } 
    catch (execError) 
    {
      const rawError = execError.stderr?.toString().trim() || execError.message || 'Unknown error';
      const isNotFound = rawError.includes('not recognized') || rawError.includes('not found');

      const escapedError = rawError
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const osHint = isWin && isNotFound
        ? '\n\n💡 <b>Tip:</b> This server runs on Windows. Unix commands like <code>wc</code>, <code>grep</code>, <code>find</code> won\'t work. Try PowerShell equivalents.'
        : '';

      const errorMsg = `❌ <b>Command failed</b>\n\n<pre><code class="language-bash">$ ${fullCommand}</code></pre>\n\n<pre><code class="language-bash">${escapedError}</code></pre>${osHint}`;

      await reply(chatId, errorMsg);
    }

    return { ok: true };
  }

  return { ok: true };
}
