#!/usr/bin/env node
/* Builds the password-protected site in public/ from the plain deck in site/.
 *
 * The deck (markup, styles and scripts) is encrypted with AES-256-GCM using a key derived from
 * the password with PBKDF2-SHA-256. public/index.html contains only the gate and the ciphertext;
 * the password is never written anywhere.
 *
 *   DECK_PASSWORD='…' node scripts/build-protected.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'site');
const out = join(root, 'public');
const ITERATIONS = 600000;

const password = process.env.DECK_PASSWORD;
if (!password) { console.error('Set DECK_PASSWORD.'); process.exit(1); }

const html = readFileSync(join(site, 'index.html'), 'utf8');
const read = p => readFileSync(join(site, p), 'utf8');

const css = read('assets/style.css');
const fonts = [...html.matchAll(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/g)].map(m => m[0]).join('');
const body = html.match(/<body>([\s\S]*?)<script/)[1].trim();
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => read(m[1]));
if (scripts.length < 4) throw new Error('Expected the deck scripts in site/index.html');

const payload = JSON.stringify({ head: `${fonts}<style>${css}</style>`, body, scripts });

const { subtle } = globalThis.crypto;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload)));
const b64 = u8 => Buffer.from(u8).toString('base64');
const blob = JSON.stringify({ v: 1, iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) });

const gate = readFileSync(join(root, 'scripts', 'gate.html'), 'utf8').replace('__PAYLOAD__', () => blob);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), gate);
copyFileSync(join(site, 'assets', 'favicon.svg'), join(out, 'favicon.svg'));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`public/index.html written (${(gate.length / 1024).toFixed(0)} KB, ${ITERATIONS} PBKDF2 iterations)`);
