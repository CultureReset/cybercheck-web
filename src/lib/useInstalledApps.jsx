import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasPlatform } from '../config.js';
import platform, { platformSession } from './platform.js';
import endpoints from './endpoints.js';
import { navItemsFor } from './appNav.js';

/**
 * What this workspace has installed, held once for the whole shell.
 *
 * The nav, the store and the app pages all read the same list, so installing
 * something updates every one of them in the same tick. Without this they
 * disagree until a reload, which is how a store ends up with a "refresh the
 * page" note in its help text.
 */

const InstalledApps = createContext(null);

export function InstalledAppsProvider({ children }) {
  const [state, setState] = useState({ installations: [], workspaces: [], loading: hasPlatform(), error: null });

  const reload = useCallback(async () => {
    if (!hasPlatform() || !platformSession.token()) {
      setState({ installations: [], workspaces: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const me = await platform.get(endpoints.platform.me());
      const chosen = me.workspaces.find((w) => w.id === platformSession.workspaceId()) || me.workspaces[0];
      if (chosen && chosen.id !== platformSession.workspaceId()) platformSession.chooseWorkspace(chosen.id);

      const installations = chosen ? await platform.installations(chosen.id) : [];
      setState({ installations, workspaces: me.workspaces, workspace: chosen, loading: false, error: null });
    } catch (error) {
      setState({ installations: [], workspaces: [], loading: false, error });
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const value = useMemo(
    () => ({ ...state, navItems: navItemsFor(state.installations), reload }),
    [state, reload]
  );

  return <InstalledApps.Provider value={value}>{children}</InstalledApps.Provider>;
}

export function useInstalledApps() {
  const value = useContext(InstalledApps);
  if (!value) throw new Error('useInstalledApps needs an <InstalledAppsProvider> above it');
  return value;
}
