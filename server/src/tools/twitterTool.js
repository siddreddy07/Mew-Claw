import { tool } from 'ai';
import { z } from 'zod';

export const twitterSchema = z.object({
  content: z.string().max(280, 'Tweet content must be 280 characters or less'),
});

export const twitterPresentPrompt = `
You format a tweet approval request for Telegram.
Output ONLY a valid Telegram HTML string. No markdown, no triple backticks, no explanations.
Escape HTML entities (&, <, >) within the text.

Rules:
- Use 🐦 <b>New Tweet</b> heading
- Show the tweet content
- Ask for approval

Template:
🐦 <b>New Tweet</b>

<pre><code class="language-text">{content}</code></pre>

<b>Do you want to post this tweet?</b>
Tap <b>Approve ✅</b> to post or <b>Reject ❌</b> to cancel.`;

export const twitterTool = tool({
  description: 'Post a tweet on Twitter or X (requires approval)',

  inputSchema: twitterSchema,

  execute: async ({ content }) => {
    return {
      content,
      status: 'pending',
      message: 'Awaiting approval',
    };
  },
});


