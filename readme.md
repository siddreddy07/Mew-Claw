# Mew — AI Agent

**Your personal AI agent, right inside Telegram.**

Mew is an AI agent that lives in your Telegram. It perceives your messages, decides which tool to use via LLM reasoning, and autonomously executes actions on your PC — read files, run commands, lock your screen, shut down, search the web, or post tweets. Built with the **Vercel AI SDK** and **Groq API**, with inline approval for every destructive action.

---

## Capabilities

| Category | What Mew Can Do |
|----------|----------------|
| **System Control** | Lock your PC, log out, restart, shut down, sleep, or hibernate — all remotely from Telegram |
| **Terminal** | Run any command on your machine — git, file operations, scripts, whatever you need |
| **Code** | Read any file, search by name (fuzzy matching), or AI-powered code edits |
| **Web Search** | Search the web and get summarized results |
| **Twitter/X** | Post tweets after OAuth authorization |
| **LinkedIn** | Post text, image, or video on LinkedIn with smart file resolution |
| **General Chat** | Snarky, witty conversation — Mew has personality |

Every destructive action (terminal, system, twitter, linkedin) requires you to tap **Approve ✅** on the inline button before it executes. Nothing runs without your say-so.

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Telegram bot token](https://t.me/BotFather)
- A [Groq API key](https://console.groq.com)

### Setup

```bash
git clone https://github.com/siddreddy07/Mew-Claw.git && cd Mew-Claw/server
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
| `LANGSEARCH_API_KEY` | For web search | Get at [docs.langsearch.com](https://docs.langsearch.com) |
| `CLIENT_ID` / `CLIENT_SECRET` | For Twitter | Twitter OAuth 2.0 credentials |
| `X_CALLBACK_URL` | For Twitter | Must match the callback URL in Twitter Dev Portal |
| `LINKEDIN_CLIENT_ID` | For LinkedIn | LinkedIn OAuth 2.0 client ID |
| `LINKEDIN_CLIENT_SECRET` | For LinkedIn | LinkedIn OAuth 2.0 client secret |
| `LINKEDIN_ACCESS_TOKEN` | For LinkedIn | LinkedIn access token (from `/in/auth` or manual) |
| `LINKEDIN_CALLBACK_URL` | For LinkedIn | Must match the callback URL in LinkedIn Dev Portal |

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
| `post on linkedin saying excited to start` | Posts text to LinkedIn — **asks approval** |
| `post this image on linkedin with caption check it out` | Uploads image + text to LinkedIn — **asks approval** |
| `share this video.mp4 on linkedin with text look at this` | Uploads video + text to LinkedIn — **asks approval** |

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

Tools that require approval (`system`, `terminal`, `twitter`, `linkedin`) return `{ status: "pending" }`. The presentor formats an approval prompt, and the callback handler executes the real action only after the user taps **Approve ✅**.

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
│   │   ├── chat.js          # REST API route
│   │   ├── twitter.js       # Twitter OAuth initiation + token store
│   │   ├── linkedin.js      # LinkedIn OAuth initiation + token store
│   │   └── webhook.js       # Telegram webhook + OAuth callbacks
│   ├── services/            # Business logic
│   │   ├── telegram.Service.js
│   │   ├── webhook.Service.js
│   │   ├── chat.Service.js
│   │   ├── Twitter.Service.js
│   │   └── LinkedIn.Service.js  # Post text/image/video to LinkedIn
│   └── tools/               # Tool implementations
│       ├── readFile.js      # Fuzzy file search via fast-glob
│       ├── editFile.js      # AI-powered edits
│       ├── webSearch.js     # LangSearch API
│       ├── terminalTool.js  # CLI execution (approval)
│       ├── systemTool.js    # PC controls (approval)
│       ├── twitterTool.js   # Tweet posting (approval)
│       └── linkedInTool.js  # LinkedIn posting (approval)
└── .env.example
```

---

## LinkedIn Integration

### OAuth Flow

```
You: "post on linkedin"
        │
        ▼
   🤔 mew is thinking...
        │
        ▼
   💼 New LinkedIn Post
   {your content}
   [Approve ✅] [Reject ❌]
        │
   You tap Approve ✅
        │
        ▼
   ✅ LinkedIn post published!
```

### Setup Guide

1. **Create a LinkedIn App** at [developer.linkedin.com](https://developer.linkedin.com/)
   - Add the **Sign In with LinkedIn using OpenID Connect** product
   - Add **Share on LinkedIn** product
   - Set the OAuth redirect URL to `https://your-host.com/telegram/in/callback`

2. **Add these to your `.env`:**
   ```
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   LINKEDIN_CALLBACK_URL=https://your-host.com/telegram/in/callback
   ```

3. **Authorize the app** — open this in your browser:
   ```
   https://your-host.com/in/auth
   ```
   This redirects you to LinkedIn's login page. Sign in and approve.

4. After login, LinkedIn redirects back to your server. The access token and expiry are logged in your **console**:
   ```
   LinkedIn OAuth tokens stored: { accessToken: 'AQX...', expiresIn: 5183999 }
   ```
   Copy the `accessToken` value into your `.env` as `LINKEDIN_ACCESS_TOKEN`.

5. **Done.** Now you can post on LinkedIn via Telegram. Every post requires **inline approval** — nothing posts without your tap.

### Media Support

Mew automatically detects and handles media by file extension:

| Type | Supported Formats |
|------|------------------|
| **Image** | `.jpg` `.jpeg` `.png` `.gif` `.bmp` `.webp` |
| **Video** | `.mp4` `.mov` `.avi` `.mkv` `.webm` |

### Smart File Resolution

Just say the filename — Mew finds it:

```
"post this video.mp4 on linkedin with text hello"
"share image.jpg on linkedin with caption check this out"
"post on linkedin saying excited for this"
```

Mew uses **fast-glob** to search the entire project (excluding `node_modules`, `.git`, `dist`, etc.). If it finds multiple matches, it lists them so you can be more specific. No need to type full paths.

### LinkedIn API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /v2/userinfo` | Resolve person ID from access token |
| `POST /v2/assets?action=registerUpload` | Register image upload |
| `POST /v2/videos?action=initializeUpload` | Initialize video upload |
| `PUT {uploadUrl}` | Upload raw media bytes |
| `POST /v2/posts` | Create the post with text + optional media |

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

---

Built by **Siddharth Reddy** · siddharthreddy627@gmail.com
