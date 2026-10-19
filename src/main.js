// Starts the app and switches between screens.

import { menuScreen } from './screens/menu.js';
import { plazaScreen } from './screens/plaza.js';
import { editorScreen } from './screens/editor.js';
import { islandScreen } from './screens/island.js';
import { loadHairLibrary } from './mii/hair.js';

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

// Miis need the hairstyles, so load them before the first screen.
loadHairLibrary().then(
  () => app.go({ '#mii': 'plaza', '#eiland': 'island' }[location.hash] ?? 'menu'),
  (err) => {
    root.textContent = 'De kapsels konden niet worden geladen.';
    console.error(err);
  },
);
