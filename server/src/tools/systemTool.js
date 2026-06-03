import { tool } from 'ai';
import { z } from 'zod';

function osType() {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'darwin': return 'mac';
    default: return 'unix';
  }
}

export const systemSchema = z.object({
  operation: z.enum(['lock', 'logout', 'restart', 'shutdown', 'sleep', 'hibernate']),
  force: z.boolean().optional(),
  delay: z.number().min(0).max(3600).optional(),
});

export const systemPresentPrompt = `
You format a system operation approval request for Telegram.
Output ONLY a valid Telegram HTML string. No markdown, no triple backticks, no explanations.
Escape HTML entities (&, <, >) within the text.

Rules:
- Wrap in <pre><code class="language-bash">...</code></pre>
- Show the operation clearly with an appropriate emoji (🔒 for lock, 🚪 for logout, 🔄 for restart, ⛔ for shutdown, 💤 for sleep/hibernate)
- Use <b>System Operation</b> heading

Template:
🔧 <b>System Operation</b>

{emoji} <b>{operation}</b>

<pre><code class="language-bash">{command}</code></pre>

<b>Do you want to proceed?</b>
Tap <b>Approve ✅</b> to execute or <b>Reject ❌</b> to cancel.`;

function getCommand(operation, force, delay) {
  const t = delay != null ? delay : 0;
  const os = osType();

  if (os === 'windows') {
    switch (operation) {
      case 'lock': return 'rundll32.exe user32.dll,LockWorkStation';
      case 'logout': return `shutdown /l${force ? ' /f' : ''}`;
      case 'restart': return `shutdown /r /t ${t}${force ? ' /f' : ''}`;
      case 'shutdown': return `shutdown /s /t ${t}${force ? ' /f' : ''}`;
      case 'sleep': return 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
      case 'hibernate': return 'rundll32.exe powrprof.dll,SetSuspendState 1,0,0';
    }
  }

  if (os === 'mac') {
    switch (operation) {
      case 'lock': return 'osascript -e \'tell application "System Events" to key code 12 using {command down, control down}\'';
      case 'logout': return 'osascript -e \'tell application "System Events" to log out\'';
      case 'restart': return `osascript -e 'tell application "System Events" to restart'`;
      case 'shutdown': return `osascript -e 'tell application "System Events" to shut down'`;
      case 'sleep': return 'pmset sleepnow';
      case 'hibernate': return 'pmset sleepnow';
    }
  }

  switch (operation) {
    case 'lock': return 'loginctl lock-session';
    case 'logout': return `gnome-session-quit --logout${force ? ' --force' : ''}`;
    case 'restart': return `shutdown -r ${t > 0 ? `+${Math.ceil(t / 60)}` : 'now'}`;
    case 'shutdown': return `shutdown -h ${t > 0 ? `+${Math.ceil(t / 60)}` : 'now'}`;
    case 'sleep': return 'systemctl suspend';
    case 'hibernate': return 'systemctl hibernate';
  }
}

function getEmoji(operation) {
  switch (operation) {
    case 'lock': return '🔒';
    case 'logout': return '🚪';
    case 'restart': return '🔄';
    case 'shutdown': return '⛔';
    case 'sleep': return '💤';
    case 'hibernate': return '💤';
  }
}

export const systemTool = tool({
  description: 'Perform system operations on the PC: lock, logout, restart, shutdown, sleep, hibernate',

  inputSchema: systemSchema,

  execute: async ({ operation, force, delay }) => {
    const command = getCommand(operation, force, delay);

    return {
      operation,
      command,
      emoji: getEmoji(operation),
      status: 'pending',
      message: 'Awaiting approval',
      displayCommand: command,
    };
  },
});
