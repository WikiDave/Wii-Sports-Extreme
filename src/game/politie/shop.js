// The police contact and the disguise. Pure logic: money in, heat or a daily effect out.
//
// Bribe (smeren): once a day, agent Bram takes an envelope and the heat drops by 1.2. One time in
// three he calls his colleagues instead: money gone and the heat rises. Disguise (vermomming): a cap
// and sunglasses for the day; the guards see you at 60% of the distance and suspect you half as fast.

import { addHeat, heatLevel } from '../police.js';
import { logEvent, pol } from './state.js';

export const BRIBE_BASE = 80;
export const BRIBE_PER_LEVEL = 60;
export const BRIBE_DROP = 1.2;
export const BRIBE_FAIL = 1 / 3;
export const BRIBE_FAIL_HEAT = 0.6;
export const DISGUISE_PRICE = 60;
export const DISGUISE_VIEW = 0.6;

export const bribeCost = (level) => BRIBE_BASE + BRIBE_PER_LEVEL * level;

/** Why a bribe is not possible now (vandaag, rustig, geld), or null when it is. */
export function bribeBlocked(state) {
  if (pol(state).bribedDay === state.day) return 'vandaag';
  if (state.heat < 0.5) return 'rustig';
  if (state.cash < bribeCost(heatLevel(state))) return 'geld';
  return null;
}

/** Pays agent Bram. rand is injectable. Returns { ok, cost, text, failed?, blocked? }. */
export function bribeCop(game, rand = Math.random) {
  const s = game.state;
  const blocked = bribeBlocked(s);
  if (blocked) return { ok: false, cost: 0, blocked };
  const cost = bribeCost(heatLevel(s));
  game.addCash(-cost);
  pol(s).bribedDay = s.day;
  if (rand() < BRIBE_FAIL) {
    addHeat(game, BRIBE_FAIL_HEAT);
    const text = 'Agent Bram telde het geld, belde zijn collega\'s en zei: "Dit was een test."';
    logEvent(s, 'smeergeld', `Smeergeld mislukt (€${cost}). Je meter ging omhoog.`);
    return { ok: false, cost, text, failed: true };
  }
  addHeat(game, -BRIBE_DROP);
  const text = 'Agent Bram stopt de envelop weg. "Ik heb u niet gezien."';
  logEvent(s, 'smeergeld', `Agent Bram gesmeerd voor €${cost}. Je meter zakte.`);
  return { ok: true, cost, text };
}

export const isDisguised = (state) => (state.ext?.politie?.disguiseDay ?? 0) === state.day;

/** Buys the disguise for today. Returns { ok, reason? } (reason: al, geld). */
export function buyDisguise(game) {
  const s = game.state;
  if (isDisguised(s)) return { ok: false, reason: 'al' };
  if (!game.addCash(-DISGUISE_PRICE)) return { ok: false, reason: 'geld' };
  pol(s).disguiseDay = s.day;
  logEvent(s, 'vermomming', `Vermomming gekocht (€${DISGUISE_PRICE}). Geldt vandaag.`);
  game.emit('change');
  return { ok: true };
}
