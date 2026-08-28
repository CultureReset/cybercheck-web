/**
 * Views as data.
 *
 * Ported from Huly's `view` plugin — ViewletDescriptor, Viewlet and
 * ViewletPreference (plugins/view/src/types.ts, hcengineering/platform,
 * EPL-2.0), rewritten against this app's sections instead of their Doc classes.
 *
 * Their idea, which this app was missing:
 *
 *   ViewletDescriptor   a *kind* of view — table, cards, gallery. Just a
 *                       renderer with a name.
 *   Viewlet             binds a section to a descriptor plus `config`: which
 *                       fields, in what order.
 *   ViewletPreference   one viewer's override of that config.
 *
 * So "how do I look at this" stops being compiled in. Adding a way to view
 * something is a row. Reordering the columns is a row. Neither is a release.
 *
 * What changed on the way in:
 *
 *   Theirs                              Here
 *   ─────────────────────────────────   ──────────────────────────────────────
 *   attachTo: Ref<Class<Doc>>           section key — this app has no class
 *                                       registry, sections arrive from the API
 *   descriptor: Ref<ViewletDescriptor>  a shape name already in the registry
 *   AnyComponent by resource id         the component itself
 *   ViewletPreference is a stored Doc   any store: the API, or localStorage
 *
 * The important difference: in Huly a class with no viewlet renders nothing.
 * Here shape detection is still the floor, so a section nobody has configured
 * gets a real layout anyway. A viewlet is an *override*, never a requirement —
 * which is what keeps a table nobody has heard of working on its first request.
 */

import { shapeOf } from './shape.js';

/** A kind of view. `shape` names a renderer already in the block registry. */
export function defineDescriptor({ key, label, shape, icon = null }) {
  if (!key) throw new Error('a view descriptor needs a key');
  if (!shape) throw new Error(`view descriptor "${key}" names no renderer shape`);
  return { key, label: label ?? key, shape, icon };
}

/**
 * How one section should be viewed.
 *
 * `config` is the ordered field list. Empty means "whatever the renderer would
 * pick on its own", which is what lets a viewlet set only the descriptor and
 * leave the columns alone.
 */
export function defineViewlet({ section, descriptor, config = [], title = null, variant = null }) {
  if (!section) throw new Error('a viewlet must name the section it attaches to');
  if (!descriptor) throw new Error(`viewlet on "${section}" names no descriptor`);
  return { section, descriptor, config, title, variant };
}

/** One viewer's override. Same shape, applied on top. */
export function definePreference({ section, descriptor = null, config = null }) {
  return { section, descriptor, config };
}

/**
 * Decide how to render one discovered block.
 *
 * Three layers, most specific first, and the last one always answers:
 *
 *   1. the viewer's preference
 *   2. a viewlet configured for this section
 *   3. shape detection — what the rows actually look like
 *
 * Returns `{ shape, config, source }`. `source` is there so a surface can show
 * the owner *why* they are looking at what they are looking at, and so a test
 * can prove the fallback is reachable.
 */
export function resolveView(block, { descriptors = [], viewlets = [], preferences = [] } = {}) {
  const byKey = new Map(descriptors.map((d) => [d.key, d]));

  const preference = preferences.find((p) => p.section === block.key);
  const viewlet = viewlets.find((v) => v.section === block.key);

  const descriptorKey = preference?.descriptor ?? viewlet?.descriptor ?? null;
  const descriptor = descriptorKey ? byKey.get(descriptorKey) : null;

  // A preference or viewlet naming a descriptor nobody registered must not
  // blank the section. Fall through to detection and say so.
  if (descriptorKey && !descriptor) {
    const detected = shapeOf(block.rows);
    return { shape: detected.shape, config: [], source: `unknown-descriptor:${descriptorKey}` };
  }

  const config = preference?.config ?? viewlet?.config ?? [];

  if (descriptor) {
    return { shape: descriptor.shape, config, source: preference?.descriptor ? 'preference' : 'viewlet' };
  }

  const detected = shapeOf(block.rows);
  return { shape: detected.shape, config, source: 'detected' };
}

/**
 * Apply a viewlet's field list to a block.
 *
 * Narrows what the renderer sees rather than reaching into every renderer to
 * teach it about config. A field in `config` that the rows do not have is
 * dropped instead of rendering an empty column.
 */
export function applyConfig(block, config) {
  if (!Array.isArray(config) || config.length === 0) return block;
  const present = config.filter((c) => block.profile.columns.includes(c));
  if (present.length === 0) return block;
  const rows = block.rows.map((row) => Object.fromEntries(present.map((c) => [c, row[c]])));
  const { profile, nested } = shapeOf(rows);
  return { ...block, rows, profile, nested: nested ?? null };
}
