import { PLATFORM_BASE, hasPlatform } from '../config.js';
import endpoints from './endpoints.js';

/**
 * The client for the app platform.
 *
 * Separate from lib/api.js on purpose: a different service, a different base
 * address and a different session. It authenticates with a bearer token rather
 * than a cookie, because the dashboard runs on its own origin and a
 * cross-origin cookie is a thing to get wrong quietly.
 *
 * Nothing in here names an app. Every path is addressed by the installation
 * the owner created, so publishing an app does not change this file.
 */

const STORAGE_KEY = 'cybercheck.platform.session';

export class PlatformError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.name = 'PlatformError';
    this.status = status;
    this.detail = detail;
  }
}

const readStored = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
};
const writeStored = (value) => {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* private browsing: it works, it just forgets on reload */ }
};

export const platformSession = {
  get: readStored,
  token: () => readStored()?.token || null,
  workspaceId: () => readStored()?.workspaceId || null,
  set: writeStored,
  clear: () => writeStored(null),
  /** Which workspace the owner is looking at. Their choice, not the first row. */
  chooseWorkspace(workspaceId) {
    const current = readStored();
    if (current) writeStored({ ...current, workspaceId });
  },
};

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!hasPlatform()) throw new PlatformError(0, 'No app platform is configured');

  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = auth ? platformSession.token() : null;
  if (token) headers.authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${PLATFORM_BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PlatformError(0, 'The app platform is not reachable');
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;

  if (res.status === 401 && auth) {
    platformSession.clear();
    throw new PlatformError(401, 'Your app platform session has expired');
  }
  if (!res.ok) {
    throw new PlatformError(res.status, parsed?.error?.message || res.statusText, parsed?.error?.detail);
  }
  return parsed;
}

export const platform = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),

  async signIn(email, password) {
    const result = await request(endpoints.platform.signIn(), {
      method: 'POST', auth: false, body: { email, password },
    });
    const me = await (async () => {
      writeStored({ token: result.session.token, workspaceId: null, email: result.user.email });
      return request(endpoints.platform.me());
    })();
    writeStored({
      token: result.session.token,
      email: result.user.email,
      name: result.user.name,
      workspaceId: me.workspaces[0]?.id || null,
    });
    return me;
  },

  me: () => request(endpoints.platform.me()),

  /** Everything installed in this workspace, as the platform reports it. */
  installations: (workspaceId) =>
    request(endpoints.platform.installations(workspaceId)).then((r) => r.installations || []),
};

export default platform;
