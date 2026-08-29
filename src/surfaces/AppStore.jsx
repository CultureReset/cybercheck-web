import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { hasPlatform } from '../config.js';
import platform, { platformSession } from '../lib/platform.js';
import endpoints from '../lib/endpoints.js';
import { useAsync } from '../lib/useAsync.js';
import { useInstalledApps } from '../lib/useInstalledApps.jsx';
import { Spinner, ErrorBox, Empty, Modal } from '../ui/index.jsx';

/**
 * The store, and what is installed.
 *
 * Both lists come from the platform. Nothing here knows the name of an app, so
 * publishing one adds a card and installing one adds a link to the nav without
 * a line of this file changing.
 */
export default function AppStore() {
  const installed = useInstalledApps();
  const workspaceId = platformSession.workspaceId();
  const catalog = useAsync(
    () => (hasPlatform() && platformSession.token()
      ? platform.get(endpoints.platform.catalog({ workspace: workspaceId }))
      : Promise.resolve({ apps: [] })),
    [workspaceId, installed.installations.length]
  );
  const [consenting, setConsenting] = useState(null);
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState(null);

  if (!hasPlatform()) {
    return (
      <div className="wrap stack" style={{ paddingTop: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Apps</h1>
        <Empty title="No app platform is attached to this deployment."
               hint="Set VITE_PLATFORM_BASE to the platform's address and this section fills itself in." />
      </div>
    );
  }

  if (!platformSession.token()) return <ConnectPlatform onDone={() => { installed.reload(); catalog.reload(); }} />;

  const after = async (work) => {
    setProblem(null);
    try {
      await work();
      await Promise.all([installed.reload(), catalog.reload()]);
    } catch (error) {
      setProblem(error);
    } finally {
      setBusy(null);
    }
  };

  const uninstall = (installation) => {
    // Uninstalling and deleting the records are two decisions, so they are two
    // questions. The default keeps the records.
    const alsoDelete = window.confirm(
      `Remove ${installation.name}?\n\nOK removes the app and keeps its records — reinstalling picks them back up.\n` +
      `Cancel to stop.`
    );
    if (!alsoDelete) return;
    setBusy(installation.id);
    return after(() => platform.del(endpoints.platform.installation(workspaceId, installation.id)));
  };

  return (
    <div className="wrap stack" style={{ paddingTop: 24 }}>
      <div className="row">
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Apps</h1>
        <span className="spacer" />
        <Link className="btn sm ghost" to="/connections">Connections</Link>
      </div>

      <ErrorBox error={problem || catalog.error || installed.error} onRetry={() => { catalog.reload(); installed.reload(); }} />

      <h2 className="muted" style={{ margin: '8px 0 0', fontSize: '.85rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
        Installed
      </h2>
      {installed.loading ? <Spinner rows={2} /> : null}
      {!installed.loading && installed.installations.length === 0
        ? <Empty title="Nothing installed yet." hint="Anything you install below appears in the navigation above." />
        : null}

      <div className="stack">
        {installed.installations.map((installation) => (
          <article className="card pad row" key={installation.id} style={{ gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem' }}>{installation.icon || '▣'}</span>
            <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <strong>{installation.name}</strong>
              <span className="muted" style={{ fontSize: '.85rem' }}>
                v{installation.version} · {installation.permissions.length} permission
                {installation.permissions.length === 1 ? '' : 's'}
                {installation.updateAvailable ? ` · update to ${installation.latest_version}` : ''}
              </span>
            </span>

            <SurfaceToggles installation={installation} workspaceId={workspaceId} onChange={after} />

            <button className="btn sm ghost" disabled={busy === installation.id}
                    onClick={() => { setBusy(installation.id);
                      after(() => platform.post(endpoints.platform.enabled(workspaceId, installation.id),
                                                { enabled: !installation.enabled })); }}>
              {installation.enabled ? 'Disable' : 'Enable'}
            </button>
            <button className="btn sm ghost" disabled={busy === installation.id}
                    onClick={() => uninstall(installation)}>
              Remove
            </button>
          </article>
        ))}
      </div>

      <h2 className="muted" style={{ margin: '20px 0 0', fontSize: '.85rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
        Available
      </h2>
      {catalog.loading ? <Spinner rows={2} /> : null}

      <div className="grid cols-3">
        {(catalog.data?.apps || []).filter((app) => !app.installed).map((app) => (
          <article className="card pad stack" key={app.id}>
            <span style={{ fontSize: '1.6rem' }}>{app.icon || '▣'}</span>
            <strong>{app.name}</strong>
            <span className="muted" style={{ fontSize: '.9rem', flex: 1 }}>{app.summary}</span>
            <div className="row wrap-row" style={{ gap: 6 }}>
              <span className="pill">{app.publisher}</span>
              <span className="pill">{app.pricing.model === 'free' ? 'Free' : `${app.pricing.amount} ${app.pricing.currency}`}</span>
              {app.surfaceKinds.map((kind) => <span className="pill" key={kind}>{kind}</span>)}
            </div>
            <button className="btn sm primary" onClick={() => setConsenting(app.id)}>Install</button>
          </article>
        ))}
      </div>

      {!catalog.loading && (catalog.data?.apps || []).every((a) => a.installed)
        ? <Empty title="Nothing else to install." hint="Publish an app with the cc CLI and it shows up here." />
        : null}

      {consenting ? (
        <ConsentDialog
          appId={consenting}
          workspaceId={workspaceId}
          onClose={() => setConsenting(null)}
          onInstalled={() => { setConsenting(null); after(() => Promise.resolve()); }}
        />
      ) : null}
    </div>
  );
}

/** Where a public surface may appear. Publishing is not installing. */
function SurfaceToggles({ installation, workspaceId, onChange }) {
  const publicSurfaces = (installation.surfaces || []).filter((s) => s.kind === 'public');
  if (publicSurfaces.length === 0) return null;

  return (
    <span className="row" style={{ gap: 6 }}>
      {publicSurfaces.map((surface) => (
        <button
          key={surface.surface_id}
          className={`pill${surface.published ? ' accent' : ''}`}
          style={{ cursor: 'pointer' }}
          title={`${surface.title || surface.surface_id} on your public page`}
          onClick={() =>
            onChange(() =>
              platform.patch(endpoints.platform.surface(workspaceId, installation.id, surface.surface_id),
                             { published: !surface.published }))
          }
        >
          {surface.published ? 'On public page' : 'Add to public page'}
        </button>
      ))}
    </span>
  );
}

/**
 * The consent screen, built from what the app declared.
 *
 * A required permission cannot be unticked, because the app does not run
 * without it and offering the choice would be a lie. The reason beside each
 * one is the developer's, not this repo's.
 */
function ConsentDialog({ appId, workspaceId, onClose, onInstalled }) {
  const detail = useAsync(() => platform.get(endpoints.platform.app(appId, { workspace: workspaceId })), [appId]);
  const [granted, setGranted] = useState(null);
  const [surfaces, setSurfaces] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const app = detail.data;
  const permissions = app?.permissions || [];
  const chosen = granted ?? permissions.map((p) => p.permission_id);
  const chosenSurfaces = surfaces ?? (app?.surfaces || []).map((s) => s.surface_id);

  const toggle = (permission) => {
    if (!permission.optional) return;
    setGranted(chosen.includes(permission.permission_id)
      ? chosen.filter((id) => id !== permission.permission_id)
      : [...chosen, permission.permission_id]);
  };

  const install = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await platform.post(endpoints.platform.installations(workspaceId),
                          { appId, grants: chosen, surfaces: chosenSurfaces });
      onInstalled();
    } catch (error) {
      setProblem(error);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={app ? `Install ${app.name}` : 'Install'}
      onClose={onClose}
      footer={
        <>
          <button className="btn sm ghost" onClick={onClose}>Cancel</button>
          <button className="btn sm primary" onClick={install} disabled={busy || detail.loading}>
            {busy ? 'Installing…' : 'Approve and install'}
          </button>
        </>
      }
    >
      {detail.loading ? <Spinner rows={3} /> : null}
      <ErrorBox error={problem || detail.error} />

      {app ? (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>{app.description || app.summary}</p>

          {app.surfaces.length ? (
            <>
              <strong style={{ fontSize: '.9rem' }}>Where it may appear</strong>
              {app.surfaces.map((surface) => (
                <label className="row" key={surface.surface_id} style={{ gap: 10, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={chosenSurfaces.includes(surface.surface_id)}
                         onChange={() => setSurfaces(chosenSurfaces.includes(surface.surface_id)
                           ? chosenSurfaces.filter((id) => id !== surface.surface_id)
                           : [...chosenSurfaces, surface.surface_id])} />
                  <span>
                    <strong>{surface.title || surface.surface_id}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: '.85rem' }}>{surface.kind}</span>
                  </span>
                </label>
              ))}
            </>
          ) : null}

          <strong style={{ fontSize: '.9rem' }}>What it is asking for</strong>
          {permissions.length === 0
            ? <p className="muted" style={{ margin: 0 }}>Nothing. This app only touches its own records.</p>
            : permissions.map((permission) => (
                <label className="row" key={permission.permission_id} style={{ gap: 10, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={chosen.includes(permission.permission_id)}
                         disabled={!permission.optional} onChange={() => toggle(permission)} />
                  <span>
                    <strong>{permission.title}</strong>
                    {permission.sensitive ? <span className="pill" style={{ marginLeft: 6 }}>sensitive</span> : null}
                    <span className="muted" style={{ display: 'block', fontSize: '.85rem' }}>{permission.reason}</span>
                  </span>
                </label>
              ))}

          <p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>
            Required permissions cannot be unticked — the app does not run without them. Anything optional can be
            granted later, and any of them revoked at any time.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}

/**
 * The one place the platform's separate sign-in surfaces.
 *
 * The dashboard and the platform are still two identity systems. Until they
 * are one, saying so plainly beats a silent empty page.
 */
function ConnectPlatform({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      await platform.signIn(email, password);
      onDone();
    } catch (error) {
      setProblem(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap stack" style={{ paddingTop: 24, maxWidth: 420 }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Apps</h1>
      <p className="muted" style={{ margin: 0 }}>
        Connect this dashboard to your app platform account. Once connected, everything you install appears in the
        navigation above.
      </p>
      <form className="stack" onSubmit={submit}>
        <input className="input" type="email" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input className="input" type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <ErrorBox error={problem} />
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Connect'}</button>
      </form>
    </div>
  );
}
