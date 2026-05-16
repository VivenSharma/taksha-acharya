# Acharya Telegram Bot

Telegram frontend for Acharya. The bot keeps Telegram-specific user/session state in Supabase and calls the Acharya HTTP APIs for chat, quiz generation, course modules, and section content.

## Environment

Create `.env.local` from `.env.example`:

```env
TELEGRAM_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
GOOGLE_AI_API_KEY=
WEBHOOK_URL=
ACHARYA_BASE_URL=
```

`WEBHOOK_URL` should be the public base URL of this bot deployment, for example:

```text
https://your-bot.example.com
```

The bot registers `WEBHOOK_URL + /api/telegram/webhook`. If you provide the full webhook path, it uses it as-is.

`ACHARYA_BASE_URL` must be the public URL of the main Acharya web app, for example:

```text
https://taksha-acharya-app.vercel.app
```

The Telegram bot uses that URL to call Acharya's existing `/api/chat`, `/api/quiz`, and `/api/content/*` endpoints.

## Supabase

Run `supabase-schema.sql` in the Acharya Supabase project before starting the bot. It creates:

- `telegram_users`
- `telegram_chat_logs`
- `telegram_progress`
- `telegram_quiz_sessions`
- `telegram_quiz_attempts`

## Local Development

Install dependencies and run the bot:

```bash
npm install
npm run dev
```

If the main Acharya app is running locally at `http://localhost:3000`, set `ACHARYA_BASE_URL=http://localhost:3000`. For a public Telegram webhook in local development, expose the bot with a tunneling tool and set `WEBHOOK_URL` to that public HTTPS URL.

## Webhook Setup

After deployment, call:

```text
https://your-bot.example.com/setup-webhook
```

That registers the Telegram webhook with Bot API using `TELEGRAM_BOT_TOKEN`.

## Commands

- `/start`
- `/chat`
- `/quiz`
- `/courses`
- `/progress`
- `/help`
