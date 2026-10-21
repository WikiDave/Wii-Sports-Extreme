// Buying a business, putting dirty cash through it, and upgrading it. Pure logic on a Game.

import { BUSINESSES, MAX_LEVEL } from './data.js';
import { wState, bizOf, newBiz, rollBiz, dirtyHand, mail } from './store.js';
import { capacityLeft, safeLeft, cover, feeRate, upgradeCost, isOpen } from './rules.js';
import { quiet, takeDirty } from './ledger.js';
import { pay } from './money.js';
import { RANKS } from '../state.js';

const fail = (reason) => ({ ok: false, reason });

export function buyBusiness(game, id) {
  const d = BUSINESSES[id];
  const w = wState(game);
  if (!d) return fail('Onbekend bedrijf.');
  if (w.biz[id]) return fail('Dit bedrijf is al van jou.');
  if (game.rank < d.rank) return fail(`Pas vanaf rang ${RANKS[d.rank]}.`);
  if (!pay(game, d.price)) return fail(`Je hebt €${d.price.toLocaleString('nl-NL')} nodig (contant en op de bank samen).`);
  w.biz[id] = newBiz(game.state.day);
  game.addXp(40);
  mail(game, 'bedrijf', `${d.short} is van jou`, `Gefeliciteerd met je nieuwe zaak. Elke ochtend maken we de winst over naar je bankrekening. Spoel je zwarte geld er met mate doorheen: boven de dekking van €${cover(id, w.biz[id])} per dag gaat de Fiscus meekijken.`);
  game.emit('witwassen:gekocht', { id });
  game.emit('change');
  return { ok: true };
}

/** Most dirty euros you could put through business `id` right now. */
export function maxWash(game, id) {
  const b = bizOf(game, id);
  if (!b || !isOpen(b, game.state.day)) return 0;
  return Math.min(dirtyHand(game), capacityLeft(id, b, game.state.day));
}

/** Most dirty euros you could wash without going over what the books can explain. */
export function safeWash(game, id) {
  const b = bizOf(game, id);
  if (!b || !isOpen(b, game.state.day)) return 0;
  return Math.min(dirtyHand(game), safeLeft(id, b, game.state.day));
}

/** Previews a wash: what you hand over, what the business keeps, what reaches your bank account. */
export function previewWash(id, b, amount) {
  const fee = Math.round(amount * feeRate(id, b));
  return { amount, fee, out: amount - fee };
}

/**
 * Puts `amount` of dirty cash through business `id`: the business keeps its fee and wires the rest
 * (clean) to your bank account. Returns { ok, amount, fee, out, risky } or { ok: false, reason }.
 */
export function launder(game, id, amount) {
  const s = game.state;
  const b = bizOf(game, id);
  if (!b) return fail('Dit bedrijf is nog niet van jou.');
  rollBiz(b, s.day);
  if (!isOpen(b, s.day)) return fail('Vandaag gesloten: de lonen zijn niet betaald.');
  amount = Math.floor(amount);
  if (!(amount > 0)) return fail('Kies een bedrag.');
  if (amount > dirtyHand(game)) return fail('Zoveel zwart geld heb je niet bij je.');
  const room = capacityLeft(id, b, s.day);
  if (amount > room) return fail(room > 0 ? `Dit bedrijf kan vandaag nog maar €${room} aan.` : 'Dit bedrijf zit vandaag vol. Kom morgen terug.');
  const fee = Math.round(amount * feeRate(id, b));
  const out = amount - fee;
  const w = wState(game);
  quiet(game, () => {
    takeDirty(game, amount);
    s.cash -= amount;
    s.bank += out;
    b.in += amount;
    w.stats.washed += amount;
    w.stats.fees += fee;
    game.emit('change');
  });
  game.addXp(Math.ceil(out / 40));
  const risky = b.in > cover(id, b);
  game.emit('witwassen:gewassen', { id, amount, fee, out, risky });
  return { ok: true, amount, fee, out, risky };
}

/** Buys the next level of an upgrade ('cap' | 'fee' | 'books'). */
export function upgrade(game, id, kind) {
  const b = bizOf(game, id);
  if (!b) return fail('Dit bedrijf is nog niet van jou.');
  const level = b.up[kind];
  const cost = upgradeCost(id, kind, level);
  if (cost == null || level >= MAX_LEVEL) return fail('Dit is al het hoogste niveau.');
  if (!pay(game, cost)) return fail(`Je hebt €${cost.toLocaleString('nl-NL')} nodig.`);
  b.up[kind] = level + 1;
  game.addXp(15 * (level + 1));
  game.emit('witwassen:upgrade', { id, kind, level: level + 1 });
  game.emit('change');
  return { ok: true, level: level + 1, cost };
}
