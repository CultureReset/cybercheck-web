/** Presentation helpers. No business logic, no names, no units assumed. */

export const money = (value, label) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const text = n % 1 === 0 ? `$${n.toLocaleString()}` : `$${n.toFixed(2)}`;
  return label ? `${text} ${label}` : text;
};

export const range = (from, to, label) => {
  const a = money(from);
  const b = money(to);
  if (a && b && a !== b) return `${a}–${b}${label ? ` ${label}` : ''}`;
  return money(from ?? to, label);
};

export const date = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const time = (value) => {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!m) return String(value);
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m[2] === '00' ? `${h}${suffix}` : `${h}:${m[2]}${suffix}`;
};

export const cell = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(cell).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const truncate = (text, n = 220) => {
  const s = String(text ?? '');
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
};

/** Weekday name from a 0-6 or 1-7 column, without assuming which. */
export const weekday = (n) => {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const i = Number(n);
  if (!Number.isFinite(i)) return String(n ?? '');
  return names[((i % 7) + 7) % 7];
};
