/**
 * Post-build step: inject <link rel="modulepreload"> for each Astro island's
 * component and renderer chunks.
 *
 * Astro loads client:only islands via a runtime dynamic import (the
 * `component-url` on <astro-island>), which the browser's preload scanner
 * never sees — so the chunk only starts downloading after the island runtime
 * executes. Preloading it in <head> starts the fetch during HTML parse, in
 * parallel, cutting the time before the 3D hero appears. Filenames are
 * content-hashed, so the URLs are read from the built HTML rather than guessed.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

let injected = 0;
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const urls = new Set();
  const re = /(?:component-url|renderer-url)="([^"]+\.js)"/g;
  let m;
  while ((m = re.exec(html))) urls.add(m[1]);
  if (urls.size === 0) continue;

  const links = [...urls]
    .filter((u) => !html.includes(`rel="modulepreload" href="${u}"`))
    .map((u) => `<link rel="modulepreload" href="${u}">`)
    .join('');
  if (!links) continue;

  writeFileSync(file, html.replace('</head>', `${links}</head>`));
  injected += urls.size;
  console.log(`preloaded ${urls.size} chunk(s) in ${file}`);
}

console.log(`inject-preload: ${injected} modulepreload link(s) added`);
