import React, { useMemo, useState } from 'react';
import { Field, ErrorBox } from '../ui/index.jsx';
import { titleFor } from '../lib/discover.js';
import { roleOf, isSystemColumn } from '../lib/shape.js';

/**
 * The owner's editor for one row of any table.
 *
 * There is no per-table form in this repo and there is not going to be one.
 * The fields come from GET /api/business/schema — the live column list, read
 * from PostgREST's own OpenAPI document — so a column added to the database
 * this afternoon is an input this evening with nothing rebuilt.
 *
 * When a table is missing from the schema (a view, a fresh table, a cache
 * that has not turned over yet) the fields are inferred from the row instead,
 * so the editor still opens.
 */

const inputFor = (column, role) => {
  if (column.enum?.length) return 'select';
  if (column.type === 'boolean') return 'checkbox';
  if (column.type === 'integer' || column.type === 'number') return 'number';
  if (column.format === 'date') return 'date';
  if (/timestamp/.test(column.format || '')) return 'datetime-local';
  if (column.format === 'time' || role === 'time') return 'time';
  if (role === 'body') return 'textarea';
  if (role === 'link' || role === 'image') return 'url';
  if (role === 'email') return 'email';
  if (role === 'phone') return 'tel';
  return 'text';
};

/** Columns to show, in a sensible order, from schema if we have it. */
function fieldsFor(schemaColumns, row) {
  const source = schemaColumns?.length
    ? schemaColumns.filter((c) => c.editable)
    : Object.keys(row || {})
        .filter((c) => !isSystemColumn(c))
        .map((c) => ({ name: c, type: typeof row[c] === 'number' ? 'number' : typeof row[c] === 'boolean' ? 'boolean' : 'string' }));

  return source
    .map((c) => ({ ...c, role: roleOf(c.name, row?.[c.name] === undefined ? [] : [row[c.name]]) }))
    .map((c) => ({ ...c, control: inputFor(c, c.role) }))
    // Titles first, long text last — the same ordering instinct a hand-built
    // form would have, applied to every table at once.
    .sort((a, b) => {
      const rank = (f) => (f.role === 'title' ? 0 : f.role === 'subtitle' ? 1 : f.control === 'textarea' ? 9 : 5);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
}

export default function RowEditor({ table, row, schemaColumns, onSave, onCancel, onDelete }) {
  const fields = useMemo(() => fieldsFor(schemaColumns, row), [schemaColumns, row]);
  const [draft, setDraft] = useState(() => ({ ...(row || {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (name, value) => setDraft((d) => ({ ...d, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Only what changed. The API strips identity columns anyway, but
      // sending the whole row would fight anyone editing a neighbouring field.
      const patch = {};
      for (const f of fields) {
        if (draft[f.name] !== row?.[f.name]) patch[f.name] = draft[f.name];
      }
      await onSave(patch);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <ErrorBox error={error} />
      {fields.length === 0 ? <div className="dim">Nothing editable in {titleFor(table)}.</div> : null}

      {fields.map((f) => {
        const value = draft[f.name];
        const common = { id: `f-${f.name}`, name: f.name, className: 'input' };
        return (
          <Field key={f.name} label={titleFor(f.name)} hint={f.role === 'text' ? null : f.role}>
            {f.control === 'textarea' ? (
              <textarea {...common} className="textarea" value={value ?? ''} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.control === 'select' ? (
              <select {...common} className="select" value={value ?? ''} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">—</option>
                {f.enum.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.control === 'checkbox' ? (
              <input type="checkbox" checked={Boolean(value)} onChange={(e) => set(f.name, e.target.checked)} />
            ) : (
              <input
                {...common}
                type={f.control}
                value={value ?? ''}
                onChange={(e) => set(f.name, f.control === 'number'
                  ? (e.target.value === '' ? null : Number(e.target.value))
                  : e.target.value)}
              />
            )}
          </Field>
        );
      })}

      <div className="row">
        {onDelete ? (
          <button type="button" className="btn sm danger" disabled={busy}
                  onClick={() => onDelete().catch(setError)}>Delete</button>
        ) : null}
        <span className="spacer" />
        <button type="button" className="btn sm ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn sm primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
