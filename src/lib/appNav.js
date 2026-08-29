/**
 * Installed apps -> navigation.
 *
 * This is the whole reason the dashboard is modular. The nav is a projection
 * of what the platform says is installed, so installing an app puts a link in
 * the sidebar and uninstalling one takes it away, with nothing in this repo
 * edited either time.
 *
 * There is one route for every app that will ever exist — /a/:installationId
 * /:surfaceId — because an app is addressed by the installation the owner
 * created, never by its name. No app id appears anywhere in src/.
 *
 * A pure function, so the rule above is a test rather than a hope.
 */

/** Surfaces that belong in the dashboard's own navigation. */
const NAVIGABLE = new Set(['dashboard']);

export const pathForSurface = (installationId, surfaceId) =>
  `/a/${encodeURIComponent(installationId)}/${encodeURIComponent(surfaceId)}`;

export function navItemsFor(installations = []) {
  const items = [];

  for (const installation of installations) {
    // Installed is not enabled. A disabled app keeps its records and its
    // permissions and loses only its place in the nav.
    if (installation.status !== 'installed' || !installation.enabled) continue;

    for (const surface of installation.surfaces || []) {
      if (!NAVIGABLE.has(surface.kind) || !surface.enabled) continue;
      items.push({
        key: `${installation.id}:${surface.surface_id}`,
        installationId: installation.id,
        surfaceId: surface.surface_id,
        title: surface.title || installation.name,
        icon: installation.icon || null,
        appName: installation.name,
        position: surface.position ?? 0,
        path: pathForSurface(installation.id, surface.surface_id),
      });
    }
  }

  return items.sort(
    (a, b) => a.position - b.position || a.appName.localeCompare(b.appName) || a.title.localeCompare(b.title)
  );
}

/** Public surfaces the owner has put on the customer-facing page, in order. */
export function publicSurfacesFor(installations = []) {
  return installations
    .filter((i) => i.status === 'installed' && i.enabled)
    .flatMap((i) =>
      (i.surfaces || [])
        .filter((s) => s.kind === 'public' && s.enabled && s.published)
        .map((s) => ({
          key: `${i.id}:${s.surface_id}`,
          installationId: i.id,
          surfaceId: s.surface_id,
          title: s.title || i.name,
          appName: i.name,
          position: s.position ?? 0,
        }))
    )
    .sort((a, b) => a.position - b.position || a.appName.localeCompare(b.appName));
}
