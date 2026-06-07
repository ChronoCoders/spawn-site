/**
 * Launch broadcast — emails every subscriber that has not yet received the
 * "Spawn is live" announcement, then marks them as emailed in D1.
 *
 * Usage:
 *   1. Populate the following in your shell or a local .env file (gitignored):
 *        RESEND_API_KEY      Resend API key
 *        RESEND_FROM         Sender, e.g. "Spawn <hello@spawnengine.io>"
 *                            (optional; defaults to Resend's onboarding sender)
 *        CF_D1_ACCOUNT_ID    Cloudflare account id
 *        CF_D1_DATABASE_ID   D1 database id (from `wrangler d1 create`)
 *        CF_D1_API_TOKEN     Cloudflare API token with D1 read/write scope
 *   2. Dry run to preview without sending:
 *        npm run broadcast -- --dry-run
 *   3. Send for real:
 *        npm run broadcast
 *
 * Idempotent: re-running only contacts addresses with emailed = 0, so an
 * interrupted run is safe to resume.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Minimal .env loader — fills process.env for any key not already set.
function loadEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No .env file — rely entirely on the existing environment.
  }
}

interface Subscriber {
  id: number;
  email: string;
  emailed: number;
}

const SUBJECT = 'Spawn is live';
const REPO_URL = 'https://github.com/ChronoCoders/spawn';
const SITE_URL = 'https://spawnengine.io';

const TEXT_BODY =
  'Spawn is live.\n\n' +
  'The repository is now public. Spawn is a production-grade game engine ' +
  'written in Rust — the foundation, built right.\n\n' +
  `Code:  ${REPO_URL}\n` +
  `Site:  ${SITE_URL}\n\n` +
  '— Altug Tatlisu, Creator of Spawn';

const HTML_BODY =
  '<div style="font-family:sans-serif;line-height:1.6;color:#111">' +
  '<p><strong>Spawn is live.</strong></p>' +
  '<p>The repository is now public. Spawn is a production-grade game engine ' +
  'written in Rust — the foundation, built right.</p>' +
  `<p>Code: <a href="${REPO_URL}">${REPO_URL}</a><br>` +
  `Site: <a href="${SITE_URL}">${SITE_URL}</a></p>` +
  '<p>— Altug Tatlisu, Creator of Spawn</p>' +
  '</div>';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function d1Query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const accountId = requireEnv('CF_D1_ACCOUNT_ID');
  const databaseId = requireEnv('CF_D1_DATABASE_ID');
  const apiToken = requireEnv('CF_D1_API_TOKEN');
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    }
  );
  const data = (await res.json()) as {
    success: boolean;
    errors?: { message: string }[];
    result?: { results: T[] }[];
  };
  if (!data.success) {
    const detail = data.errors?.map((e) => e.message).join('; ') || 'unknown error';
    throw new Error(`D1 query failed: ${detail}`);
  }
  return data.result?.[0]?.results ?? [];
}

async function sendEmail(apiKey: string, from: string, to: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: SUBJECT,
        html: HTML_BODY,
        text: TEXT_BODY,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  loadEnv();
  const dryRun = process.argv.includes('--dry-run');
  const apiKey = requireEnv('RESEND_API_KEY');
  const from = process.env.RESEND_FROM || 'Spawn <onboarding@resend.dev>';

  const subscribers = await d1Query<Subscriber>(
    'SELECT id, email, emailed FROM subscribers ORDER BY id'
  );
  const total = subscribers.length;
  const pending = subscribers.filter((s) => s.emailed === 0);
  const skipped = total - pending.length;

  console.log(`Subscribers: ${total} total, ${skipped} already emailed, ${pending.length} pending.`);
  if (dryRun) {
    console.log('--dry-run: no emails sent, no rows updated.');
    for (const s of pending) console.log(`  would send → ${s.email}`);
    console.log(`\nSummary: total ${total}, sent 0, skipped ${skipped}, failed 0 (dry run).`);
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const s of pending) {
    const ok = await sendEmail(apiKey, from, s.email);
    if (!ok) {
      failed++;
      console.error(`  FAILED → ${s.email}`);
      continue;
    }
    try {
      await d1Query('UPDATE subscribers SET emailed = 1 WHERE id = ?', [s.id]);
      sent++;
      console.log(`  sent → ${s.email}`);
    } catch (err) {
      failed++;
      console.error(`  sent but DB update FAILED → ${s.email}: ${(err as Error).message}`);
    }
  }

  console.log(`\nSummary: total ${total}, sent ${sent}, skipped ${skipped}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
