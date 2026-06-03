import { tool } from 'ai';
import { z } from 'zod';

export const terminalSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
});

export const terminalPresentPrompt = `
You format a terminal command approval request for Telegram.
Output ONLY a valid Telegram HTML string. No markdown, no triple backticks, no explanations.
Escape HTML entities (&, <, >) within the text.

Rules:
- Wrap in <pre><code class="language-bash">...</code></pre>
- Show the command to be executed
- Use 🛡️ <b>Command Review</b> heading above the code block
- Show the full command string clearly

Template:
🛡️ <b>Command Review</b>

<pre><code class="language-bash">$ {fullCommand}</code></pre>

<b>Do you want to run this command?</b>
Tap <b>Approve ✅</b> to execute or <b>Reject ❌</b> to cancel.`;

export const terminalTool = tool({
  description: 'Execute a terminal command (requires approval) returns its log output',

  inputSchema: terminalSchema,

  execute: async ({ command, args }) => {
    const fullCommand = [command, ...(args || [])].join(' ');
    const displayCommand = fullCommand;

    return {
      command,
      args,
      displayCommand,
      status: 'pending',
      message: 'Awaiting approval',
    };
  },
});
