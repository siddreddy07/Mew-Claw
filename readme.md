# Mew — Telegram Remote Assistant

**Your computer, in your pocket. Chat naturally, control everything.**

Mew is an AI-powered Telegram bot that turns your phone into a remote control for your PC. Browse files, run commands, lock your screen, shut down, search the web, or post tweets — just by typing a message. Powered by Groq AI, with inline approval for every destructive action.

---

## Capabilities

| Category | What Mew Can Do |
|----------|----------------|
| **System Control** | Lock your PC, log out, restart, shut down, sleep, or hibernate — all remotely from Telegram |
| **Terminal** | Run any command on your machine — git, file operations, scripts, whatever you need |
| **Code** | Read any file, search by name (fuzzy matching), or AI-powered code edits |
| **Web Search** | Search the web and get summarized results |
| **Twitter** | Post tweets after OAuth authorization |
| **General Chat** | Snarky, witty conversation — Mew has personality |

Every destructive action (terminal, system, twitter) requires you to tap **Approve ✅** on the inline button before it executes. Nothing runs without your say-so.

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Telegram bot token](https://t.me/BotFather)
- A [Groq API key](https://console.groq.com)

### Setup

```bash
git clone <repo> && cd server
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### Configure Webhook

Telegram needs to know where to send messages. Run this once:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-host.com/telegram/webhook"}'
```

Verify it worked:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

> **Local development:** Use [ngrok](https://ngrok.com/) — `ngrok http 7050` — then use the ngrok URL as your webhook.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 7050) |
| `GROQ_API_KEY` | Yes | AI routing & formatting — get at [console.groq.com](https://console.groq.com) |
| `TELEGRAM_BOT_TOKEN` | Yes | From [@BotFather](https://t.me/BotFather) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon, etc.) |
| `LANGSEARCH_API_KEY` | For web search | Get at [docs.langsearch.com](https://docs.langsearch.com) |
| `CLIENT_ID` / `CLIENT_SECRET` | For Twitter | Twitter OAuth 2.0 credentials |
| `X_CALLBACK_URL` | For Twitter | Must match the callback URL in Twitter Dev Portal |

See `.env.example` for the full list.

---

## Using the Bot

Open Telegram, find your bot, and start chatting.

### Examples

| You say | What happens |
|---------|-------------|
| `hello` | Snarky reply |
| `lock my pc` | Locks your screen — **asks approval first** |
| `shutdown in 5 minutes` | Schedules shutdown — **asks approval** |
| `read the webhook service` | Finds and displays the file |
| `fix the typo in chat controller` | AI edits the file |
| `how many files in src?` | Runs a terminal command — **asks approval** |
| `search for express docs` | Web search with summarized results |
| `tweet hello world` | Posts to Twitter — **asks approval** |

### Message Flow

```
You: "lock my pc"
        │
        ▼
   🤔 mew is thinking...       ← temporary message
        │
        ▼
   🔧 System Operation
   🔒 lock
   [Approve ✅] [Reject ❌]     ← inline keyboard on the same message
        │
    You tap Approve ✅
        │
        ▼
   ✅ PC is locked              ← same message edited with result
```

The thinking message is **edited in-place** throughout the entire flow — no message spam.

---

## API

### `POST /api`

Send queries programmatically:

```bash
curl -X POST http://localhost:7050/api \
  -H "Content-Type: application/json" \
  -d '{"query": "how many files in src?"}'
```

Response:
```json
{
  "answer": "There are 42 files in the src directory.",
  "result": { "command": "Get-ChildItem", "args": ["-Recurse", "-File"] },
  "toolName": "terminal",
  "needsApproval": true
}
```

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Telegram   │────▶│  Webhook Handler │────▶│ Orchestrator│
│   / Web      │     │  (Controller +   │     │  (Groq LLM) │
│              │◀────│   Service)       │◀────│             │
└──────────────┘     └──────────────────┘     └──────┬──────┘
                                                      │
                                           ┌──────────┴──────────┐
                                           │     Tool Execute     │
                                           │  (readFile / system  │
                                           │   / terminal / etc)  │
                                           └──────────┬──────────┘
                                                      │
                                           ┌──────────┴──────────┐
                                           │     Presentor       │
                                           │  (Groq LLM formats  │
                                           │   response as HTML) │
                                           └─────────────────────┘
```

Tools that require approval (`system`, `terminal`, `twitter`) return `{ status: "pending" }`. The presentor formats an approval prompt, and the callback handler executes the real action only after the user taps **Approve ✅**.

---

## Project Structure

```
server/
├── index.js                 # Express entry point
├── src/
│   ├── ai/
│   │   ├── orchestrator/    # Routes queries to tools via Groq
│   │   └── presentor/       # Formats responses via Groq
│   ├── controllers/         # Express route handlers
│   ├── routes/              # Route definitions
│   ├── services/            # Business logic
│   │   ├── telegram.Service.js
│   │   ├── webhook.Service.js
│   │   ├── chat.Service.js
│   │   └── Twitter.Service.js
│   ├── tools/               # Tool implementations
│   │   ├── readFile.js      # Fuzzy file search via fast-glob
│   │   ├── editFile.js      # AI-powered edits
│   │   ├── webSearch.js     # LangSearch API
│   │   ├── terminalTool.js  # CLI execution (approval)
│   │   ├── systemTool.js    # PC controls (approval)
│   │   └── twitterTool.js   # Tweet posting (approval)
│   └── schemas/             # DB schemas
└── .env.example
```

---

## Development

```bash
npm run dev    # hot-reload with nodemon
```

To add a new tool:
1. Create `src/tools/yourTool.js` with schema, execute, and presentPrompt
2. Register in `src/tools/index.js`
3. The orchestrator picks it up automatically

---

## License

ISC
