import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLATFORM_BASE } from '../config.js';
import platform from '../lib/platform.js';
import endpoints from '../lib/endpoints.js';
import { platformSession } from '../lib/platform.js';
import { useInstalledApps } from '../lib/useInstalledApps.jsx';
import { Empty } from '../ui/index.jsx';

/**
 * One app, drawn by the app.
 *
 * This component is the same for every app there will ever be. It resolves an
 * installation and a surface out of the URL, asks the platform for a handoff,
 * and hands that to the bridge — which puts the app in an iframe on the app's
 * own origin. Nothing here knows what any app does.
 *
 * The bridge is imported from the platform at runtime rather than vendored: it
 * carries the origin check that the whole model rests on, and a security check
 * that exists in two places drifts until one of them has a hole.
 */
export default function AppSurface() {
  const { installationId, surfaceId } = useParams();
  const { installations, loading } = useInstalledApps();
  const container = useRef(null);
  const [failure, setFailure] = useState(null);

  const installation = installations.find((i) => i.id === installationId);

  useEffect(() => {
    if (!container.current || !installationId || !surfaceId) return;
    let mounted = null;
    let cancelled = false;
    setFailure(null);

    (async () => {
      const { mountSurface } = await import(/* @vite-ignore */ `${PLATFORM_BASE}/sdk/host.js`);
      if (cancelled) return;
      mounted = mountSurface(container.current, {
        title: installation?.name || 'App',
        height: 620,
        handoff: () =>
          platform.post(
            endpoints.platform.handoff(platformSession.workspaceId(), installationId, surfaceId)
          ),
        onError: (reason) => setFailure(reason),
      });
    })().catch((error) => setFailure(error.message));

    return () => { cancelled = true; mounted?.destroy(); };
  }, [installationId, surfaceId, installation?.name]);

  if (!loading && !installation) {
    return (
      <div className="wrap stack" style={{ paddingTop: 24 }}>
        <Empty
          title="That app is not installed here."
          hint="It may have been removed, or it belongs to another workspace."
          action={<Link className="btn sm primary" to="/apps">Open the store</Link>}
        />
      </div>
    );
  }

  return (
    <div className="wrap stack" style={{ paddingTop: 24 }}>
      <div className="row">
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          {installation?.icon ? `${installation.icon} ` : ''}{installation?.name || 'App'}
        </h1>
        <span className="spacer" />
        <Link className="btn sm ghost" to="/apps">Manage</Link>
      </div>

      {failure ? (
        <div className="card pad" role="status">
          This app could not be opened — it {failure}. Everything else on this dashboard is unaffected.
        </div>
      ) : null}

      <div ref={container} className="card" style={{ overflow: 'hidden', padding: 0 }} />
    </div>
  );
}
