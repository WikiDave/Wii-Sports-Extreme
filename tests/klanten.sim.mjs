// Not a test: simulates a careful player for 20 days, to check what the customers do to the
// economy. Per day the player makes 4 batches of the unlocked products, visits the VISITS best
// customers who are out (the island is big: nobody reaches everybody) and sells each of them the
// item they can afford and value most. Compare with the old five customers by running the same
// script on the old data. Run: node tests/klanten.sim.mjs   (VISITS=4 node ... for a lazy player)
import { Game, RANKS } from '../src/game/state.js';
import { PRODUCTS } from '../src/game/data/products.js';
import { buy, makeBatch, sell } from '../src/game/economy.js';
import { CUSTOMERS } from '../src/game/data/customers.js';
import { available, deal, valueFor, isUnlocked } from '../src/game/customers.js';
import { buyProperty, hire, dailyWork } from '../src/game/empire.js';
import { collect } from '../src/game/stations.js';
import { priceFactor } from '../src/game/weather.js';

const VISITS = Number(process.env.VISITS ?? 6);
const DAYS = Number(process.env.DAYS ?? 20);
const g = new Game(null);
const MIX = { limonade: ['suiker', 'munt'], snoep: ['munt', 'kokos'], ijs: ['citroenrasp', 'kokos'] };
let totalUnits = 0;
const rows = [];
for (let day = 1; day <= DAYS; day++) {
  g.state.day = day;
  const st = g.state;
  collect(g); // the cook's batches of yesterday are done: the player picks them up
  if (day > 1) dailyWork(g);
  // Make what is running out (under 8 units of a product), at most 4 batches a day.
  const unlocked = Object.keys(PRODUCTS).filter((p) => PRODUCTS[p].rank <= g.rank);
  const have = (p) => Object.entries(st.inventory).filter(([k]) => k.startsWith(`p:${p}:`)).reduce((n, [, v]) => n + v, 0);
  const batches = unlocked.filter((p) => have(p) < 8);
  for (const prod of batches.slice(0, 4)) {
    for (const [id, n] of Object.entries(PRODUCTS[prod].needs)) while ((st.inventory[id] ?? 0) < n && buy(g, id, 1));
    for (const i of MIX[prod]) if (!(st.inventory[i] > 0)) buy(g, i, 1);
    if (!makeBatch(g, prod, MIX[prod], 1.0)) break;
  }
  let earned = 0;
  let served = 0;
  const seen = new Set();
  const list = available(st, g.rank, 14).concat(available(st, g.rank, 20)).filter((c) => !seen.has(c.id) && seen.add(c.id));
  const best = (c) => {
    let top = null;
    for (const key of Object.keys(st.inventory).filter((k) => k.startsWith('p:'))) {
      const v = valueFor(c, key);
      const n = Math.min(3, st.inventory[key], Math.floor(c.budget / Math.max(1, v)));
      if (n >= 1 && (!top || v * n > top.v * top.n)) top = { key, v, n };
    }
    return top;
  };
  const ranked = list.map((c) => ({ c, top: best(c) })).filter((x) => x.top).sort((a, b) => b.top.v * b.top.n - a.top.v * a.top.n).slice(0, VISITS);
  for (const { c, top } of ranked) {
    const r = deal(g, c, top.key, 3, 'eerlijk', priceFactor(day));
    earned += r.money + (r.tip ?? 0);
    totalUnits += r.sold;
    if (r.ok) served++;
  }
  let stand = 0;
  for (const key of Object.keys(st.inventory).filter((k) => k.startsWith('p:'))) {
    const k = Math.min(st.inventory[key], 8 - stand);
    if (k > 0) { earned += sell(g, key, k, 0.5); stand += k; }
  }
  if (g.rank >= 2 && st.cash > 3000) buyProperty(g, 'loods');
  if (st.properties.includes('loods') && st.cash > 400) for (const s of ['kok', 'verkoper', 'inpakker']) hire(g, s);
  const known = CUSTOMERS.filter((c) => isUnlocked(st, c, g.rank)).length;
  rows.push(`dag ${String(day).padStart(2)}  verdiend €${String(earned).padStart(5)}  klanten ${served}/${list.length} (${known} bekend)  cash €${String(st.cash).padStart(6)}  xp ${String(st.xp).padStart(5)}  ${RANKS[g.rank]}`);
}
console.log(rows.join('\n'));
console.log(`${totalUnits} stuks aan klanten verkocht, ${CUSTOMERS.length} klanten, ${VISITS} bezoeken per dag`);
