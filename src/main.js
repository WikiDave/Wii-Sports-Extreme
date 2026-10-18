// Starts the app and switches between screens.

import { menuScreen } from './screens/menu.js';
import { plazaScreen } from './screens/plaza.js';
import { editorScreen } from './screens/editor.js';

const SCREENS = { menu: menuScreen, plaza: plazaScreen, editor: editorScreen };
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

app.go(location.hash === '#mii' ? 'plaza' : 'menu');
