import React from 'react';
import { money, range, date, time, cell, weekday, truncate } from '../lib/format.js';
import { titleFor } from '../lib/discover.js';

/**
 * One renderer per shape.
 *
 * Every renderer takes the same argument — a block from discover() — and
 * reads its columns through `profile.col(role)` rather than by name. That is
 * what lets `menu_items`, `service_menu`, `room_types` and a table invented
 * next week all arrive at PriceList and all come out right.
 *
 * A renderer never assumes a column exists. If `profile.col('image')` is null
 * the image is simply not drawn.
 */

const val = (row, column) => (column ? row[column] : undefined);
const key = (row, i) => row?.id ?? `${i}`;

/* ── photos ──────────────────────────────────────────────────────────── */
export function Gallery({ block }) {
  const { rows, profile } = block;
  const img = profile.col('image');
  const cap = profile.col('body') || profile.col('title');
  if (!img) return <DataTable block={block} />;
  return (
    <div className="grid cols-3">
      {rows.map((row, i) => (
        <figure className="tile" key={key(row, i)}>
          <img src={val(row, img)} alt={cell(val(row, cap)) === '—' ? '' : cell(val(row, cap))} loading="lazy" />
          {val(row, cap) ? <figcaption>{cell(val(row, cap))}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

/* ── opening hours ───────────────────────────────────────────────────── */
export function Hours({ block }) {
  const { rows, profile } = block;
  const open = profile.byRole.time?.[0] || 'opens_at';
  const close = profile.byRole.time?.[1] || 'closes_at';
  const label = profile.hasColumn('day_of_week') ? 'day_of_week' : profile.col('title');
  return (
    <div className="card pad">
      {rows.map((row, i) => {
        const closed = row.is_closed === true || row.closed === true;
        const from = time(val(row, open));
        const to = time(val(row, close));
        return (
          <div className="hours-row" key={key(row, i)}>
            <span>{label === 'day_of_week' ? weekday(row.day_of_week) : cell(val(row, label))}</span>
            <span className="muted">{closed || !from ? 'Closed' : to ? `${from} – ${to}` : from}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── questions and answers ───────────────────────────────────────────── */
export function FAQ({ block }) {
  const { rows } = block;
  return (
    <div className="card pad">
      {rows.map((row, i) => (
        <details className="qa" key={key(row, i)}>
          <summary>{cell(row.question)}</summary>
          <div className="qa-body">{cell(row.answer)}</div>
        </details>
      ))}
    </div>
  );
}

/* ── ratings ─────────────────────────────────────────────────────────── */
const Stars = ({ n }) => {
  const v = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return <span className="stars" aria-label={`${v} out of 5`}>{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>;
};

export function Reviews({ block }) {
  const { rows, profile } = block;
  const rating = profile.col('rating');
  const who = profile.col('person') || profile.col('title');
  const body = profile.col('body');
  const when = profile.col('date');
  return (
    <div className="grid cols-2">
      {rows.map((row, i) => (
        <article className="card pad stack" key={key(row, i)}>
          <div className="row">
            {rating ? <Stars n={val(row, rating)} /> : null}
            <span className="spacer" />
            {when ? <span className="dim">{date(val(row, when))}</span> : null}
          </div>
          {body ? <p style={{ margin: 0 }}>{truncate(val(row, body), 360)}</p> : null}
          {who ? <div className="dim">{cell(val(row, who))}</div> : null}
        </article>
      ))}
    </div>
  );
}

/* ── people ──────────────────────────────────────────────────────────── */
export function People({ block }) {
  const { rows, profile } = block;
  const name = profile.col('title');
  const role = profile.col('subtitle');
  const img = profile.col('image');
  const bio = profile.col('body');
  return (
    <div className="grid cols-3">
      {rows.map((row, i) => (
        <article className="card pad stack" key={key(row, i)}>
          {img && val(row, img) ? (
            <img src={val(row, img)} alt="" loading="lazy"
                 style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          ) : null}
          <div>
            <div style={{ fontWeight: 600 }}>{cell(val(row, name))}</div>
            {role ? <div className="dim">{cell(val(row, role))}</div> : null}
          </div>
          {bio ? <p className="muted" style={{ margin: 0, fontSize: '.92rem' }}>{truncate(val(row, bio), 200)}</p> : null}
        </article>
      ))}
    </div>
  );
}

/* ── anything with a name and a price ────────────────────────────────── */
export function PriceList({ block }) {
  const { rows, profile } = block;
  const name = profile.col('title');
  const body = profile.col('body');
  const img = profile.col('image');
  const price = profile.col('price');
  const priceTo = profile.col('priceMax');
  const label = profile.col('priceLabel');
  return (
    <div className="card pad">
      {rows.map((row, i) => (
        <div className="line-item" key={key(row, i)}>
          {img && val(row, img) ? <img className="li-thumb" src={val(row, img)} alt="" loading="lazy" /> : null}
          <div className="li-body">
            <div className="li-title">{cell(val(row, name))}</div>
            {body && val(row, body) ? (
              <div className="muted" style={{ fontSize: '.92rem' }}>{truncate(val(row, body), 180)}</div>
            ) : null}
            {Array.isArray(row.tiers) && row.tiers.length ? (
              <div className="row wrap-row" style={{ marginTop: 6 }}>
                {row.tiers.map((t, ti) => (
                  <span className="pill" key={t.id ?? ti}>
                    {cell(t.label ?? t.tier_name ?? t.name)} {money(t.price) || ''}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="li-price">{range(val(row, price), val(row, priceTo), val(row, label)) || ''}</div>
        </div>
      ))}
    </div>
  );
}

/* ── anything with a date ────────────────────────────────────────────── */
export function Timeline({ block }) {
  const { rows, profile } = block;
  const when = profile.col('date');
  const name = profile.col('title');
  const body = profile.col('body');
  const img = profile.col('image');
  return (
    <div className="grid cols-2">
      {rows.map((row, i) => (
        <article className="card" key={key(row, i)}>
          {img && val(row, img) ? (
            <img src={val(row, img)} alt="" loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
          ) : null}
          <div className="pad stack">
            <div className="pill accent">{date(val(row, when)) || '—'}</div>
            <div style={{ fontWeight: 600 }}>{cell(val(row, name))}</div>
            {body ? <div className="muted" style={{ fontSize: '.92rem' }}>{truncate(val(row, body), 180)}</div> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

/* ── key/value facts ─────────────────────────────────────────────────── */
export function Facts({ block }) {
  const { rows, profile } = block;
  const labelCol = profile.hasColumn('label') ? 'label' : profile.hasColumn('key') ? 'key' : profile.col('title');
  const valueCol = profile.hasColumn('value') ? 'value'
    : profile.content.find((c) => c !== labelCol) || null;

  // Rows that are a label with no value are a list, not a table of facts.
  if (!valueCol) {
    return (
      <div className="row wrap-row">
        {rows.map((row, i) => <span className="pill" key={key(row, i)}>{cell(val(row, labelCol))}</span>)}
      </div>
    );
  }
  return (
    <dl className="facts">
      {rows.map((row, i) => (
        <div key={key(row, i)}>
          <dt>{cell(val(row, labelCol))}</dt>
          <dd>{cell(val(row, valueCol))}{row.unit ? ` ${row.unit}` : ''}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── long text ───────────────────────────────────────────────────────── */
export function Prose({ block }) {
  const { rows, profile } = block;
  const body = profile.col('body');
  const head = profile.col('title') || profile.col('subtitle');
  return (
    <div className="card pad stack">
      {rows.map((row, i) => (
        <div key={key(row, i)}>
          {head && val(row, head) ? <div style={{ fontWeight: 600, marginBottom: 4 }}>{cell(val(row, head))}</div> : null}
          <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{cell(val(row, body))}</div>
        </div>
      ))}
    </div>
  );
}

/* ── links out ───────────────────────────────────────────────────────── */
export function Links({ block }) {
  const { rows, profile } = block;
  const href = profile.col('link');
  const name = profile.col('title') || profile.col('subtitle');
  return (
    <div className="row wrap-row">
      {rows.map((row, i) => (
        <a className="btn" key={key(row, i)} href={val(row, href)} target="_blank" rel="noreferrer noopener">
          {cell(val(row, name)) === '—' ? val(row, href) : cell(val(row, name))}
        </a>
      ))}
    </div>
  );
}

/* ── general cards ───────────────────────────────────────────────────── */
export function Cards({ block }) {
  const { rows, profile } = block;
  const name = profile.col('title');
  const sub = profile.col('subtitle');
  const body = profile.col('body');
  const img = profile.col('image');
  const href = profile.col('link');
  return (
    <div className="grid cols-3">
      {rows.map((row, i) => {
        const inner = (
          <>
            {img && val(row, img) ? (
              <img src={val(row, img)} alt="" loading="lazy" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            ) : null}
            <div className="pad stack">
              <div style={{ fontWeight: 600 }}>{cell(val(row, name))}</div>
              {sub && val(row, sub) ? <div className="dim">{cell(val(row, sub))}</div> : null}
              {body && val(row, body) ? (
                <div className="muted" style={{ fontSize: '.92rem' }}>{truncate(val(row, body), 160)}</div>
              ) : null}
            </div>
          </>
        );
        return href && val(row, href) ? (
          <a className="card" key={key(row, i)} href={val(row, href)} target="_blank"
             rel="noreferrer noopener" style={{ textDecoration: 'none' }}>{inner}</a>
        ) : (
          <article className="card" key={key(row, i)}>{inner}</article>
        );
      })}
    </div>
  );
}

/* ── a section whose rows carry their own children ───────────────────── */
export function Grouped({ block, renderChild }) {
  const { rows, profile, nested } = block;
  const name = profile.col('title') || profile.col('subtitle');
  const sub = profile.col('body');
  return (
    <div className="stack">
      {rows.map((row, i) => {
        const children = Array.isArray(row[nested]) ? row[nested] : [];
        return (
          <section key={key(row, i)} className="stack">
            <div className="block-head" style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.02rem' }}>{cell(val(row, name))}</h2>
              {children.length ? <span className="dim">{children.length}</span> : null}
            </div>
            {sub && val(row, sub) ? <div className="muted">{cell(val(row, sub))}</div> : null}
            {children.length ? renderChild(children, `${block.key}.${key(row, i)}`) : null}
          </section>
        );
      })}
    </div>
  );
}

/* ── the universal fallback ──────────────────────────────────────────── */
export function DataTable({ block, limit = 50 }) {
  const { rows, profile } = block;
  const columns = profile.content.length ? profile.content : profile.columns;
  const shown = rows.slice(0, limit);
  return (
    <>
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{titleFor(c)}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={key(row, i)}>
                {columns.map((c) => (
                  <td key={c} className={profile.roles[c] === 'body' ? 'wide' : undefined}>
                    {profile.roles[c] === 'body' ? truncate(cell(row[c]), 160) : cell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > shown.length ? (
        <div className="dim" style={{ marginTop: 8 }}>{rows.length - shown.length} more</div>
      ) : null}
    </>
  );
}
