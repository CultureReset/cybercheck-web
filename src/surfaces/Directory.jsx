import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import endpoints from '../lib/endpoints.js';
import { useAsync } from '../lib/useAsync.js';
import { Spinner, ErrorBox, Empty } from '../ui/index.jsx';
import { titleFor } from '../lib/discover.js';

/**
 * The directory.
 *
 * Categories come from GET /api/gcr/taxonomy, which is computed from the
 * businesses that exist. There is no category list in this repo, so a new
 * kind of business appears in the filter bar the day one signs up.
 */
export default function Directory() {
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');

  const taxonomy = useAsync(() => api.get(endpoints.public.taxonomy(), { auth: false }), []);
  const listing = useAsync(
    () => api.get(endpoints.public.entities({ limit: 60, search: term || undefined, category: category || undefined }), { auth: false }),
    [term, category]
  );

  const categories = useMemo(() => {
    const rows = taxonomy.data?.sections || [];
    return [...rows]
      .filter((s) => s.section)
      .sort((a, b) => (b.entity_count || 0) - (a.entity_count || 0));
  }, [taxonomy.data]);

  const items = useMemo(() => {
    const raw = listing.data;
    if (Array.isArray(raw)) return raw;
    return raw?.entities || raw?.rows || raw?.data || [];
  }, [listing.data]);

  return (
    <div className="wrap stack" style={{ paddingTop: 24 }}>
      <form
        className="row wrap-row"
        onSubmit={(e) => { e.preventDefault(); setTerm(query.trim()); }}
      >
        <input
          className="input"
          style={{ maxWidth: 380 }}
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn primary" type="submit">Search</button>
      </form>

      <div className="row wrap-row">
        <button
          className={`pill${category === null ? ' accent' : ''}`}
          onClick={() => setCategory(null)}
          style={{ cursor: 'pointer' }}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.section}
            className={`pill${category === c.section ? ' accent' : ''}`}
            onClick={() => setCategory(c.section)}
            style={{ cursor: 'pointer' }}
          >
            {titleFor(c.section)}
            <span className="dim">{c.entity_count}</span>
          </button>
        ))}
      </div>

      {listing.loading ? <Spinner rows={3} /> : null}
      <ErrorBox error={listing.error} onRetry={listing.reload} />

      {!listing.loading && !listing.error && items.length === 0 ? (
        <Empty title="Nothing here yet." hint="Try a different search." />
      ) : null}

      <div className="grid cols-3">
        {items.map((e) => (
          <Link className="card" key={e.slug || e.id} to={`/b/${encodeURIComponent(e.slug)}`} style={{ textDecoration: 'none' }}>
            {e.hero_image_url ? (
              <img src={e.hero_image_url} alt="" loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
            ) : null}
            <div className="pad stack">
              <div style={{ fontWeight: 600 }}>{e.name}</div>
              {e.subtitle ? <div className="dim">{e.subtitle}</div> : null}
              <div className="row wrap-row">
                {e.entity_subtype || e.entity_type ? <span className="pill">{titleFor(e.entity_subtype || e.entity_type)}</span> : null}
                {e.city ? <span className="pill">{e.city}</span> : null}
                {e.rating ? <span className="pill accent">★ {Number(e.rating).toFixed(1)}</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
