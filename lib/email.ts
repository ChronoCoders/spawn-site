// Branded email templates for Spawn — table-based, inline-styled, dark theme,
// built for broad email-client compatibility (no external CSS, no web fonts).
// Shared by the signup confirmation (functions/api/subscribe.ts) and the
// launch broadcast (scripts/broadcast.ts).

const RUST = '#C1440E';
const BG = '#080808';
const CARD = '#0F0F0F';
const BORDER = '#1a1a1a';
const TEXT = '#EFEFEF';
const MUTED = '#9a9a9a';
const DIM = '#555555';
const LOGO = 'https://spawnengine.io/apple-touch-icon.png';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function paragraph(html: string): string {
  return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;color:${MUTED};margin:0 0 16px;">${html}</p>`;
}

function shell(opts: {
  eyebrow: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
}): string {
  const cta = opts.cta
    ? `<tr><td style="padding:32px 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="${RUST}"><a href="${opts.cta.url}" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;color:#ffffff;text-decoration:none;">${opts.cta.label}</a></td>
          </tr></table>
        </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark only">
</head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border:1px solid ${BORDER};">
    <tr><td align="center" style="padding:44px 40px 0;">
      <img src="${LOGO}" width="54" height="54" alt="Spawn" style="display:block;border:0;outline:none;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:22px;letter-spacing:7px;color:${TEXT};margin-top:18px;">SPAWN</div>
    </td></tr>
    <tr><td align="center" style="padding:30px 40px 0;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:3px;color:${RUST};text-transform:uppercase;">${opts.eyebrow}</div>
    </td></tr>
    <tr><td align="center" style="padding:14px 40px 0;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:27px;line-height:1.3;color:${TEXT};">${opts.heading}</div>
    </td></tr>
    <tr><td style="padding:22px 40px 0;">${opts.bodyHtml}</td></tr>
    ${cta}
    <tr><td style="padding:34px 40px 0;"><div style="border-top:1px solid ${BORDER};font-size:0;line-height:0;">&nbsp;</div></td></tr>
    <tr><td style="padding:22px 40px 44px;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#777777;">Altug Tatlisu, Creator of Spawn</div>
    </td></tr>
  </table>
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:22px 40px;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:${DIM};line-height:1.7;">
        You received this because you signed up at <a href="https://spawnengine.io" style="color:${RUST};text-decoration:none;">spawnengine.io</a>.<br>
        &copy; 2026 Spawn. All rights reserved.
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export function confirmationEmail(): EmailContent {
  return {
    subject: "You're on the Spawn list",
    html: shell({
      eyebrow: "// You're on the list",
      heading: "You're on the list.",
      bodyHtml:
        paragraph(
          'Spawn is a production-grade game engine written in Rust. Built from first principles, with no shortcuts, in a language that enforces its guarantees at compile time.'
        ) +
        paragraph(
          "The code is being written right now. You'll be the first to know the moment the repository goes public. One email, no noise."
        ),
    }),
    text:
      "You're on the list.\n\n" +
      'Spawn is a production-grade game engine written in Rust. Built from first principles, with no shortcuts, in a language that enforces its guarantees at compile time.\n\n' +
      "The code is being written right now. You'll be the first to know the moment the repository goes public. One email, no noise.\n\n" +
      'Altug Tatlisu, Creator of Spawn\n\n' +
      'You received this because you signed up at spawnengine.io.',
  };
}

export function launchEmail(): EmailContent {
  return {
    subject: 'Spawn is live',
    html: shell({
      eyebrow: '// The repo is public',
      heading: 'Spawn is live.',
      bodyHtml:
        paragraph(
          'The repository is now public. Spawn is a production-grade game engine written in Rust. The foundation, built right.'
        ) + paragraph('Thank you for being here from the start.'),
      cta: { label: 'VIEW ON GITHUB', url: 'https://github.com/ChronoCoders/spawn' },
    }),
    text:
      'Spawn is live.\n\n' +
      'The repository is now public. Spawn is a production-grade game engine written in Rust. The foundation, built right.\n\n' +
      'Code:  https://github.com/ChronoCoders/spawn\n' +
      'Site:  https://spawnengine.io\n\n' +
      'Altug Tatlisu, Creator of Spawn\n\n' +
      'You received this because you signed up at spawnengine.io.',
  };
}
