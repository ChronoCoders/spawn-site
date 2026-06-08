/// <reference types="@cloudflare/workers-types" />

// GET/POST /api/unsubscribe?e=<email>&t=<hmac> — remove an address from the
// list. The token is HMAC-SHA256(email, UNSUB_SECRET), so a link only works for
// its own address and can't be forged. GET serves a confirmation page (link
// click); POST returns 200 (RFC 8058 one-click List-Unsubscribe-Post).

interface Env {
  DB: D1Database;
  UNSUB_SECRET: string;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function page(title: string, body: string, status: number): Response {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#080808;color:#EFEFEF;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
.c{max-width:440px;padding:40px}.e{font-family:'Courier New',monospace;font-size:12px;letter-spacing:3px;color:#C1440E;text-transform:uppercase;margin-bottom:18px}
h1{font-size:26px;margin:0 0 14px}p{color:#9a9a9a;line-height:1.7;font-size:15px}a{color:#C1440E;text-decoration:none}</style></head>
<body><div class="c"><div class="e">// Spawn</div>${body}</div></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function unsubscribe(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const email = (url.searchParams.get('e') || '').trim().toLowerCase();
  const token = url.searchParams.get('t') || '';
  const isPost = request.method === 'POST';

  if (!email || !token) {
    return isPost
      ? new Response('Bad Request', { status: 400 })
      : page('Unsubscribe', '<h1>Invalid link</h1><p>This unsubscribe link is missing information.</p>', 400);
  }

  const expected = await hmacHex(env.UNSUB_SECRET, email);
  if (!timingSafeEqual(expected, token)) {
    return isPost
      ? new Response('Forbidden', { status: 403 })
      : page('Unsubscribe', '<h1>Invalid link</h1><p>This unsubscribe link is not valid.</p>', 403);
  }

  try {
    await env.DB.prepare('DELETE FROM subscribers WHERE email = ?').bind(email).run();
  } catch {
    return isPost
      ? new Response('Error', { status: 500 })
      : page('Unsubscribe', '<h1>Something went wrong</h1><p>Please try again later.</p>', 500);
  }

  return isPost
    ? new Response('OK', { status: 200 })
    : page(
        'Unsubscribed',
        "<h1>You're unsubscribed.</h1><p>You won't receive any further emails from Spawn. Changed your mind? You can always sign up again at <a href=\"https://spawnengine.io\">spawnengine.io</a>.</p>",
        200
      );
}

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => unsubscribe(request, env);
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => unsubscribe(request, env);
