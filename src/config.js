/**
 * Every value this app is allowed to know before it has talked to the API.
 *
 * There is exactly one: where the API is. Everything else — which businesses
 * exist, what a business is called, what sections it has, what its categories
 * are — is answered by the API at runtime. This file is the only place in
 * src/ permitted to contain a URL, and scripts/check-no-hardwiring.mjs fails
 * the build if a second one appears.
 */

const env = import.meta.env ?? {};

/** Base for every request. Empty means same origin (the normal deployment). */
export const API_BASE = (env.VITE_API_BASE || '').replace(/\/+$/, '');

/**
 * Where the app platform is.
 *
 * The catalogue, what this workspace has installed, and the surfaces those
 * apps draw all come from there. Empty means no platform is attached, and the
 * dashboard renders without an Apps section rather than breaking — a
 * deployment that does not sell apps should not have to stub one out.
 */
export const PLATFORM_BASE = (env.VITE_PLATFORM_BASE || '').replace(/\/+$/, '');

export const hasPlatform = () => Boolean(PLATFORM_BASE);

/**
 * Single-business mode.
 *
 * A deployment on a business's own domain sets this and the router stops
 * asking for a slug. A deployment running the directory leaves it empty and
 * the slug comes from the path. No slug is ever compiled in either way — this
 * is read from the environment at build time, by the operator, per install.
 */
export const SINGLE_BUSINESS_SLUG = env.VITE_SINGLE_BUSINESS_SLUG || null;

/** Display name for the shell. Falls back to what the API reports. */
export const SITE_NAME = env.VITE_SITE_NAME || null;

export const isSingleBusiness = () => Boolean(SINGLE_BUSINESS_SLUG);
