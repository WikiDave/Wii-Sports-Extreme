// Feature "panden": the places you own. The Kantoor sells them; each one is built in the world
// (panden/view.js) with a chest (storage), a bed (sleep), an entrance (its menu), machines (stations)
// and upgrades: security, storage, production speed, comfort and decoration with a wall paint.
// Save data: state.ext.panden (panden/save.js). Other features read: raidFactor(state, id) from
// panden/upgrades.js (politie), speedFor(state, slot) (stations.js), storageOf (economy, empire),
// and stockCount / chestOf (panden/chest.js). Listens to game events 'change' and 'time'.
// Exposes ctx.panden = the Properties view (for tests).

import { Properties } from '../panden/view.js';
import { STYLE } from '../panden/styles.js';
import { openPropertyMenu } from '../ui/propertyMenu.js';
import { openChest } from '../ui/chestMenu.js';
import { askSleep } from '../ui/sleepUi.js';

export default {
  id: 'panden',
  install(ctx) {
    ctx.addStyle(STYLE);
    const world = new Properties(ctx, {
      openProperty: (id) => openPropertyMenu(ctx.game, id),
      openChest: (id) => openChest(ctx.game, id),
      askSleep: (id) => askSleep(ctx.game, id),
    });
    ctx.panden = world;
    const offs = [ctx.game.on('change', () => world.sync()), ctx.game.on('time', () => world.showMachines())];
    return {
      update(t, dt) {
        world.update(t, dt);
      },
      dispose() {
        offs.forEach((off) => off());
        world.dispose();
        ctx.panden = null;
      },
    };
  },
};
