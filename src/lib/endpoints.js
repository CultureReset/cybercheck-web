/**
 * Every path this front end calls, in one file.
 *
 * Mirrors the routers mounted in gcr-api-clean/server.js:
 *
 *   /api/business       routes/business-data.js   this business's own data
 *   /api/business-auth  routes/business-auth.js   phone sign-up and sign-in
 *   /api/auth           routes/auth.js            invite links
 *   /api/gcr            routes/gcr.js             public listings
 *   /api/connections    routes/connections.js     the app store
 *
 * No component builds a URL. A route change in the API is a one-line edit here.
 */

const BUSINESS = '/api/business';
const BUSINESS_AUTH = '/api/business-auth';
const AUTH = '/api/auth';
const GCR = '/api/gcr';

const seg = (v) => encodeURIComponent(String(v ?? ''));
const qs = (params) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '') continue;
    search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

export const endpoints = {
  session: {
    me: () => `${BUSINESS}/me`,
    signupCode: () => `${BUSINESS_AUTH}/phone`,
    verifySignupCode: () => `${BUSINESS_AUTH}/verify`,
    similar: () => `${BUSINESS_AUTH}/similar`,
    register: () => `${BUSINESS_AUTH}/register`,
    signinCode: () => `${BUSINESS_AUTH}/signin`,
    verifySigninCode: () => `${BUSINESS_AUTH}/signin-verify`,
    password: () => `${BUSINESS_AUTH}/password`,
    refresh: () => `${BUSINESS_AUTH}/refresh`,
    signout: () => `${BUSINESS_AUTH}/signout`,
    invite: (token) => `${AUTH}/invite/${seg(token)}`,
    acceptInvite: () => `${AUTH}/accept-invite`,
  },

  // The owner's own data. No path here carries a slug: the API resolves the
  // business from the session token, so there is nothing the browser could
  // change to read somebody else's rows.
  owner: {
    schema: () => `${BUSINESS}/schema`,
    sections: () => `${BUSINESS}/sections`,
    industries: () => `${BUSINESS}/industries`,
    table: (table, params) => `${BUSINESS}/${seg(table)}${qs(params)}`,
    create: (table) => `${BUSINESS}/${seg(table)}`,
    update: (table, id) => `${BUSINESS}/${seg(table)}/${seg(id)}`,
    remove: (table, id) => `${BUSINESS}/${seg(table)}/${seg(id)}`,
  },

  // External tools this business connects — Toast, Google and the like.
  // Different concern from the app platform below: a connection is an account
  // somewhere else, an app is something installed here.
  connections: {
    list: () => '/api/connections',
    connect: (toolId) => `/api/connections/${seg(toolId)}/connect`,
    refresh: (toolId) => `/api/connections/${seg(toolId)}/refresh`,
    disconnect: (toolId) => `/api/connections/${seg(toolId)}`,
  },

  // The app platform. These paths are resolved against PLATFORM_BASE, not
  // API_BASE — see lib/platform.js. No app id appears in any of them: an app
  // is addressed by the installation the owner created, so this file does not
  // grow a line when an app is published.
  platform: {
    health: () => '/health',
    me: () => '/v1/auth/me',
    signIn: () => '/v1/auth/sign-in',
    signOut: () => '/v1/auth/sign-out',
    catalog: (params) => `/v1/catalog/apps${qs(params)}`,
    app: (appId, params) => `/v1/catalog/apps/${seg(appId)}${qs(params)}`,
    permissions: () => '/v1/catalog/permissions',
    installations: (workspaceId) => `/v1/workspaces/${seg(workspaceId)}/installations`,
    installation: (workspaceId, installationId) =>
      `/v1/workspaces/${seg(workspaceId)}/installations/${seg(installationId)}`,
    enabled: (workspaceId, installationId) =>
      `/v1/workspaces/${seg(workspaceId)}/installations/${seg(installationId)}/enabled`,
    surface: (workspaceId, installationId, surfaceId) =>
      `/v1/workspaces/${seg(workspaceId)}/installations/${seg(installationId)}/surfaces/${seg(surfaceId)}`,
    handoff: (workspaceId, installationId, surfaceId) =>
      `/v1/workspaces/${seg(workspaceId)}/installations/${seg(installationId)}/surfaces/${seg(surfaceId)}/handoff`,
    grant: (workspaceId, installationId) =>
      `/v1/workspaces/${seg(workspaceId)}/installations/${seg(installationId)}/permissions`,
    revoke: (workspaceId, installationId, permissionId) =>
      `/v1/workspaces/${seg(workspaceId)}/installations/${seg(installationId)}/permissions/${seg(permissionId)}`,
    publicSurfaces: (slug) => `/public/${seg(slug)}/surfaces`,
  },

  public: {
    entity: (slug) => `${GCR}/entity/${seg(slug)}`,
    entities: (params) => `${GCR}/entities${qs(params)}`,
    paginated: (params) => `${GCR}/entities/paginated${qs(params)}`,
    children: (parentSlug) => `${GCR}/entities/${seg(parentSlug)}/children`,
    /** Categories come from the data, not from a list in this repo. */
    taxonomy: () => `${GCR}/taxonomy`,
    search: () => `${GCR}/search`,
    suggest: (q) => `${GCR}/search/suggest${qs({ q })}`,
    claim: () => `${GCR}/claim`,
    track: () => `${GCR}/track`,
  },
};

export default endpoints;
