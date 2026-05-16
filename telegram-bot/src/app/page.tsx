import { dbConfigured } from "@/lib/server/supabase";

export default function Home() {
  const webhookUrl = process.env.WEBHOOK_URL || "";
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "48px auto", padding: 24, lineHeight: 1.5 }}>
      <h1>Acharya Telegram Bot</h1>
      <p>This app receives Telegram webhook updates and exposes Acharya learning flows through Telegram.</p>
      <dl>
        <dt>Webhook</dt>
        <dd><code>/api/telegram/webhook</code></dd>
        <dt>Setup webhook</dt>
        <dd><code>/setup-webhook</code></dd>
        <dt>Supabase configured</dt>
        <dd><code>{String(dbConfigured)}</code></dd>
        <dt>Webhook URL</dt>
        <dd><code>{webhookUrl || "not configured"}</code></dd>
      </dl>
    </main>
  );
}
