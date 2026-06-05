import { tool } from 'ai';
import { z } from 'zod';

export const linkedinSchema = z.object({
  content: z.string().max(3000, 'LinkedIn post content must be 3000 characters or less'),
  mediaPath: z.string().optional(),
});

export const linkedinPresentPrompt = `
You format a LinkedIn post approval request for Telegram.
Output ONLY a valid Telegram HTML string. No markdown, no triple backticks, no explanations.
Escape HTML entities (&, <, >) within the text.

Rules:
- Use 💼 <b>New LinkedIn Post</b> heading
- Show the post content
- If there's a media file, show its path
- Ask for approval

Template:
💼 <b>New LinkedIn Post</b>

<pre><code class="language-text">{content}</code></pre>

<b>Do you want to post this to LinkedIn?</b>
Tap <b>Approve ✅</b> to post or <b>Reject ❌</b> to cancel.`;

export const linkedInTool = tool({
  description: 'Post on LinkedIn with optional image or video (requires approval)',

  inputSchema: linkedinSchema,

  execute: async ({ content, mediaPath }) => {
    return {
      content,
      mediaPath,
      status: 'pending',
      message: 'Awaiting approval',
    };
  },
});
