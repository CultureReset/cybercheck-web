#!/usr/bin/env node
/**
 * Proof that shape detection actually does the job the registry depends on.
 *
 * Every fixture below is a real column set from the live API — the tables
 * buildFullEntity() returns and the tables /api/business/sections sweeps.
 * None of these names appears in src/. If detection works, five different
 * industries' "list of things you can buy" all land on `pricelist` without
 * one of them being mentioned anywhere.
 *
 *     node tests/shape.test.mjs
 */

import { shapeOf } from '../src/lib/shape.js';
import { discover } from '../src/lib/discover.js';

let passed = 0;
const failures = [];

const check = (name, actual, expected) => {
  if (actual === expected) { passed++; return; }
  failures.push(`${name}: expected ${expected}, got ${actual}`);
};

const shape = (rows) => shapeOf(rows).shape;

/* ── the same shape reached from five different industries ─────────────── */

check('menu_items (restaurant)', shape([
  { id: 1, entity_slug: 'x', name: 'Royal Red Shrimp', description: 'Gulf caught', price: 28, sort_order: 1 },
]), 'pricelist');

check('service_menu (salon)', shape([
  { id: 1, entity_slug: 'x', name: 'Balayage', description: 'Full head', price: 210, duration: '3h' },
]), 'pricelist');

check('room_types (hotel)', shape([
  { id: 1, entity_slug: 'x', name: 'Gulf Front King', description: 'Balcony', price_from: 289, price_to: 459 },
]), 'pricelist');

check('products (shop)', shape([
  { id: 1, entity_slug: 'x', name: 'Beach cart', description: 'Wide wheel', price: 149 },
]), 'pricelist');

check('a table invented next week', shape([
  { id: 1, entity_slug: 'x', name: 'Kayak, half day', description: 'Two seater', price: 55 },
]), 'pricelist');

/* ── the specific shapes ───────────────────────────────────────────────── */

check('entity_photos', shape([
  { id: 1, entity_slug: 'x', url: 'https://cdn/p.jpg', caption: 'Deck', sort_order: 1, is_cover: true },
]), 'gallery');

check('entity_hours', shape([
  { day_of_week: 1, opens_at: '11:00', closes_at: '22:00', is_closed: false },
]), 'hours');

check('faqs', shape([
  { id: 1, entity_slug: 'x', question: 'Do you take walk-ins?', answer: 'Yes, until 8.', sort_order: 1 },
]), 'faq');

check('entity_reviews', shape([
  { id: 1, reviewer_name: 'Dana', rating: 5, title: 'Great', body: 'Would go again.', created_at: '2026-01-04' },
]), 'reviews');

check('entity_team_members', shape([
  { id: 1, name: 'Ray', title: 'Captain', bio: 'Thirty years offshore.', photo_url: 'https://cdn/r.jpg', specialty: 'Tuna' },
]), 'people');

check('entity_events', shape([
  { id: 1, event_name: 'Live music', description: 'Duo', event_date: '2026-09-02', image_url: 'https://cdn/e.jpg' },
]), 'timeline');

check('entity_attributes', shape([
  { category: 'boat', key: 'length_ft', label: 'Length', value: '38', value_type: 'number', unit: 'ft' },
]), 'facts');

check('entity_policies', shape([
  { id: 1, policy_type: 'cancellation',
    body: 'Cancellations made more than 48 hours before departure receive a full refund. Inside 48 hours the deposit is retained unless the trip is cancelled by the captain for weather, in which case the full amount is returned or rescheduled at your preference.' },
]), 'prose');

check('order_links', shape([
  { id: 1, entity_slug: 'x', label: 'DoorDash', url: 'https://example.test/order' },
]), 'links');

check('a section carrying its own items', shape([
  { id: 1, section_name: 'Charters', items: [{ id: 9, item_name: 'Half day', price: 700 }] },
]), 'grouped');

check('something with no recognisable shape', shape([
  { id: 1, entity_slug: 'x', ref_code: 'AA-19', window_start: 4, window_end: 9, tolerance: 0.25 },
]), 'table');

/* ── discover() over both payload shapes ───────────────────────────────── */

const publicPayload = {
  id: 7, slug: 'anything', name: 'A Business', entity_type: 'whatever',
  hero_image_url: 'https://cdn/h.jpg',
  photos: [{ id: 1, url: 'https://cdn/p.jpg', caption: 'Deck' }],
  faqs: [{ id: 1, question: 'Open Sunday?', answer: 'Yes.' }],
  module_keys: ['menu', 'events'],
  tags: [{ tag_name: 'dog friendly', tag_category: 'amenity' }],
  reviews: [],
};

const pub = discover(publicPayload);
check('public: record keeps scalars', typeof pub.record.name, 'string');
check('public: photos discovered', pub.blocks.some((b) => b.key === 'photos'), true);
check('public: empty section dropped', pub.blocks.some((b) => b.key === 'reviews'), false);
check('public: ordering key is not a section', pub.blocks.some((b) => b.key === 'module_keys'), false);

const ownerPayload = {
  slug: 'anything',
  via: 'sweep',
  sections: {
    faqs: [{ id: 1, question: 'Open Sunday?', answer: 'Yes.' }],
    some_new_table: [{ id: 1, ref_code: 'AA-19', tolerance: 0.25 }],
  },
};

const own = discover(ownerPayload);
check('owner: nested sections unwrapped', own.blocks.some((b) => b.key === 'faqs'), true);
check('owner: unknown table still rendered', own.blocks.find((b) => b.key === 'some_new_table')?.shape, 'table');
check('owner: no block called "sections"', own.blocks.some((b) => b.key === 'sections'), false);

/* ── explicit order wins over shape weight ─────────────────────────────── */

const ordered = discover({
  modules: [{ module_key: 'faqs', enabled: true, sort_order: 0 },
            { module_key: 'photos', enabled: true, sort_order: 1 }],
  photos: [{ id: 1, url: 'https://cdn/p.jpg' }],
  faqs: [{ id: 1, question: 'q', answer: 'a' }],
});
check('owner ordering beats shape weight', ordered.blocks[0].key, 'faqs');

const disabled = discover({
  modules: [{ module_key: 'photos', enabled: false, sort_order: 0 }],
  photos: [{ id: 1, url: 'https://cdn/p.jpg' }],
});
check('a disabled module is not rendered', disabled.blocks.length, 0);

/* ── report ────────────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`${passed} checks passed — shape detection places every fixture without naming one of them`);
