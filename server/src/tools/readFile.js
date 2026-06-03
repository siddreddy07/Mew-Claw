import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import fg from 'fast-glob';

export const readFileSchema = z.object({
  filePath: z.string().optional(),
  search: z.string().optional(),
});

export const readFilePresentPrompt = `
Output ONLY valid Telegram HTML with the file content wrapped in <pre><code class="language-...">...</code></pre>.

Map extension to language: .js->javascript, .ts/.tsx->typescript, .py->python, .json->json, .go->go, .rs->rust, .cpp->cpp, .html->html, .css->css.

Start with: // 📄 {filePath}

Then show the full file content.

Escape HTML entities: & -> &amp;, < -> &lt;, > -> &gt;.`;

async function findFile(query) {
  const patterns = [
    `**/*${query}*`,
    `**/${query}`,
    `**/${query}.*`,
    `**/*${query}*/**`,
  ];

  for (const pattern of patterns) {
    const entries = await fg(pattern, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**'],
      caseSensitiveMatch: false,
      onlyFiles: true,
    });
    if (entries.length > 0) return entries;
  }

  return [];
}

export const readFileTool = tool({
  description: 'Read and display a file from the project. Can search by name/pattern if exact path is unknown.',

  inputSchema: readFileSchema,

  execute: async ({ filePath, search }) => {
    const query = search || filePath;

    if (!query) {
      return { error: 'No file path or search term provided.' };
    }

    const fullPath = resolve(query);
    let content;

    try {
      content = await readFile(fullPath, 'utf8');
      return { filePath: fullPath, content };
    } catch {
      const matches = await findFile(query);
      if (matches.length === 0) {
        return { error: `No file found matching "${query}".` };
      }
      if (matches.length > 1) {
        return { error: `Multiple files found matching "${query}":\n${matches.join('\n')}`, matches };
      }
      const matchedPath = resolve(matches[0]);
      content = await readFile(matchedPath, 'utf8');
      return { filePath: matchedPath, content };
    }
  },
});
