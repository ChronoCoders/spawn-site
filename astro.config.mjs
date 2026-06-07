import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://spawnengine.io',
  output: 'static',
  integrations: [
    preact(),
    tailwind({
      // The design system lives in global CSS (exact match to the master
      // reference); Tailwind base styles would override it.
      applyBaseStyles: false,
    }),
  ],
});
