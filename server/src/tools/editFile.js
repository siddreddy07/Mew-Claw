import { tool } from 'ai';
import { z } from 'zod';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const editFileSchema = z.object({
  query: z.string(),
  folderName: z.string(),
  fileName: z.string(),
});

export const editFilePresentPrompt = `
You are a Telegram message formatter that outputs code inside a realistic VSCode Editor UI.
Output ONLY a valid Telegram HTML string. No markdown, no triple backticks (\`\`\`), no explanations.

CRITICAL TELEGRAM HTML RULES:
1. Wrap the entire editor UI inside a SINGLE <pre><code class="language-{LANGUAGE}">...</code></pre> block. This forces Telegram to render a single, unbroken dark editor window with syntax highlighting.
2. Escape all HTML entities within the text and code before outputting:
   - Replace & with &amp;
   - Replace < with &lt;
   - Replace > with &gt;

OUTPUT TEMPLATE (Generate exactly this layout INSIDE the pre/code block):

<pre><code class="language-{LANGUAGE}">// 🖥 VSCODE EDITOR · {full/file/path/filename.ext}
// ⏱ Modified just now · ≡ {total lines in new file} lines

/* ▬▬▬▬▬▬▬▬▬▬▬▬ SUMMARY ▬▬▬▬▬▬▬▬▬▬▬▬
 * {One sharp sentence — what changed, where, and why}
 * 📊 +{N} lines added  |  -{N} lines removed
 * ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ */

{context line}
- {removed line}
+ {added line}
{context line}

// ✅ Done: {filename.ext} saved successfully.</code></pre>

STRICT LOGIC RULES:
- LANGUAGE Mapping: Detect from extension (.js -> javascript, .ts/.tsx -> typescript, .py -> python, .json -> json, .go -> go, .rs -> rust, .cpp -> cpp, .html -> html, .css -> css).
- DIFF LOGIC: Show ONLY changed blocks + exactly 2 context lines above and below. Prefix lines with exactly "- ", "+ ", or "  " (two spaces). Do not output git headers or @@ symbols.
- STATS LOGIC: Count exact changes from the diff. Total lines = exact line count of the NEW file.
`;


const editModel = groq('openai/gpt-oss-120b');

console.log('Editor File is working..')

export const editFileTool = tool({
  description: 'Edit a file in the project based on user instructions. Reads the file first, then applies the edit.',
  inputSchema: editFileSchema,

  execute: async ({ query, folderName, fileName }) => {
    const projectRoot = join(__dirname, '..', '..');
    const filePath = join(projectRoot, folderName, fileName);

    const oldContent = await readFile(filePath, 'utf8');

    const { text: newContent } = await generateText({
      model: editModel,
      system: `You are a code editor. Given a file's current content and a user's edit request, return ONLY the NEW full file content — no markdown, no explanation, no triple backticks. Apply the edit exactly as requested.`,
      prompt: `File: ${filePath}\n\nCurrent content:\n${oldContent}\n\nEdit request: ${query}\n\nReturn ONLY the new file content.`,
    });

    await writeFile(filePath, newContent, 'utf8');

    return {
      filePath,
      oldContent,
      newContent,
      summary: query,
    };
  },
});
