import assert from 'node:assert/strict';
import { navItemsFor, publicSurfacesFor, pathForSurface } from '../src/lib/appNav.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ok  ${name}`); };

const installation = (over = {}) => ({
  id: 'i1', name: 'Notes', icon: '▣', status: 'installed', enabled: true,
  surfaces: [{ surface_id: 'main', kind: 'dashboard', title: 'Notes', enabled: true, position: 0 }],
  ...over,
});

test('an installed app puts one item in the nav', () => {
  const items = navItemsFor([installation()]);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Notes');
  assert.equal(items[0].path, '/a/i1/main');
});

test('nothing installed means no items — not an empty section, no items', () => {
  assert.deepEqual(navItemsFor([]), []);
  assert.deepEqual(navItemsFor(), []);
});

test('uninstalling removes the item', () => {
  assert.equal(navItemsFor([installation({ status: 'uninstalled' })]).length, 0);
});

test('disabling removes the item but is not uninstalling', () => {
  assert.equal(navItemsFor([installation({ enabled: false })]).length, 0);
});

test('a surface the owner turned off is not in the nav', () => {
  const off = installation({
    surfaces: [{ surface_id: 'main', kind: 'dashboard', title: 'Notes', enabled: false, position: 0 }],
  });
  assert.equal(navItemsFor([off]).length, 0);
});

test('only dashboard surfaces navigate — a public form is not a nav item', () => {
  const mixed = installation({
    surfaces: [
      { surface_id: 'form', kind: 'public', title: 'Request', enabled: true, position: 0 },
      { surface_id: 'main', kind: 'dashboard', title: 'Queue', enabled: true, position: 1 },
    ],
  });
  const items = navItemsFor([mixed]);
  assert.equal(items.length, 1);
  assert.equal(items[0].surfaceId, 'main');
});

test('an app with two dashboard surfaces gets two items', () => {
  const two = installation({
    surfaces: [
      { surface_id: 'a', kind: 'dashboard', title: 'Inbox', enabled: true, position: 1 },
      { surface_id: 'b', kind: 'dashboard', title: 'Archive', enabled: true, position: 0 },
    ],
  });
  assert.deepEqual(navItemsFor([two]).map((i) => i.title), ['Archive', 'Inbox']);
});

test('items are ordered by position, then by app, so the nav does not shuffle', () => {
  const items = navItemsFor([
    installation({ id: 'z', name: 'Zebra' }),
    installation({ id: 'a', name: 'Alpha' }),
  ]);
  assert.deepEqual(items.map((i) => i.appName), ['Alpha', 'Zebra']);
});

test('a surface with no title falls back to the app name', () => {
  const untitled = installation({
    surfaces: [{ surface_id: 'main', kind: 'dashboard', enabled: true, position: 0 }],
  });
  assert.equal(navItemsFor([untitled])[0].title, 'Notes');
});

test('an installation id with a slash cannot break out of its route', () => {
  assert.equal(pathForSurface('a/b', 'c d'), '/a/a%2Fb/c%20d');
});

test('only published public surfaces reach the customer page', () => {
  const app = installation({
    surfaces: [
      { surface_id: 'shown', kind: 'public', title: 'Request', enabled: true, published: true, position: 0 },
      { surface_id: 'hidden', kind: 'public', title: 'Draft', enabled: true, published: false, position: 1 },
    ],
  });
  assert.deepEqual(publicSurfacesFor([app]).map((s) => s.surfaceId), ['shown']);
});

console.log(`\n${passed} passed\n`);
