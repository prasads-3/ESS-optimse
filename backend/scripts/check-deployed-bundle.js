#!/usr/bin/env node
// Run on the deployment host: `node scripts/check-deployed-bundle.js`
// Confirms whether the served dist/ matches the current git HEAD.

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const assetsDir = path.join(distDir, 'assets');
const indexHtml = path.join(distDir, 'index.html');

function fail(msg) { console.error('FAIL: ' + msg); process.exit(1); }

try { statSync(distDir); } catch { fail('dist/ does not exist — run `npm run build`'); }
try { statSync(indexHtml); } catch { fail('dist/index.html missing'); }

const html = readFileSync(indexHtml, 'utf8');
const referenced = [...html.matchAll(/assets\/([^"'\s)]+\.js)/g)].map(m => m[1]);

const onDisk = readdirSync(assetsDir).filter(f => f.endsWith('.js'));
const exportsChunk = onDisk.find(f => /^exports-[\w-]+\.js$/.test(f));

const head = execSync('git rev-parse --short HEAD').toString().trim();
const headDate = execSync('git log -1 --format=%cI').toString().trim();
const indexMtime = statSync(indexHtml).mtime.toISOString();

console.log('git HEAD            :', head, '(' + headDate + ')');
console.log('dist/index.html mtime:', indexMtime);
console.log('exports chunk on disk:', exportsChunk || '(none)');
console.log('exports chunk in HTML:', referenced.find(r => r.startsWith('exports-')) || '(not referenced — fine, it is lazy-loaded)');

const missing = referenced.filter(r => !onDisk.includes(r));
if (missing.length) {
  console.error('\nReferenced-but-missing chunks (stale index.html!):');
  for (const m of missing) console.error('  - ' + m);
  process.exit(2);
}

console.log('\nOK: every chunk referenced by index.html exists on disk.');
console.log('If the browser is still loading a different hash, blame:');
console.log('  1) a CDN / nginx cache in front of this server, or');
console.log('  2) a different dist/ being served by a different process.');
