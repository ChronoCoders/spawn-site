# spawn-site

Marketing site for the [Spawn game engine](https://github.com/ChronoCoders/spawn) — a static [Astro](https://astro.build) site styled with Tailwind, featuring a Three.js 3D hero and an email signup backed by Cloudflare Pages Functions. Deploys to Cloudflare Pages.

## Stack

- **Astro 4** (static output) with the Preact and Tailwind integrations
- **Three.js** hero rendered as a client-only island (`src/components/Hero3D.tsx`)
- **Cloudflare Pages Functions** for the `/api/subscribe` endpoint
- **Cloudflare D1** for the subscriber list, **Resend** for transactional email, **Turnstile** for spam protection

## Development

```sh
npm install
npm run dev        # Astro dev server at http://localhost:4321
```

The dev server serves the static site only. Pages Functions (`/api/subscribe`) do not run under `astro dev` — to exercise the function and a local D1 binding, build first and serve with Wrangler:

```sh
npm run build
npx wrangler pages dev dist --d1 DB=spawn-subscribers
```

## Build & deploy

```sh
npm run build      # static output to dist/
npm run deploy     # build + wrangler pages deploy dist
```

## Email signup backend

The `/api/subscribe` function validates the address, verifies the Turnstile token, stores the email in D1, and sends a confirmation via Resend. One-time setup:

```sh
npx wrangler d1 create spawn-subscribers           # paste database_id into wrangler.toml
npx wrangler d1 migrations apply spawn-subscribers --remote
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put TURNSTILE_SECRET_KEY
```

Replace the Turnstile test site key in `src/pages/index.astro` and `RESEND_FROM` in `wrangler.toml` with real values before launch. See `.env.example` for the variables the broadcast script needs.

When the engine repo goes public, announce it to the list:

```sh
npm run broadcast              # emails every subscriber not yet contacted
npm run broadcast -- --dry-run # preview without sending
```

## Structure

```
src/
  layouts/Base.astro       html shell, nav, footer, global styles, signup handler
  components/
    Nav.astro
    Hero3D.tsx             Three.js island (client:only)
  pages/index.astro        home, vision, status, about sections
functions/api/subscribe.ts Cloudflare Pages Function
migrations/                D1 schema
scripts/broadcast.ts       launch-announcement mailer
public/                    static assets
```

## License

© 2026 Altug Tatlisu.
