#!/usr/bin/env node
/**
 * Point this at the real API and see what the front end would draw.
 *
 *     node scripts/probe.mjs https://your-api.example.com some-business-slug
 *
 * It fetches the same endpoint PublicProfile.jsx fetches, runs the same
 * discover() the page runs, and prints the blocks and the shape each one
 * resolved to. No browser, no build.
 *
 * This is how you check a claim like "a charter boat and a salon both render"
 * against live data instead of against a fixture: run it for two slugs from
 * different industries and read the two lists.
 */

import { discover } from '../src/lib/discover.js';

const [base, slug] = process.argv.slice(2);
if (!base || !slug) {
  console.error('usage: node scripts/probe.mjs <api-base> <slug>');
  process.exit(2);
}

const url = `${base.replace(/\/+$/, '')}/api/gcr/entity/${encodeURIComponent(slug)}`;
const res = await fetch(url);
if (!res.ok) {
  console.error(`${res.status} ${res.statusText} from ${url}`);
  process.exit(1);
}

const payload = await res.json();
const { record, blocks } = discover(payload);

console.log(`\n${record.name || slug}  (${record.entity_type || 'no type'})`);
console.log(`${blocks.length} blocks, ${Object.keys(record).length} record fields\n`);

const width = Math.max(...blocks.map((b) => b.key.length), 4);
for (const b of blocks) {
  console.log(`  ${b.key.padEnd(width)}  ${String(b.count).padStart(4)} rows  ->  ${b.shape}`);
}

const fallback = blocks.filter((b) => b.shape === 'table');
console.log(`\n${blocks.length - fallback.length} of ${blocks.length} got a designed layout.`);
if (fallback.length) {
  console.log(`fell back to a table: ${fallback.map((b) => b.key).join(', ')}`);
  console.log('each of those is a shape worth adding to lib/shape.js — not a page worth writing.');
}
console.log('');
