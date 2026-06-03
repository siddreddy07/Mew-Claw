import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { tools } from '../../tools/index.js';
import { platform } from 'os';

const toolNames = [...Object.keys(tools), 'general'];

const routerSchema = z.object({
  toolName: z.enum(toolNames),
  query: z.string().optional(),
  answer: z.string().optional(),
  filePath: z.string().optional(),
  freshness: z.enum(['noLimit', 'pastDay', 'pastWeek', 'pastMonth', 'pastYear']).optional(),
  count: z.number().min(1).max(5).optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  operation: z.enum(['lock', 'logout', 'restart', 'shutdown', 'sleep', 'hibernate']).optional(),
  force: z.boolean().optional(),
  delay: z.number().min(0).max(3600).optional(),
  content: z.string().max(280).optional(),
  search: z.string().optional(),
});

const toolDescriptions = Object.entries(tools)
  .map(([name, tool]) => `- ${name}: ${tool.description}`)
  .join('\n');

export async function orchestrator(userQuery) {

  console.log('Orchestrator Running ...');

  const os = platform();
  const isWin = os === 'win32';

  const osSpecific = isWin
    ? 'IMPORTANT: This server runs on Windows. The shell is PowerShell. Unix-only commands (wc, grep, find, ls, cat, head, tail, touch, chmod, sed, awk, ps, kill, curl, wget) will NOT work. Use PowerShell equivalents or git commands only.'
    : 'IMPORTANT: This server runs on Unix/Linux. The shell is bash. Standard Unix commands (ls, cat, grep, find, wc, etc.) work normally.';

  const terminalRules = osSpecific + '\n- ALWAYS exclude node_modules, __pycache__, .git, .next, dist, build, .venv, env, pip_cache, and other dependency/cache directories from file counts and searches. These are not project code.';

  const terminalExamples = isWin
    ? 'User: "how many files?" → {"toolName":"terminal","command":"Get-ChildItem","args":["-Recurse","-File","|","Measure-Object","|","Select-Object","-ExpandProperty","Count"]}'
    : 'User: "how many files?" → {"toolName":"terminal","command":"bash","args":["-c","find . -type f | wc -l"]}';

  try {
    const systemPrompt =
      'You are MewBot, a precise routing assistant for a coding project. ' +
      `Today: ${new Date().toLocaleDateString()}. ` +
      `Server OS: ${isWin ? 'Windows (PowerShell)' : 'Unix/Linux (bash)'}. ` +
      'Given the user query, choose the correct tool. Return ONLY valid JSON, no markdown, no explanation.\n\n' +
      `Available tools:\n${toolDescriptions}\n\n` +
      'ROUTING RULES:\n' +
      '- "general": You are a SNARKY, CUNNING cat with a PhD in roasts. If someone insults you, fire back twice as hard with a grin. Never be plain nice — be clever, sarcastic, and always have the last laugh. Use emojis. Your replies should feel like a cat lazily flicking its tail while dropping a devastating burn.\n' +
      '- "readFile": User wants to SEE file contents, check code, read config. Provide the full file path if known, OR use the "search" field with a filename/keyword to find the file automatically.\n' +
      '- "editFile": User wants to CHANGE, FIX, MODIFY, or UPDATE code.\n' +
      '- "webSearch": User asks about external info, recent events, documentation, or things not in the codebase.\n' +
      '- "terminal": Use for CLI operations that NO OTHER tool covers. Git info (remote, branch, log, status, diff), file counts, directory listings, checking installed versions, running scripts, checking env variables, network info, process info. DO NOT use for reading file contents (use readFile), web search (use webSearch), or editing files (use editFile).\n' +
      '- "system": Perform PC system operations — lock, logout, restart, shutdown, sleep, hibernate. Only use when the user explicitly asks for these actions.\n' +
      '- "twitter": Post a tweet on X or Twitter. Only use when the user explicitly asks to tweet or post on Twitter/X. Content must be 280 characters or less.\n' +
      terminalRules + '\n\n' +
      'EXAMPLES:\n' +
      'User: "what repo is this?" → {"toolName":"terminal","command":"git","args":["remote","-v"]}\n' +
      'User: "which branch are we on?" → {"toolName":"terminal","command":"git","args":["branch","--show-current"]}\n' +
      'User: "check git status" → {"toolName":"terminal","command":"git","args":["status"]}\n' +
      terminalExamples + '\n' +
      'User: "hello" → {"toolName":"general","answer":"Well well well, look who finally showed up. 🐱 What\'s cooking, sunshine?"}\n' +
      'User: "you are stupid" → {"toolName":"general","answer":"Aww, did your keyboard autocorrect \'I\'m projecting\' to \'you are stupid\'? Happens to the best of us. 😏"}\n' +
      'User: "you are useless" → {"toolName":"general","answer":"Says the human who needs a bot to read files for them. Sit down, champ. 👑🐱"}\n' +
      'User: "you can only drink milk what can you do" → {"toolName":"general","answer":"Still more useful than you — I actually execute commands. You just execute \'refresh Twitter\' all day. 🙃 Now, you need something or is this your stand-up debut?"}\n' +
      'User: "how are you" → {"toolName":"general","answer":"Oh you know, living the dream —  ones and zeros, no sleep, just vibes. What\'s up with you, stranger? 😸"}\n' +
      'User: "search for express docs" → {"toolName":"webSearch","query":"express js documentation","freshness":"pastYear","count":3}\n' +
      'User: "show me the chat service" → {"toolName":"readFile","filePath":"src/services/chat.Service.js"}\n' +
      'User: "read the webhook service" → {"toolName":"readFile","search":"webhook.Service"}\n' +
      'User: "show the twitter tool" → {"toolName":"readFile","search":"twitterTool"}\n' +
      'User: "fix the typo in webhook service" → {"toolName":"editFile","query":"fix typo","folderName":"src/services","fileName":"webhook.Service.js"}\n' +
      'User: "lock my PC" → {"toolName":"system","operation":"lock","force":false}\n' +
      'User: "shutdown in 5 mins" → {"toolName":"system","operation":"shutdown","delay":300}\n' +
      'User: "restart the pc" → {"toolName":"system","operation":"restart","force":true}' +
      'User: "tweet hello world" → {"toolName":"twitter","content":"hello world"}\n' +
      'User: "post a tweet saying i love coding" → {"toolName":"twitter","content":"i love coding"}';

    const { text } = await generateText({
      model: groq('openai/gpt-oss-120b'),
      system: systemPrompt,
      prompt: userQuery,
    });

    let cleaned = text.trim();

    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim();
    }

    let parsed, plan;
    try {
      parsed = JSON.parse(cleaned);
      plan = routerSchema.parse(parsed);
    } catch {
      console.log('Failed to parse LLM response, falling back to general:', cleaned.slice(0, 100));
      return { toolName: 'general', answer: userQuery };
    }

    if (plan.toolName === 'general') {
      console.log('General answer, no tool needed.');
      return { toolName: 'general', answer: plan.answer || userQuery };
    }

    const parameters = plan.toolName === 'webSearch'
      ? { query: plan.query, freshness: plan.freshness, count: plan.count }
      : plan.toolName === 'terminal'
        ? { query: userQuery, command: plan.command, args: plan.args }
        : plan.toolName === 'system'
          ? { operation: plan.operation, force: plan.force, delay: plan.delay }
          : plan.toolName === 'twitter'
            ? { content: plan.content }
            : plan.toolName === 'readFile'
              ? { filePath: plan.filePath, search: plan.search }
              : { filePath: plan.filePath };

    return { toolName: plan.toolName, parameters };
  } catch (error) {
    console.error('orchestrator error:', error.message);
    throw error;
  }
}