// Registry of extra phone apps. A feature adds one with registerApp({ id, label, icon, color,
// badge?(game) -> number, render({ page, back, game, h, toast }) }); render() draws the app with
// page(title, ...elements) (a screen with a Back button) and may call back() to return home.
export const EXTRA_APPS = [];

export function registerApp(app) {
  const i = EXTRA_APPS.findIndex((a) => a.id === app.id);
  if (i >= 0) EXTRA_APPS[i] = app;
  else EXTRA_APPS.push(app);
}

export function unregisterApp(id) {
  const i = EXTRA_APPS.findIndex((a) => a.id === id);
  if (i >= 0) EXTRA_APPS.splice(i, 1);
}
