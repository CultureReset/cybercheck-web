import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link, useLocation } from 'react-router-dom';
import { SINGLE_BUSINESS_SLUG, SITE_NAME, isSingleBusiness } from './config.js';
import { session } from './lib/api.js';
import api from './lib/api.js';
import endpoints from './lib/endpoints.js';
import { useAsync } from './lib/useAsync.js';

import Directory from './surfaces/Directory.jsx';
import PublicProfile from './surfaces/PublicProfile.jsx';
import OwnerDashboard from './surfaces/OwnerDashboard.jsx';
import AppStore from './surfaces/AppStore.jsx';
import SignIn from './surfaces/SignIn.jsx';
import SignUp from './surfaces/SignUp.jsx';

/**
 * Two deployments, one build.
 *
 *   directory          "/" lists businesses, "/b/:slug" is one of them
 *   single business    "/" *is* the business, because the operator set
 *                      VITE_SINGLE_BUSINESS_SLUG for that domain
 *
 * The owner routes are identical either way: the API resolves which business
 * the session owns, so there is no slug in any of these paths.
 */

function RequireSession({ children }) {
  const location = useLocation();
  if (!session.token()) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return children;
}

function TopBar() {
  const signedIn = Boolean(session.token());
  // The site's own name comes from the API when a single business owns the
  // domain, so a white-label deployment does not need a rebuild to be named.
  const business = useAsync(
    () => (isSingleBusiness() ? api.get(endpoints.public.entity(SINGLE_BUSINESS_SLUG), { auth: false }) : Promise.resolve(null)),
    []
  );
  const name = SITE_NAME || business.data?.name || 'CyberCheck';

  return (
    <header className="topbar">
      <div className="wrap">
        <Link className="brand" to="/">{name}</Link>
        <span className="spacer" />
        {isSingleBusiness() ? null : <NavLink className="nav-link" to="/">Directory</NavLink>}
        {signedIn ? (
          <>
            <NavLink className="nav-link" to="/dashboard">Dashboard</NavLink>
            <NavLink className="nav-link" to="/apps">Apps</NavLink>
            <button className="btn sm ghost" onClick={() => { session.clear(); window.location.assign('/'); }}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <NavLink className="nav-link" to="/signin">Sign in</NavLink>
            <Link className="btn sm primary" to="/signup">Add your business</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <TopBar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={isSingleBusiness() ? <PublicProfile /> : <Directory />} />
            <Route path="/b/:slug" element={<PublicProfile />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<RequireSession><OwnerDashboard /></RequireSession>} />
            <Route path="/apps" element={<RequireSession><AppStore /></RequireSession>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="footer">
          <div className="wrap">Every screen on this site is rendered from data. Nothing here is a template.</div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
