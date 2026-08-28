import * as R from './renderers.jsx';

/**
 * Shape -> renderer. This is the whole registry.
 *
 * Note what is *not* here: a branch on a table name, a business, an industry
 * or a slug. A section is rendered because of what its rows look like, so a
 * table this repo has never seen gets a real layout on its first request
 * rather than a table dump — and the day a new table is added to the API,
 * nothing in this repo has to change.
 *
 * scripts/check-no-hardwiring.mjs fails the build if a name-based branch
 * appears in here.
 *
 * The escape hatch is `registerBlock`, not an edit. A package, a theme or a
 * white-label build can replace or add a shape at runtime:
 *
 *     registerBlock('pricelist', MyPriceList)   // replace one
 *     registerBlock('floorplan', FloorPlan)     // add a new shape
 *
 * Adding a shape means teaching lib/shape.js to detect it and dropping a
 * renderer in here. Two edits, no surface touched.
 */

const registry = new Map([
  ['gallery', R.Gallery],
  ['hours', R.Hours],
  ['faq', R.FAQ],
  ['reviews', R.Reviews],
  ['people', R.People],
  ['pricelist', R.PriceList],
  ['timeline', R.Timeline],
  ['facts', R.Facts],
  ['prose', R.Prose],
  ['links', R.Links],
  ['cards', R.Cards],
  ['grouped', R.Grouped],
  ['table', R.DataTable],
]);

/** The renderer used when a shape has none. Renders literally anything. */
export const FALLBACK = R.DataTable;

export function registerBlock(shape, component) {
  if (typeof component !== 'function') throw new Error(`renderer for "${shape}" is not a component`);
  registry.set(shape, component);
  return () => registry.delete(shape);
}

export function rendererFor(shape) {
  return registry.get(shape) || FALLBACK;
}

export function listShapes() {
  return [...registry.keys()];
}
