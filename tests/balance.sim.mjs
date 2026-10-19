// Not a test: simulates a plain player for some days and prints money and rank, to check
// the balance. Run: node tests/balance.sim.mjs
import { Game, RANKS } from '../src/game/state.js';
import { PRODUCTS } from '../src/game/data/products.js';
import { buy, makeBatch, recipeEffects, unitPrice, sell, canMake } from '../src/game/economy.js';
import { CUSTOMERS } from '../src/game/data/customers.js';
import { available, deal } from '../src/game/customers.js';
import { buyProperty, hire, dailyWork, stockFree } from '../src/game/empire.js';
import { priceFactor } from '../src/game/weather.js';

const g = new Game(null);
const MIX = { limonade: ['suiker', 'munt'], snoep: ['munt', 'kokos'], ijs: ['citroenrasp', 'kokos'] };
const BATCHES_PER_DAY = 4; // a player makes about this many by hand in a 22-minute day
for (let day = 1; day <= 15; day++) {
  g.state.day = day;
  const st = g.state;
  if (day > 1) dailyWork(g);
  // Best unlocked product.
  const prod = Object.entries(PRODUCTS).filter(([, p]) => p.rank <= g.rank).sort((a, b) => b[1].base - a[1].base)[0][0];
  for (let b = 0; b < BATCHES_PER_DAY; b++) {
    for (const [id, n] of Object.entries(PRODUCTS[prod].needs)) while ((st.inventory[id] ?? 0) < n && buy(g, id, 1));
    for (const i of MIX[prod]) if (!(st.inventory[i] > 0)) buy(g, i, 1);
    if (!makeBatch(g, prod, MIX[prod], 1.0)) break;
  }
  let earned = 0;
  for (const c of available(st, g.rank, 14).concat(available(st, g.rank, 20))) {
    const key = Object.keys(st.inventory).find((k) => k.startsWith('p:'));
    if (!key) break;
    const r = deal(g, c, key, 3, 'eerlijk', priceFactor(day));
    earned += r.money;
  }
  let stand = 0;
  for (const key of Object.keys(st.inventory).filter((k) => k.startsWith('p:'))) {
    const k = Math.min(st.inventory[key], 8 - stand);
    if (k > 0) { earned += sell(g, key, k, 0.5); stand += k; }
  }
  // Grow: staff and property when affordable.
  if (st.cash > 300 && !st.staff.includes('tuinier') && prod === 'limonade') hire(g, 'tuinier');
  if (g.rank >= 2 && st.cash > 3000) buyProperty(g, 'loods');
  if (st.properties.includes('loods') && st.cash > 400) for (const s of ['kok', 'verkoper', 'inpakker']) hire(g, s);
  console.log(`dag ${String(day).padStart(2)}  ${prod.padEnd(8)} verdiend €${String(earned).padStart(5)}  cash €${String(st.cash).padStart(6)}  xp ${String(st.xp).padStart(5)}  ${RANKS[g.rank]}  staff ${st.staff.join(',')}`);
}
