// Starts the app and switches between screens.

import { menuScreen } from './screens/menu.js';
import { plazaScreen } from './screens/plaza.js';
import { editorScreen } from './screens/editor.js';
import { islandScreen } from './screens/island.js';
import { loadHairLibrary } from './mii/hair.js';
import { loadFaceTex } from './mii/facetex.js';
import { createLoader } from './ui/loading.js';

const SCREENS = { menu: menuScreen, plaza: plazaScreen, editor: editorScreen, island: islandScreen };
const root = document.getElementById('app');
let current = null;

const app = {
  go(name, params = {}) {
    current?.unmount();
    root.replaceChildren();
    root.dataset.screen = name;
    current = SCREENS[name](root, app, params);
    window.scrollTo(0, 0);
  },
};

// Miis need the hairstyles and the make-up rasters, so load them before the first screen.
const loader = createLoader('Mii-onderdelen laden');
document.body.append(loader.el);
let loaded = 0;
const track = (promise, text) =>
  promise.then((v) => {
    loaded++;
    loader.set(0.15 + 0.85 * (loaded / 2), text);
    return v;
  });
loader.set(0.1, '72 kapsels en de make-up ophalen');
Promise.all([track(loadHairLibrary(), 'Kapsels geladen'), track(loadFaceTex(), 'Make-up geladen')]).then(
  async () => {
    await loader.done();
    app.go({ '#mii': 'plaza', '#eiland': 'island' }[location.hash] ?? 'menu');
  },
  (err) => {
    loader.fail('De Mii-onderdelen konden niet worden geladen. Probeer de pagina opnieuw te laden.');
    console.error(err);
  },
);
