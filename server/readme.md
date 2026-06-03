# 🐱 Mew Server

A Telegram bot + REST API server powered by AI. Mew is a snarky, code-savvy cat assistant that can read and edit files, run terminal commands, search the web, control your PC, and post tweets — all with inline approval for destructive actions.

---

## ✨ Features

- **AI-Powered Routing** — Groq-powered orchestrator understands natural language and routes to the right tool
- **8 Tools** — read files, edit code, search the web, run terminal commands, control system operations, post tweets, and more
- **Approval Flow** — destructive actions (terminal, system, twitter) require inline Approve / Reject before executing
- **Fuzzy File Search** — say "read the chat service" and Mew finds the file automatically via fast-glob
- **Telegram Bot** — full bot integration with thinking indicator, message editing, and HTML formatting
- **REST API** — JSON endpoint at `/api` for external clients
- **Twitter OAuth 2.0** — authenticate once, then post tweets on your behalf

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Groq API key
- (Optional) Twitter OAuth 2.0 Client ID and Secret for tweeting

### Installation

```bash
git clone <repo> && cd server
npm install
```

### Environment Variables

Copy `.env` and configure:

```env
# Server
PORT=7050

# AI
GROQ_API_KEY=gsk_your_key_here
LANGSEARCH_API_KEY=sk-your_key_here    # Web search — get at https://docs.langsearch.com

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...

# Telegram
TELEGRAM_BOT_TOKEN=8890213850:AAEhsErLTs...

# Twitter OAuth 2.0 (optional — needed for posting tweets)
CLIENT_ID=RmZxNj...
CLIENT_SECRET=5l-l5hY8...
X_CALLBACK_URL=https://your-ngrok-url.ngrok-free.dev/telegram/x/callback

# Twitter API (legacy — fallback if OAuth tokens not in memory)
TWITTER_Access_TOKEN=...
TWITTER_Refresh_Token=...
```

### Run

```bash
npm run dev
# → Server running on port 7050
```

### Set Telegram Webhook

Telegram needs to know where to send incoming messages. Use this curl command to point your bot to your server:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-host/telegram/webhook"}'
```

**Replace:**
- `<YOUR_TOKEN>` with your bot token from BotFather
- `https://your-host` with your actual server URL (e.g. `https://abc123.ngrok-free.dev`)

**Verify it worked:**

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-host/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

