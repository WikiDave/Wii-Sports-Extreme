// Feature "klanten" (6.4): customers with lives.
//
// 28 customers (data/customers.js), each with a type, a voice, likes and a dislike, patience,
// discretion and a day of their own: they walk between places along the footpaths, position =
// f(game clock) (klanten/timeline.js). world/customerView.js shows the nearest few as Miis
// (pool of 8), this feature adds what makes them alive:
//   - the real island under them: each customer's house door, the hotel terrace (klanten/layout.js)
//   - speech bubbles and name tags above their heads (klanten/bubbles.js)
//   - introductions: when a friend's trust or your rank opens a new contact there is a message
//     from the newcomer and a toast; trust that fades; the weather keeping people at home
//   - the styles of the deal menu and the contacts page of the phone
//
// Save data: everything lives in state.customers[id] (loyalty, deals, spent, strikes, boycott, ...),
// see customers.js record(); no state.ext needed.
// Game events it emits: 'klanten:say' { customer, text } (a bubble over their head), 'klanten:tier'
// { customer, tier } (a new level of trust), 'klanten:refused' { customer, retry, boycott, tipOff },
// 'klanten:verklikt' { customer } (they told the guards), 'klanten:nieuw' { customer, by } (introduced).

import { STYLES } from '../klanten/styles.js';
import { Bubbles } from '../klanten/bubbles.js';
import { resolveLayout } from '../klanten/layout.js';
import { CUSTOMERS } from '../data/customers.js';
import { introduce, dailyUpdate, customerById } from '../customers.js';
import { introMessage } from '../phone.js';
import { staysHome, dayInfo, WEATHER } from '../weather.js';

/** Houses of the island: { x, z, r, zone } (the hotel is not one of them), and the hotel. */
function housesOf(ctx) {
  const colliders = ctx.props.colliders;
  const hotel = colliders.find((c) => c.hotel) ?? null;
  const houses = [];
  for (const o of ctx.props.group.children) {
    if (!o.userData.house) continue;
    const { x, z } = o.position;
    if (hotel && Math.hypot(x - hotel.x, z - hotel.z) < 1) continue;
    const c = colliders.find((q) => Math.abs(q.x - x) < 0.01 && Math.abs(q.z - z) < 0.01);
    houses.push({ x, z, r: c?.r ?? 6, zone: ctx.zoneAt(x, z) });
  }
  return { houses, hotel };
}

export default {
  id: 'klanten',
  install(ctx) {
    const { game, customers, camera, screen, h, toast } = ctx;
    ctx.addStyle(STYLES);

    // The real island: front doors, the hotel terrace; spots keep out of palms, rocks and houses.
    const { houses, hotel } = housesOf(ctx);
    const colliders = ctx.props.colliders;
    const layout = resolveLayout({ houses, hotel, colliders, graph: customers.world.graph, places: customers.world.places, customers: CUSTOMERS });
    customers.configure({ homes: layout.homes, places: layout.places, colliders, isLand: (x, z) => ctx.heightAt(x, z) > 0.25 });

    const bubbles = new Bubbles(screen, camera, h);
    customers.bubbles = bubbles;
    const timers = [];

    // New contacts: a friend's trust, your rank or word getting around opens them up.
    const announce = (silent = false) => {
      const fresh = introduce(game).filter((x) => !x.start);
      if (silent || !fresh.length) return;
      for (const x of fresh) {
        introMessage(game, x.customer);
        game.emit('klanten:nieuw', { customer: x.customer, by: x.by });
      }
      const names = fresh.map((x) => customerById(x.customer).name);
      const by = fresh.length === 1 && fresh[0].by ? `, voorgesteld door ${customerById(fresh[0].by).name}` : '';
      toast(`📱 Nieuw contact: ${names.join(' en ')}${by}`);
    };
    announce(true);

    const offs = [
      game.on('change', () => announce()),
      game.on('newday', () => {
        dailyUpdate(game);
        // Bad weather keeps some people home: tell the player where to knock.
        const home = CUSTOMERS.filter((c) => customers.entries.find((e) => e.c === c)?.known && staysHome(game.state.day, c.id)).map((c) => c.name);
        if (home.length && dayInfo(game.state.day).weather !== 'zon') {
          timers.push(setTimeout(() => toast(`${WEATHER[dayInfo(game.state.day).weather].icon} ${home.slice(0, 2).join(' en ')}${home.length > 2 ? ` en ${home.length - 2} anderen` : ''} blijf${home.length > 1 ? 'ven' : 't'} thuis. Klop aan bij de deur!`), 7600));
        }
      }),
      game.on('klanten:say', ({ customer, text }) => {
        const c = customerById(customer);
        if (c && text) bubbles.say(customer, c.name, text);
      }),
      game.on('klanten:tier', () => ctx.audio?.play('rank')),
      game.on('klanten:verklikt', ({ customer }) => {
        toast(`🚨 ${customerById(customer)?.name ?? 'Een klant'} heeft je verklikt bij de bewaking!`);
        ctx.audio?.play('alert');
      }),
    ];

    return {
      update(t, dt, paused) {
        bubbles.update(dt, (id, out) => customers.anchor(id, out), paused);
      },
      dispose() {
        offs.forEach((off) => off());
        timers.forEach(clearTimeout);
        customers.bubbles = null;
        bubbles.dispose();
      },
    };
  },
};
