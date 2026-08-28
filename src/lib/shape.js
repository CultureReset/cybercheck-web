/**
 * What a row *is*, worked out from the row.
 *
 * The whole point of this file: a renderer is chosen by looking at the data,
 * never by recognising a table name. `menu_items`, `service_menu`,
 * `room_types`, `products` and a table nobody has created yet all arrive here
 * as "rows with a name, a description and a price" and all come out as the
 * same shape, so all four get the right layout without one of them being
 * named anywhere in this repo.
 *
 * Two layers:
 *
 *   roleOf(column, values)   what one column means  -> 'title' | 'price' | ...
 *   shapeOf(key, rows)       what the section is    -> 'pricelist' | 'gallery' | ...
 *
 * Both are heuristics over column names and sampled values. They are allowed
 * to be wrong: `shapeOf` falls through to 'table', which renders anything.
 */

/* ── columns that are bookkeeping, not content ───────────────────────────── */

const SYSTEM = new Set([
  'id', 'created_at', 'updated_at', 'inserted_at', 'deleted_at',
  'entity_slug', 'site_id', 'business_id', 'owner_id', 'user_id',
  'sort_order', 'is_active', 'active', 'approved', 'visible',
  'search_vector', 'embedding', 'metadata', 'raw', 'source',
]);

export const isSystemColumn = (c) => SYSTEM.has(c) || c.endsWith('_id');

/* ── value sniffing ──────────────────────────────────────────────────────── */

const sample = (rows, column, n = 8) => {
  const out = [];
  for (const row of rows) {
    const v = row?.[column];
    if (v !== null && v !== undefined && v !== '') out.push(v);
    if (out.length >= n) break;
  }
  return out;
};

