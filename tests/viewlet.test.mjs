#!/usr/bin/env node
/**
 * Views as data — ported from Huly's view plugin.
 *
 * The claim under test: how a section is displayed can be changed by a row,
 * and a section nobody has configured still renders.
 */

import { defineDescriptor, defineViewlet, definePreference, resolveView, applyConfig }
  from '../src/lib/viewlet.js';
import { shapeOf } from '../src/lib/shape.js';

let passed = 0;
const failures = [];
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; return; }
  failures.push(`${name}: expected ${e}, got ${a}`);
};

const blockOf = (key, rows) => {
  const { shape, profile, nested } = shapeOf(rows);
  return { key, rows, shape, profile, nested: nested ?? null, count: rows.length };
};

// Rows that shape detection reads as a price list.
const items = blockOf('anything', [
  { id: 1, name: 'A thing', description: 'about it', price: 12, photo_url: 'https://x/a.jpg' },
  { id: 2, name: 'Another', description: 'about it', price: 30, photo_url: 'https://x/b.jpg' },
]);

const descriptors = [
  defineDescriptor({ key: 'as-table', label: 'Table', shape: 'table' }),
  defineDescriptor({ key: 'as-cards', label: 'Cards', shape: 'cards' }),
];

/* ── the floor: nothing configured, it still renders ─────────────────────── */

check('unconfigured falls back to detection',
  resolveView(items, { descriptors }), { shape: 'pricelist', config: [], source: 'detected' });

/* ── a viewlet overrides it, without touching code ───────────────────────── */

const viewlets = [defineViewlet({ section: 'anything', descriptor: 'as-cards' })];
check('a viewlet changes the renderer',
  resolveView(items, { descriptors, viewlets }).shape, 'cards');
check('and says where that came from',
  resolveView(items, { descriptors, viewlets }).source, 'viewlet');

/* ── a viewer's preference beats the viewlet ─────────────────────────────── */

const preferences = [definePreference({ section: 'anything', descriptor: 'as-table' })];
check('preference wins over viewlet',
  resolveView(items, { descriptors, viewlets, preferences }).shape, 'table');
check('and says so',
  resolveView(items, { descriptors, viewlets, preferences }).source, 'preference');

/* ── a viewlet for another section does not leak ─────────────────────────── */

check('a viewlet on a different section is ignored',
  resolveView(items, { descriptors, viewlets: [defineViewlet({ section: 'something_else', descriptor: 'as-cards' })] }).source,
  'detected');

/* ── a broken configuration must not blank the page ──────────────────────── */

const broken = resolveView(items, { descriptors, viewlets: [defineViewlet({ section: 'anything', descriptor: 'nope' })] });
check('an unknown descriptor falls through rather than rendering nothing', broken.shape, 'pricelist');
check('and reports why', broken.source, 'unknown-descriptor:nope');

/* ── config narrows the fields ───────────────────────────────────────────── */

const narrowed = applyConfig(items, ['name', 'price']);
check('config narrows the columns', Object.keys(narrowed.rows[0]), ['name', 'price']);
check('config drops a field the rows do not have',
  Object.keys(applyConfig(items, ['name', 'not_a_column']).rows[0]), ['name']);
check('an all-missing config is ignored rather than emptying the block',
  applyConfig(items, ['nope', 'also_nope']).rows.length, 2);
check('no config is a no-op', applyConfig(items, []).rows[0].description, 'about it');

/* ── nothing here names a business, a table or an industry ───────────────── */

check('a section invented later works the same', (() => {
  const odd = blockOf('a_table_from_next_year', [{ id: 1, ref_code: 'AA-1', tolerance: 0.25 }]);
  return resolveView(odd, { descriptors }).shape;
})(), 'table');

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log(`${passed} checks passed - a row changes the view; an unconfigured section still renders`);
