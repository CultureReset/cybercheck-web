import React from 'react';
import { roleOf, isSystemColumn } from '../lib/shape.js';
import { titleFor } from '../lib/discover.js';
import { cell } from '../lib/format.js';

/**
 * The top of a profile, built out of whatever scalar fields the record has.
 *
 * The heading is the field that reads as a title, the picture is the field
 * that reads as an image, and every field that reads as a link becomes a
 * button labelled after itself — so `booking_url` shows up as "Booking",
 * `order_url` as "Order", and a `waiver_url` added next month shows up
 * without being mentioned here.
 */

const pick = (record, role) =>
  Object.keys(record).find((k) => !isSystemColumn(k) && record[k] && roleOf(k, [record[k]]) === role);

// A link label reads better without the part that says it is a link.
const linkLabel = (key) => titleFor(key.replace(/_(url|link|href)$/i, ''));

export default function Hero({ record, children }) {
  const titleKey = pick(record, 'title') || (record.name ? 'name' : null);
  const subKey = pick(record, 'subtitle');
  const imgKey = Object.keys(record).find((k) => /hero|cover|banner/i.test(k) && record[k]) || pick(record, 'image');

  const links = Object.keys(record)
    .filter((k) => !isSystemColumn(k) && record[k] && roleOf(k, [record[k]]) === 'link')
    .filter((k) => k !== imgKey)
    .slice(0, 6);

  // The chips under the heading are whatever short facts the record carries.
  // Not a list of fields: anything scalar, short, and not already used as the
  // title, the picture or a button qualifies — so a column added to `entity`
  // shows up here on its own.
  const used = new Set([titleKey, subKey, imgKey, ...links]);
  const facts = Object.keys(record)
    .filter((k) => !isSystemColumn(k) && !used.has(k))
    .filter((k) => {
      const v = record[k];
      if (v === null || v === undefined || v === '' || v === false) return false;
      if (typeof v === 'number') return false;           // counts read as noise here
      const role = roleOf(k, [v]);
      if (role === 'body' || role === 'image' || role === 'link') return false;
      return typeof v === 'boolean' || String(v).length <= 24;
    })
    .slice(0, 5);

  return (
    <header className="hero">
      {imgKey ? <img className="hero-img" src={record[imgKey]} alt="" /> : null}
      <div className="hero-body">
        <h1>{titleKey ? cell(record[titleKey]) : 'Untitled'}</h1>
        {subKey ? <div className="hero-sub">{cell(record[subKey])}</div> : null}

        <div className="row wrap-row" style={{ marginTop: 10 }}>
          {record.rating ? (
            <span className="pill accent">
              ★ {Number(record.rating).toFixed(1)}
              {record.review_count ? ` · ${record.review_count}` : ''}
            </span>
          ) : null}
          {facts.map((k) => (
            <span className="pill" key={k}>
              {typeof record[k] === 'boolean' ? titleFor(k) : cell(record[k])}
            </span>
          ))}
        </div>

        {links.length || record.phone ? (
          <div className="hero-actions">
            {record.phone ? (
              <a className="btn primary" href={`tel:${String(record.phone).replace(/[^\d+]/g, '')}`}>Call</a>
            ) : null}
            {links.map((k) => (
              <a className="btn" key={k} href={record[k]} target="_blank" rel="noreferrer noopener">
                {linkLabel(k)}
              </a>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </header>
  );
}