const looksLikeUrl = (v) => typeof v === 'string' && /^(https?:)?\/\//i.test(v.trim());
const looksLikeImage = (v) =>
  typeof v === 'string' &&
  (/\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(v) || /\/(image|photo|img|storage)\//i.test(v));
const looksLikeDate = (v) =>
  (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || v instanceof Date;
const looksLikeTime = (v) => typeof v === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(v);
const looksLikeEmail = (v) => typeof v === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const looksLikePhone = (v) =>
  typeof v === 'string' && /^[+()\d][\d\s\-().]{6,}$/.test(v.trim());
const isLongText = (values) =>
  values.length > 0 &&
  values.every((v) => typeof v === 'string') &&
  values.reduce((a, v) => a + v.length, 0) / values.length > 140;

/* ── column names, grouped by what they mean rather than what they are ───── */

const NAME_HINTS = [
  // Person first: `reviewer_name` and `artist_name` are people, not headings,
  // and both would otherwise be caught by the `_name` rule below them.
  ['person', /(^reviewer_name$|^artist_name$|^author|posted_by)/],
  // Anything ending in `_name` is a heading: item_name, section_name,
  // event_name, fee_name, policy_name, and the ones nobody has added yet.
  ['title', /^(title|label|question|amenity|excluded_item|heading)$|(^|_)name$/],
  ['subtitle', /^(subtitle|tagline|category|type|kind|section|specialty|genre|unit|policy_type|section_type|tag_category|platform)$/],
  ['body', /^(description|body|content|answer|bio|excerpt|summary|text|caption|message|notes?|terms|details)$/],
  ['image', /(image_url|image_path|photo_url|thumbnail_url|cover_url|hero_image_url|media_url|avatar|icon_url|^url$)/],
  ['price', /^(price|price_from|amount|cost|rate|base_price)$/],
  ['priceMax', /^(price_to|price_max|max_price)$/],
  ['priceLabel', /^(price_label|price_range|unit|per)$/],
  ['date', /(_date$|^date$|published_at|posted_at|starts_at|ends_at|due_at|event_date|created_on)/],
  ['time', /(^opens_at$|^closes_at$|start_time|end_time|_time$)/],
  ['rating', /^(rating|score|stars)$/],
  ['count', /(_count$|^count$|capacity|quantity|remaining|total_)/],
  ['link', /(_url$|^link$|^href$|website|booking|reservation|order_url|post_url)/],
  ['phone', /(^phone$|phone_number|mobile|contact_phone)/],
  ['email', /(^email$|email_address|contact_email)/],
  ['flag', /^(is_|has_|allow|refundable|mandatory|recurring|closed|is_closed|non_refundable)/],
  ['duration', /(duration|_minutes$|_hours$|_days$|length)/],
];

/**
 * What one column means. Column name first (cheap and usually right), then the
 * values (catches a column called `col_7` holding image URLs).
 */
export function roleOf(column, values = []) {
  const c = String(column || '').toLowerCase();

  for (const [role, re] of NAME_HINTS) {
    if (re.test(c)) {
      // A column called `url` is only an image if it looks like one.
      if (role === 'image' && !values.some(looksLikeImage) && values.some(looksLikeUrl)) return 'link';
      return role;
    }
  }

  if (values.length) {
    if (values.every(looksLikeImage)) return 'image';
    if (values.every(looksLikeUrl)) return 'link';
    if (values.every(looksLikeEmail)) return 'email';
    if (values.every(looksLikePhone)) return 'phone';
    if (values.every(looksLikeTime)) return 'time';
    if (values.every(looksLikeDate)) return 'date';
    if (values.every((v) => typeof v === 'boolean')) return 'flag';
    if (isLongText(values)) return 'body';
    if (values.every((v) => typeof v === 'number')) return 'number';
  }
  return 'text';
}

/**
 * A description of a set of rows: which columns exist, what each one means,
 * and a lookup from a role back to the column that carries it.
 */
export function profileRows(rows) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : [];
  const columns = [...new Set(list.flatMap((r) => Object.keys(r)))];

  const roles = {};
  const byRole = {};
  for (const column of columns) {
    const role = roleOf(column, sample(list, column));
    roles[column] = role;
    (byRole[role] ||= []).push(column);
  }

  const content = columns.filter((c) => !isSystemColumn(c));
  const filled = (column) => list.some((r) => r?.[column] !== null && r?.[column] !== undefined && r?.[column] !== '');

  return {
    rows: list,
    columns,
    content,
    roles,
    byRole,
    /** First column carrying a role, preferring one that actually has values. */
    col: (role) => (byRole[role] || []).find(filled) || (byRole[role] || [])[0] || null,
    has: (role) => Boolean((byRole[role] || []).find(filled)),
    hasColumn: (column) => columns.includes(column),
  };
}

/* ── section shapes ──────────────────────────────────────────────────────── */

/**
 * The shapes a renderer exists for. Order matters: the first match wins, so
 * the most specific tests come first.
 *
 * These are properties of the *renderer set*, not of any business, industry
 * or table. Adding a shape here adds a layout that every business gets for
 * free the moment its data looks like that.
 */
const SHAPES = [
  ['gallery', (p) => p.has('image') && p.content.filter((c) => p.roles[c] !== 'image').length <= 2],
  ['hours', (p) => p.hasColumn('day_of_week') && (p.has('time') || p.hasColumn('is_closed'))],
  ['faq', (p) => p.hasColumn('question') && p.hasColumn('answer')],
  ['reviews', (p) => p.has('rating') && (p.has('body') || p.has('person'))],
  ['people', (p) => p.has('title') && p.has('image') && (p.hasColumn('bio') || p.hasColumn('title') && p.hasColumn('specialty'))],
  ['pricelist', (p) => p.has('title') && p.has('price')],
  ['timeline', (p) => p.has('date') && p.has('title')],
  // A row that is little more than a URL is a button, not a card.
  ['links', (p) => p.has('link') && p.content.length <= 3],
  // Facts are an explicit label/value pairing, or a bare list of short labels
  // (amenities, exclusions, "perfect for"). A row carrying prose is not a
  // fact, however few columns it has.
  ['facts', (p) => p.hasColumn('key') || p.hasColumn('value')
                || (p.content.length <= 2 && p.has('title') && !p.has('body'))],
  ['prose', (p) => p.has('body') && !p.has('title') && !p.has('image')],
  ['cards', (p) => p.has('title') && (p.has('body') || p.has('image'))],
];

/**
 * What a whole section is. `key` is accepted but deliberately unused for
 * anything except nested-section detection — see NESTED below.
 */
export function shapeOf(rows) {
  const p = profileRows(rows);
  if (!p.rows.length) return { shape: 'empty', profile: p };

  // A row that carries its own array of children is a group, not a card:
  // entity_sections -> items, offerings -> prices, room_types -> amenities.
  const nested = p.columns.find((c) => p.rows.some((r) => Array.isArray(r[c]) && r[c].length));
  if (nested) return { shape: 'grouped', profile: p, nested };

  for (const [shape, test] of SHAPES) {
    try {
      if (test(p)) return { shape, profile: p };
    } catch {
      /* a heuristic that throws is a heuristic that did not match */
    }
  }
  return { shape: 'table', profile: p };
}

/** How prominent a shape is on a page. A property of layout, not of content. */
export const SHAPE_WEIGHT = {
  gallery: 10,
  grouped: 20,
  pricelist: 25,
  cards: 30,
  timeline: 35,
  hours: 40,
  people: 50,
  reviews: 55,
  faq: 60,
  facts: 70,
  prose: 75,
  links: 80,
  table: 90,
  empty: 99,
};