> **For local development**, use [ngrok](https://ngrok.com/) to expose your local server: `ngrok http 7050` — then use the ngrok URL as your webhook URL.

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api` | Send a query to Mew (JSON response) |
| `POST` | `/telegram/webhook` | Telegram bot webhook receiver |
| `GET` | `/x/auth` | Start Twitter OAuth 2.0 authorization flow |
| `GET` | `/telegram/x/callback` | Twitter OAuth 2.0 callback |

### `POST /api`

**Request:**
```json
{ "query": "show me the chat service" }
```

**Response:**
```json
{
  "answer": "// 📄 D:\\Claw\\server\\src\\services\\chat.Service.js\n\nimport { orchestrator }...",
  "result": { "filePath": "D:\\Claw\\server\\src\\services\\chat.Service.js", "content": "..." },
  "toolName": "readFile",
  "needsApproval": false
}
```

> The `answer` field contains plain text (HTML tags stripped) for the REST API. The Telegram webhook receives the raw HTML version.

---

## 🤖 Telegram Bot

### How to Use

1. **Find your bot** — open Telegram and search for your bot's username (the one you created with [@BotFather](https://t.me/BotFather))
2. **Start a chat** — tap **Start** or send `/start` to see a welcome message
3. **Send anything** — just type what you want, for example:
   - `hello` — get a snarky reply
   - `read the webhook service` — Mew finds and displays the file
   - `search for express docs` — searches the web
   - `tweet i love coding` — Mew asks for approval before posting
4. **Approve actions** — for terminal commands, system operations, and tweets, tap the inline **Approve ✅** or **Reject ❌** button

The bot is always live as long as the server is running and the webhook is set.

### Commands

| Command | Description |
|---------|-------------|
| `/start` | Random welcome message |
| Any text | Mew routes your query through the AI pipeline |

### Example Interactions

| You say | What happens |
|---------|-------------|
| `hello` | Snarky general response |
| `read the webhook service` | Orchestrator calls `readFile` with `{ search: "webhook.Service" }` → finds and displays the file |
| `fix the typo in chat controller` | Orchestrator calls `editFile` to modify the file |
| `search for express docs` | Orchestrator calls `webSearch` |
| `how many files in src?` | Orchestrator calls `terminal` → **asks for approval** |
| `shutdown the pc` | Orchestrator calls `system` → **asks for approval** |
| `tweet hello world` | Orchestrator calls `twitter` → **asks for approval** |

### Message Flow

```
User sends message
    │
    ▼
sendThinking("🐾 mew is thinking...")      ← thinking message appears
sendTyping(chatId)                          ← typing indicator
    │
    ▼
Orchestrator (Groq LLM)                     ← decides which tool
    │
    ▼
Tool execute()                             ← runs the tool
    │
    ▼
Presentor (Groq LLM)                        ← formats response as HTML
    │
    ▼
editMessage(thinkingMsgId, answer)          ← edits thinking message in-place
```

If the tool returns `status: "pending"`, the thinking message is edited with an inline approval keyboard instead, and the action only runs after the user taps **Approve ✅**.

---

## 🛠️ Tools

All tools live in `src/tools/` and are registered in `src/tools/index.js`.

| Tool | Schema | Requires Approval | Description |
|------|--------|:---:|-------------|
| `readFile` | `{ filePath?, search? }` | ❌ | Read file contents. Supports fuzzy name search via fast-glob |
| `editFile` | `{ query, folderName, fileName }` | ❌ | AI-powered file edits |
| `webSearch` | `{ query, freshness, count }` | ❌ | Web search via LangSearch API |
| `terminal` | `{ command, args }` | ✅ | Execute CLI commands (PowerShell on Windows, bash on Unix) |
| `system` | `{ operation, force?, delay? }` | ✅ | System operations: lock, logout, restart, shutdown, sleep, hibernate |
| `twitter` | `{ content }` | ✅ | Post a tweet (requires OAuth) |

### Approval Flow

1. Tool execute returns `{ status: "pending", ...data }`
2. Presentor formats an approval prompt as HTML
3. Webhook edits the thinking message with the prompt + inline keyboard
4. User taps **Approve ✅** → callback handler executes the real action
5. User taps **Reject ❌** → callback handler cancels

---

## 🐦 Twitter Integration

### Setup

1. Create a Twitter OAuth 2.0 app in the [Twitter Developer Portal](https://developer.twitter.com/)
2. Set the callback URL to `https://your-host/telegram/x/callback`
3. Add `CLIENT_ID` and `CLIENT_SECRET` to `.env`
4. Set `X_CALLBACK_URL` to your full callback URL

### Authenticate

```bash
# Open in browser:
https://your-host/x/auth
# → Redirects to Twitter → Authorize → Redirects back
# → Tokens stored in memory
```

### Post a Tweet

```
You: tweet hello world
Mew: 🐦 New Tweet
     ┌──────────────────────┐
     │ hello world          │
     └──────────────────────┘
     [Approve ✅] [Reject ❌]

You: [tap Approve]
Mew: ✅ Tweet posted!
     https://x.com/user/status/1234567890
```

---

## 📁 Project Structure

```
server/
├── index.js                        # Express entry point — mounts all routes
├── package.json                    # ESM project
├── .env                            # Environment variables
├── readme.md
│
└── src/
    ├── ai/
    │   ├── orchestrator/
    │   │   └── orchestrator.js     # Groq LLM — routes user query to the correct tool
    │   └── presentor/
    │       └── presentor.js        # Groq LLM — formats tool output as Telegram HTML
    │
    ├── config/
    │   └── db.js                   # Neon PostgreSQL connection via Drizzle
    │
    ├── controllers/
    │   ├── chat.Controller.js      # POST /api handler — strips HTML for JSON response
    │   └── webhook.Controller.js   # POST /telegram/webhook — fire-and-forget async handler
    │
    ├── routes/
    │   ├── chat.js                 # REST API route (/api)
    │   ├── webhook.js              # Telegram webhook + Twitter OAuth callback
    │   └── twitter.js              # Twitter OAuth auth initiation (/x/auth)
    │
    ├── schemas/
    │   └── schema.js               # Drizzle ORM schemas + Zod validation for webhook
    │
    ├── services/
    │   ├── telegram.Service.js     # Telegram Bot API wrapper (send, edit, keyboard, etc.)
    │   ├── webhook.Service.js      # Core bot logic — orchestration, approval, callback handling
    │   ├── chat.Service.js         # AI pipeline — orchestrator → tool → presentor
    │   └── Twitter.Service.js      # Twitter API client — postTweet, refreshToken, uploadMedia
    │
    ├── tools/
    │   ├── index.js                # Tool registry — all tools registered here
    │   ├── readFile.js             # Read files (supports fuzzy search via fast-glob)
    │   ├── editFile.js             # AI-powered file editing
    │   ├── webSearch.js            # Web search tool
    │   ├── terminalTool.js         # Terminal command execution (approval required)
    │   ├── systemTool.js           # System operations (approval required)
    │   └── twitterTool.js          # Twitter tweet posting (approval required)
    │
    └── utils/                      # (future utility modules)
```

---

## 🏗️ Architecture

```
                    ┌──────────────────────┐
                    │   Telegram / HTTP     │
                    └──────┬───────────────┘
                           │
              ┌────────────┴────────────┐
              │  webhook.Controller.js   │
              │  chat.Controller.js      │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │   webhook.Service.js    │
              │   chat.Service.js       │
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │      orchestrator       │ ← Groq LLM: "which tool?"
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │  tool.execute(params)   │ ← returns data or { status: "pending" }
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │       presentor         │ ← Groq LLM: "format as HTML"
              └────────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              │  editMessage / reply    │ ← Telegram Bot API
              └─────────────────────────┘
```

---

## 🧪 Development

```bash
# Start with hot-reload
npm run dev

# Add a new tool:
# 1. Create src/tools/yourTool.js (schema + execute + presentPrompt)
# 2. Register in src/tools/index.js
# 3. The orchestrator automatically picks it up
```

---

## 📄 License

ISC
