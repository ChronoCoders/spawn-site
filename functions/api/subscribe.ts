/// <reference types="@cloudflare/workers-types" />

import { confirmationEmail } from '../../lib/email';

// POST /api/subscribe — validate, persist to D1, fire a confirmation email
// via Resend. Storage is the source of truth: a Resend failure never loses a
// signup, it only flips `emailed` to false in the response.

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  TURNSTILE_SECRET_KEY?: string;
  UNSUB_SECRET?: string;
}

async function unsubscribeUrl(secret: string, email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email));
  const t = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `https://spawnengine.io/api/unsubscribe?e=${encodeURIComponent(email)}&t=${t}`;
}

interface Payload {
  email?: unknown;
  company?: unknown;
  token?: unknown;
}

// Verify a Cloudflare Turnstile token. If no secret is configured we log a
// warning and allow the request through, so local dev works without keys.
async function verifyTurnstile(env: Env, token: string, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping Turnstile verification.');
    return true;
  }
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  // Honeypot: a real user never fills the hidden `company` field. Pretend
  // success so bots get no signal.
  if (typeof payload.company === 'string' && payload.company.trim() !== '') {
    return json({ ok: true, already: false, emailed: false }, 200);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'Enter a valid email address.' }, 422);
  }

  const token = typeof payload.token === 'string' ? payload.token : '';
  const verified = await verifyTurnstile(env, token, request.headers.get('CF-Connecting-IP'));
  if (!verified) {
    return json({ error: 'Verification failed. Please try again.' }, 400);
  }

  let already = false;
  try {
    const res = await env.DB.prepare(
      'INSERT INTO subscribers (email) VALUES (?) ON CONFLICT(email) DO NOTHING'
    )
      .bind(email)
      .run();
    already = res.meta.changes === 0;
  } catch {
    return json({ error: 'Could not save your email. Try again.' }, 500);
  }

  if (already) {
    return json({ ok: true, already: true, emailed: false }, 200);
  }

  let emailed = false;
  try {
    const send = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [email],
        ...confirmationEmail(env.UNSUB_SECRET ? await unsubscribeUrl(env.UNSUB_SECRET, email) : undefined),
      }),
    });
    emailed = send.ok;
  } catch {
    emailed = false;
  }

  return json({ ok: true, already: false, emailed }, 200);
};
