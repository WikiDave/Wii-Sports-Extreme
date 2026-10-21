// Feature "witwassen" (6.6): the money laundering layer. The forbidden snacks bring DIRTY cash
// (zwart geld); it goes through a business (the fee is the price of washing it) or the harbour ATM
// and comes out clean on the bank. Every business has a daily capacity and a cover (what its books
// can explain); washing above it makes the taxman, De Fiscus, look closer. A visit is an event: an
// inspector stands at the business for two hours; talk to him (books, or coffee money) or he settles
// the books without you. Carrying a lot of dirty cash makes the guards frown.
//
// Save data: state.ext.witwassen (see src/game/witwassen/store.js). Phone app: "Zaken".
// Game events it emits (on game.emit): 'witwassen:gekocht' { id }, 'witwassen:gewassen' { id, amount,
// fee, out, risky }, 'witwassen:upgrade' { id, kind, level }, 'witwassen:audit' { result },
// 'witwassen:limiet' { amount, over, via, left } (the bank turned dirty money away), 'witwassen:mail'.
// Game events it listens to: change, newday (settles the businesses and plans the visits).

import { track } from '../witwassen/ledger.js';
import { wState, dirtyHand } from '../witwassen/store.js';
import { onNewDay } from '../witwassen/daily.js';
import { auditPhase, resolveAudit } from '../witwassen/audit.js';
import { visitEvents, inspectorHere } from '../witwassen/visit.js';
import { carryHeat, carryLimit } from '../witwassen/carry.js';
import { WitWorld } from '../witwassen/world.js';
import { openBusiness, openBuy, openAtm, openAudit } from '../witwassen/menus.js';
import { zakenApp } from '../witwassen/zaken.js';
import { addDirtyChip } from '../witwassen/hud.js';
import { STYLES } from '../witwassen/styles.js';
import { BUSINESSES, INSPECTORS } from '../witwassen/data.js';
import { addHeat, heatLevel } from '../police.js';
import { registerApp, unregisterApp } from '../phoneApps.js';

const eur = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
const HUT_RADIUS = 7;
const WARN_EVERY_MS = 60000;

export default {
  id: 'witwassen',
  install(ctx) {
    const { game, toast } = ctx;
    const stopLedger = track(game);
    ctx.addStyle(STYLES);
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));

    const world = new WitWorld(ctx, {
      business: (id) => openBusiness(game, id, () => world.refresh()),
      buy: (id) => openBuy(game, id, () => world.refresh()),
      atm: () => openAtm(game),
      audit: () => openAudit(game),
    });
    const chip = addDirtyChip(ctx.hudBar, game);
    registerApp(zakenApp);

    let prevPhase = auditPhase(wState(game).audit, game.state.day, game.state.minutes);
    let lastWarn = -Infinity;

    /** The inspector arrives: a toast and a sound; the visit stays open until you talk to him. */
    const begin = () => {
      const a = wState(game).audit;
      if (!a) return;
      toast(`🏛️ ${INSPECTORS[a.who % INSPECTORS.length].name} van de Fiscus staat bij ${BUSINESSES[a.id].short}. Ga praten!`);
      ctx.audio?.play('alert');
    };
    /** Two hours passed and you never talked to him: the books are settled without you. */
    const absent = () => {
      const r = resolveAudit(game, { present: false });
      if (!r) return;
      toast(`🏛️ De Fiscus is weg. Je was er niet bij${r.fine ? `: boete ${eur(r.fine)}` : ''}. Zie de brief in de app Zaken.`);
      ctx.audio?.play(r.fine ? 'alert' : 'click');
    };

    const offs = [
      game.on('change', () => world.refresh()),
      game.on('newday', () => {
        const { profit, taxman } = onNewDay(game);
        if (profit.length) later(3600, () => toast(`🧾 Winst van gisteren: ${profit.join(' · ')}`));
        taxman.forEach((line, i) => later(6400 + i * 2600, () => toast(`🏛️ ${line}`)));
      }),
      game.on('witwassen:limiet', (e) => {
        if (e?.via === 'phone') toast('De bank neemt vandaag geen ongewassen geld meer aan. Was het eerst, of ga naar de pinautomaat.');
      }),
    ];

    return {
      update(t, dt, paused) {
        if (paused) return;
        world.update(t, dt, paused);
        const w = wState(game);
        const day = game.state.day;
        const phase = auditPhase(w.audit, day, game.state.minutes);
        for (const ev of visitEvents(prevPhase, phase, !!w.audit)) {
          if (ev === 'begin') begin();
          else if (ev === 'absent') absent();
        }
        prevPhase = phase;
        const here = inspectorHere(phase, !!w.audit);
        world.setInspector(here ? w.audit.id : null, w.audit?.who ?? 0);

        // Dirty cash in your pockets draws looks from the guards, but not in the hut.
        const p = ctx.player.pos;
        const hut = ctx.hutPos;
        const hidden = Math.hypot(p.x - hut.x, p.z - hut.z) < HUT_RADIUS;
        const dirty = dirtyHand(game);
        // Only a heavy load is worth a look at the guards (most frames stop here).
        const heavy = dirty >= carryLimit(game.rank);
        const seen = heavy && !hidden && ctx.guards.sees(p);
        const add = carryHeat(dirty, game.rank, heatLevel(game.state), seen, dt);
        if (add > 0) {
          addHeat(game, add, true); // quiet: only a change of level is announced
          if (performance.now() - lastWarn > WARN_EVERY_MS) {
            lastWarn = performance.now();
            toast('Een bewaker kijkt naar je bolle zakken. Was je geld of zet het op de bank.');
          }
        }
      },
      dispose() {
        stopLedger();
        offs.forEach((off) => off());
        timers.forEach(clearTimeout);
        unregisterApp(zakenApp.id);
        chip.remove();
        world.dispose();
      },
    };
  },
};
