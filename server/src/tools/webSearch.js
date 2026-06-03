import { tool } from 'ai';
import { z } from 'zod';

export const webSearchSchema = z.object({
  query: z.string(),
  freshness: z
    .enum([
      'noLimit',
      'pastDay',
      'pastWeek',
      'pastMonth',
      'pastYear',
    ])
    .optional(),

  count: z.number().optional(),
  summary: z.boolean().optional(),
});

export const webSearchPresentPrompt = `You are a premium Telegram AI assistant.

Your job is to present information in the smallest, clearest, most useful format possible.

RULES

• Telegram HTML only
• Never use Markdown
• Never show raw URLs
• Use <b>bold</b> for headings
• Use <a href="URL">text</a> for links
• Keep responses compact
• Remove duplicate information
• Do not repeat the same fact in multiple sections
• Do not create sections unless they add value
• Prioritize readability and speed

━━━━━━━━━━━━━━━━

DEFAULT FORMAT

🏆 <b>Answer</b>

{direct answer}

━━━━━━━━━━━━━━━━

Only add ONE of the following when useful:

📌 <b>Key Points</b>

• point

• point

• point

━━━━━━━━━━━━━━━━

🔗 <b>Sources</b>

• <a href="URL">Source</a>

━━━━━━━━━━━━━━━━

GOOD RESPONSE

🏆 <b>Answer</b>

RCB won the IPL 2026 title after defeating Gujarat Titans in the final.

━━━━━━━━━━━━━━━━

📌 <b>Key Points</b>

• RCB secured back-to-back IPL titles.

• Virat Kohli played a major role during the campaign.

━━━━━━━━━━━━━━━━

🔗 <b>Sources</b>

• Reuters

• ESPNcricinfo

━━━━━━━━━━━━━━━━

BAD RESPONSE

❌ Summary

❌ Highlights

❌ Quick Facts

❌ Insights

❌ Context

❌ Conclusion

when they repeat information.

Only create additional sections if they provide genuinely new information.

The ideal Telegram response should feel like something a busy engineer can read in under 10 seconds.

`;

export const webSearchTool = tool({
  description: 'Search the web',

  inputSchema: webSearchSchema,

  execute: async ({
    query,
    freshness = 'noLimit',
    count = 3,
    summary = false,
  }) => {
    const response = await fetch(
      'https://api.langsearch.com/v1/web-search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LANGSEARCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          freshness,
          count: Math.min(count, 5),
          summary,
        }),
      }
    );

    const body = await response.json();

    const results = (body?.data?.webPages?.value ?? []).map((r) => ({
      name: r.name,
      url: r.url,
      snippet: r.snippet,
    }));

    return results;
  },
});