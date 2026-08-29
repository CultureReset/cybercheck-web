#!/usr/bin/env node
/**
 * The rule this repo exists to keep.
 *
 * Every screen is rendered from data. That is easy to say on day one and easy
 * to lose on day forty, when one business needs one special case and someone
 * writes `if (slug === '…')`. This script fails the build when that happens,
 * so the claim on the front of the README stays true without anyone having to
 * police it in review.
 *
 *     npm run check
 *
 * Each rule below names what it forbids and why. A rule that starts producing
 * false positives should be tightened, not deleted.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (['.js', '.jsx'].includes(extname(name))) files.push(full);
  }
})(SRC);

const failures = [];
const fail = (file, line, rule, detail) =>
  failures.push({ file: relative(ROOT, file), line, rule, detail });

/* Strip comments before matching, so a rule explained in prose above the code
   it protects does not trip the rule it is explaining. */
const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const RULES = [
  {
    name: 'no-url-literals',
    why: 'src/config.js reads the API address from the environment. A second address in the bundle is a deployment that only works in one place.',
    allow: (rel) => rel === 'src/config.js',
    test: /https?:\/\/[a-z0-9]/gi,
  },
  {
    name: 'no-slug-branches',
    why: 'A branch on a particular business is the definition of hardwiring.',
    test: /\b(slug|entity_slug|business_slug)\s*[!=]==?\s*['"`]/g,
  },
  {
    name: 'no-industry-branches',
    why: 'A branch on a kind of business puts one industry in the code and leaves every other one out.',
    test: /\b(entity_type|entity_subtype|industry|category)\s*[!=]==?\s*['"`]/g,
  },
  {
    name: 'no-table-name-branches',
    why: 'Renderers are chosen by the shape of the rows, never by the name of the table they came from.',
    allow: (rel) => rel === 'src/lib/discover.js', // the documented wrapper key
    test: /\b(block\.key|section|table|key)\s*[!=]==?\s*['"`][a-z_]{3,}['"`]/g,
  },
  {
    name: 'no-app-id-branches',
    why: 'An app is addressed by the installation the owner created. A branch on an app id means one app got special treatment in the shell, and the next one will need its own branch too.',
    test: /\b(app_id|appId|installation\.app_id|packageKey)\s*[!=]==?\s*['"`]/g,
  },
  {
    name: 'no-surface-id-branches',
    why: 'Surfaces are rendered because an installation declares them, never because the shell recognised the name of one.',
    allow: (rel) => rel === 'src/lib/appNav.js', // the documented kind filter
    test: /\b(surface_id|surfaceId)\s*[!=]==?\s*['"`]/g,
  },
  {
    name: 'no-section-lists',
    why: 'A list of section or table names is a list of the businesses this app supports.',
    test: /\[\s*(['"][a-z][a-z0-9_]{2,}['"]\s*,\s*){4,}['"][a-z][a-z0-9_]{2,}['"]\s*,?\s*\]/g,
  },
];

for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const raw = readFileSync(file, 'utf8');
  const code = stripComments(raw);

  for (const rule of RULES) {
    if (rule.allow?.(rel)) continue;
    rule.test.lastIndex = 0;
    let m;
    while ((m = rule.test.exec(code))) {
      fail(file, lineOf(code, m.index), rule.name, m[0].trim().slice(0, 80));
    }
  }
}

/* ── structural rules ─────────────────────────────────────────────────── */

// A surface must go through the registry. If a surface imports a renderer
// directly it has decided what a section looks like, which is the same
// mistake as naming the table.
for (const file of files.filter((f) => f.includes('/surfaces/'))) {
  const raw = readFileSync(file, 'utf8');
  if (/from\s+['"][^'"]*blocks\/renderers/.test(raw)) {
    fail(file, lineOf(raw, raw.indexOf('blocks/renderers')), 'surfaces-use-the-registry',
         'a surface imports a renderer directly');
  }
}

// Installed apps must reach the nav through the projection, not through a list
// somewhere in a component. If a surface file builds its own nav entries, the
// day an app is uninstalled one of the two lists will be wrong.
for (const file of files.filter((f) => f.includes('/App.jsx'))) {
  const raw = readFileSync(file, 'utf8');
  if (!/useInstalledApps|navItems/.test(raw)) {
    fail(file, 0, 'nav-from-installations',
         'the shell must build its app links from the installed-apps projection');
  }
}

// There must be a renderer that handles a shape nobody anticipated.
const registry = readFileSync(join(SRC, 'blocks/registry.jsx'), 'utf8');
if (!/export const FALLBACK\s*=/.test(registry)) {
  fail(join(SRC, 'blocks/registry.jsx'), 0, 'fallback-required',
       'registry.jsx must export a FALLBACK renderer');
}
if (!/export function registerBlock/.test(registry)) {
  fail(join(SRC, 'blocks/registry.jsx'), 0, 'runtime-override-required',
       'registry.jsx must let a package replace a renderer without editing this file');
}

/* ── report ───────────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(`\n${failures.length} hardwiring problem${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) {
    console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.detail}`);
  }
  const rules = new Map(RULES.map((r) => [r.name, r.why]));
  console.error('');
  for (const name of new Set(failures.map((f) => f.rule))) {
    if (rules.has(name)) console.error(`  ${name}: ${rules.get(name)}`);
  }
  console.error('');
  process.exit(1);
}

console.log(`checked ${files.length} files — no business, slug, industry, host or section list is compiled in`);
