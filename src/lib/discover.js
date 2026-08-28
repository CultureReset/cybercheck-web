import { shapeOf, SHAPE_WEIGHT, isSystemColumn } from './shape.js';

/**
 * Turn an API payload into an ordered list of blocks to render.
 *
 * This is deliberately NOT a list of supported sections. It takes whatever
 * came back, keeps the parts that have content, works out what each part
 * looks like, and orders them. A business with a table this repo has never
 * heard of gets that table on its page; a business missing a table this repo
 * *has* heard of simply does not get that block. Neither case is a code
 * change.
 *
 * Two payload shapes go in and the same list comes out:
 *
 *   public   GET /api/gcr/entity/:slug    a flat record whose array-valued
 *                                         keys are its sections
 *   owner    GET /api/business/sections   { slug, sections: { table: rows } }
 */

/* ── keys the API guarantees ──────────────────────────────────────────────
 *
 * The only names in this file. Each one is a promise made by a specific
 * endpoint about a specific key, not a guess about a business:
 *
 *   sections   is the wrapper around the sweep in /api/business/sections
 *   modules    is the ordering table the API already returns
 *   parent     is a single related record, not a section
 *
 * Nothing here decides what a business has. */
const WRAPPER_KEY = 'sections';
const ORDER_KEYS = ['modules', 'module_keys'];
const NOT_A_SECTION = new Set(['module_keys', 'tags', 'parent_amenities']);

/** `menu_items` -> `Menu Items`. No dictionary, so a new table reads fine. */
export function titleFor(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const hasRows = (v) => Array.isArray(v) && v.some((r) => r && typeof r === 'object');

/**
 * Explicit ordering, when the payload carries one.
 *
 * entity_modules rows look like { module_key, enabled, sort_order }. If they
 * are present the owner has already said what order they want and that wins.
 * If they are absent the order falls out of shape weight, below.
 */
function explicitOrder(payload) {
  const order = new Map();
  const disabled = new Set();
  for (const key of ORDER_KEYS) {
    const rows = payload?.[key];
    if (!Array.isArray(rows)) continue;
    rows.forEach((row, i) => {
      if (typeof row === 'string') { order.set(row, i); return; }
      if (!row || typeof row !== 'object') return;
      const name = row.module_key || row.section_key || row.key || row.table_name;
      if (!name) return;
      if (row.enabled === false || row.is_active === false) disabled.add(name);
      order.set(name, Number.isFinite(row.sort_order) ? row.sort_order : i);
    });
  }
  return { order, disabled };
}

/** The scalar half of a payload: the business record itself. */
export function recordOf(payload) {
  const record = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (Array.isArray(value)) continue;
    if (value && typeof value === 'object') continue;
    record[key] = value;
  }
  return record;
}

/**
 * @param {object} payload  either surface's response
 * @returns {{ record: object, blocks: Array, related: object }}
 */
export function discover(payload) {
  if (!payload || typeof payload !== 'object') return { record: {}, blocks: [], related: {} };

  // The owner endpoint nests everything under `sections`; the public endpoint
  // puts sections at the top level. Merge both so the rest of this function
  // does not care which one it got.
  const wrapped = payload[WRAPPER_KEY];
  const nestedMap = wrapped && !Array.isArray(wrapped) && typeof wrapped === 'object' ? wrapped : null;
  const flat = { ...payload, ...(nestedMap || {}) };
  if (nestedMap) delete flat[WRAPPER_KEY];

  const { order, disabled } = explicitOrder(flat);

  // Single related records (parent, activity_details, property_details,
  // loyalty_program, availability_today) are objects, not arrays. They are
  // real content, so they become one-row blocks rather than being dropped.
  const related = {};
  const blocks = [];

  for (const [key, value] of Object.entries(flat)) {
    if (NOT_A_SECTION.has(key) || ORDER_KEYS.includes(key)) continue;
    if (disabled.has(key)) continue;

    let rows = null;
    if (hasRows(value)) rows = value;
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const meaningful = Object.keys(value).filter((c) => !isSystemColumn(c));
      if (!meaningful.length) continue;
      related[key] = value;
      rows = [value];
    }
    if (!rows) continue;

    const { shape, profile, nested } = shapeOf(rows);
    if (shape === 'empty') continue;
    if (!profile.content.length) continue;

    blocks.push({
      key,
      title: titleFor(key),
      rows,
      shape,
      profile,
      nested: nested || null,
      count: rows.length,
      order: order.has(key) ? order.get(key) : null,
    });
  }

  blocks.sort((a, b) => {
    // Anything the owner ordered explicitly comes first, in their order.
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    const wa = SHAPE_WEIGHT[a.shape] ?? 100;
    const wb = SHAPE_WEIGHT[b.shape] ?? 100;
    if (wa !== wb) return wa - wb;
    if (a.count !== b.count) return b.count - a.count;
    return a.key.localeCompare(b.key);
  });

  return { record: recordOf(flat), blocks, related };
}

export default discover;
