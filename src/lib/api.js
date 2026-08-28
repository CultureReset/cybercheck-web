import { API_BASE } from '../config.js';
import endpoints from './endpoints.js';

/**
 * The one place a request is made.
 *
 * Holds the session token, attaches it, refreshes it once on a 401, and turns
 * an API error body into a thrown ApiError with the status intact. Nothing
 * above this file touches fetch.
 */

const TOKEN_KEY = 'cybercheck.session';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function read() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(session) {
  try {
    if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing: the app still works, it just forgets on reload */
  }
}

export const session = {
  get: read,
  set: write,
  clear: () => write(null),
  token: () => read()?.access_token || null,
};

let refreshing = null;

async function refresh() {
  const current = read();
  if (!current?.refresh_token) return null;
  const res = await fetch(`${API_BASE}${endpoints.session.refresh()}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  });
  if (!res.ok) {
    write(null);
    return null;
  }
  const body = await res.json().catch(() => null);
  const next = body?.session || body;
  if (next?.access_token) {
    write(next);
    return next.access_token;
  }
  write(null);
  return null;
}

async function once(path, options, token) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined
      : typeof options.body === 'string' ? options.body
      : JSON.stringify(options.body),
  });

  const text = await res.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { res, body };
}

export async function request(path, options = {}) {
  const { auth = true, ...rest } = options;
  let token = auth ? session.token() : null;

  let { res, body } = await once(path, rest, token);

  if (res.status === 401 && auth && session.get()?.refresh_token) {
    refreshing = refreshing || refresh().finally(() => { refreshing = null; });
    const fresh = await refreshing;
    if (fresh) ({ res, body } = await once(path, rest, fresh));
  }

  if (!res.ok) {
    const message = (body && typeof body === 'object' && body.error) || res.statusText;
    throw new ApiError(res.status, message, body);
  }
  return body;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export default api;
