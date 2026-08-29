import React, { useMemo, useState } from 'react';
import api from '../lib/api.js';
import endpoints from '../lib/endpoints.js';
import { useAsync } from '../lib/useAsync.js';
import { Spinner, ErrorBox, Empty } from '../ui/index.jsx';
import { titleFor } from '../lib/discover.js';

/**
 * Connections: accounts this business has elsewhere.
 *
 * Distinct from the app store. A connection is an account somewhere else that
 * this business authorises — Toast, Google — and the catalogue of them is the
 * operator's, held in the database. An app, by contrast, is something
 * installed here; that lives in AppStore.jsx.
 */
export default function Connections() {
  const { data, error, loading, reload } = useAsync(() => api.get(endpoints.connections.list()), []);
  const [category, setCategory] = useState(null);
  const [busy, setBusy] = useState(null);

  const tools = useMemo(() => {
    const all = data?.tools || [];
    return category ? all.filter((t) => t.category === category) : all;
  }, [data, category]);

  const connect = async (tool) => {
    setBusy(tool.tool_id);
    try {
      const body = await api.post(endpoints.connections.connect(tool.tool_id));
      if (body?.redirect_url) window.location.assign(body.redirect_url);
      else await reload();
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (tool) => {
    setBusy(tool.tool_id);
    try {
      await api.del(endpoints.connections.disconnect(tool.tool_id));
      await reload();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="wrap stack" style={{ paddingTop: 24 }}><Spinner rows={3} /></div>;

  return (
    <div className="wrap stack" style={{ paddingTop: 24 }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Connections</h1>
      <ErrorBox error={error} onRetry={reload} />

      <div className="row wrap-row">
        <button className={`pill${category === null ? ' accent' : ''}`} style={{ cursor: 'pointer' }}
                onClick={() => setCategory(null)}>All</button>
        {(data?.categories || []).map((c) => {
          const value = typeof c === 'string' ? c : c.key || c.name;
          return (
            <button key={value} style={{ cursor: 'pointer' }}
                    className={`pill${category === value ? ' accent' : ''}`}
                    onClick={() => setCategory(value)}>{titleFor(value)}</button>
          );
        })}
      </div>

      {tools.length === 0 ? <Empty title="No connections offered yet." /> : null}

      <div className="grid cols-3">
        {tools.map((t) => (
          <article className="card pad stack" key={t.tool_id}>
            <div className="row">
              <strong>{t.name || titleFor(t.tool_id)}</strong>
              <span className="spacer" />
              {t.connection ? <span className="pill accent">{t.connection.status}</span> : null}
            </div>
            {t.description ? <p className="muted" style={{ margin: 0, fontSize: '.92rem' }}>{t.description}</p> : null}
            <div className="row">
              <span className="spacer" />
              {t.connection ? (
                <button className="btn sm danger" disabled={busy === t.tool_id} onClick={() => disconnect(t)}>Disconnect</button>
              ) : (
                <button className="btn sm primary" disabled={busy === t.tool_id} onClick={() => connect(t)}>
                  {busy === t.tool_id ? 'Opening…' : 'Connect'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
