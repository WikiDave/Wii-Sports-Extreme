// Save data of the vehicles: game.state.ext.voertuigen = { list, n, riding, schat }.
// A vehicle is { id, type, x, z, h, fuel, cargo: { itemKey: n }, rent }: rent is 0 for a vehicle
// you own, or the day you rented it (it goes back to the garage at the next morning).
// Cargo is stock in the back: it is not in your pockets (inventory), so guards never see it.
// Pure logic on the Game (tested with Node). The world (driver.js) follows this list.

import { RANKS } from '../state.js';
import { VEHICLES, CHEST_CASH, CHEST_XP } from './data.js';
import { fill, fillCost, usesFuel } from './fuel.js';

/** The voertuigen save block, created on first use. */
export function store(game) {
  const s = game.state;
  s.ext ??= {};
  const e = (s.ext.voertuigen ??= {});
  e.list ??= [];
  e.n ??= 0;
  e.riding ??= null;
  e.schat ??= false;
  return e;
}

export const list = (game) => store(game).list;
export const find = (game, id) => list(game).find((v) => v.id === id) ?? null;
export const ofType = (game, type) => list(game).find((v) => v.type === type) ?? null;
export const cargoUnits = (v) => Object.values(v.cargo ?? {}).reduce((a, n) => a + n, 0);
export const cargoRoom = (v) => VEHICLES[v.type].cargo - cargoUnits(v);

/** Gives the stock in the back back to your pockets (it is not lost when a rental goes back). */
function unpack(game, v) {
  for (const [key, n] of Object.entries(v.cargo ?? {})) game.addItem(key, n);
  v.cargo = {};
}

/**
 * Buys (or with rent = true rents) a vehicle of this type at pos = { x, z, h }. Returns
 * { ok, msg, v }. One of each type at a time: owned or rented.
 */
export function acquire(game, type, pos, { rent = false } = {}) {
  const spec = VEHICLES[type];
  if (!spec) return { ok: false, msg: 'Dat voertuig bestaat niet.' };
  if (game.rank < spec.rank) return { ok: false, msg: `${spec.name} is vanaf rang ${RANKS[spec.rank]}.` };
  if (ofType(game, type)) return { ok: false, msg: `Je hebt al een ${spec.name.toLowerCase()}${ofType(game, type).rent ? ' (gehuurd)' : ''}.` };
  const price = rent ? spec.rent : spec.price;
  if (!game.addCash(-price)) return { ok: false, msg: 'Dat kun je niet betalen.' };
  const e = store(game);
  const v = { id: `v${++e.n}`, type, x: pos.x, z: pos.z, h: pos.h ?? 0, speed: 0, wheel: 0, fuel: spec.fuelMax, cargo: {}, rent: rent ? game.state.day : 0 };
  e.list.push(v);
  return { ok: true, v, msg: rent ? `${spec.name} gehuurd tot morgenochtend.` : `${spec.name} is van jou.` };
}

/** Hands a rented vehicle back (its stock comes home). Owned vehicles stay. */
export function giveBack(game, id) {
  const e = store(game);
  const v = find(game, id);
  if (!v) return { ok: false, msg: 'Dat voertuig is er niet.' };
  if (!v.rent) return { ok: false, msg: 'Je eigen voertuig geef je niet terug.' };
  unpack(game, v);
  e.list.splice(e.list.indexOf(v), 1);
  if (e.riding === id) e.riding = null;
  return { ok: true, msg: `${VEHICLES[v.type].name} is ingeleverd.` };
}

/** Every morning the rentals of yesterday go back to the garage. Returns the vehicles that went. */
export function expireRentals(game) {
  const e = store(game);
  const gone = [];
  for (let i = e.list.length - 1; i >= 0; i--) {
    const v = e.list[i];
    if (!v.rent || v.rent >= game.state.day) continue;
    unpack(game, v);
    e.list.splice(i, 1);
    if (e.riding === v.id) e.riding = null;
    gone.push(v);
  }
  return gone;
}

/** Moves up to n units of inventory item `key` into the vehicle's back. Returns how many went. */
export function loadCargo(game, id, key, n) {
  const v = find(game, id);
  if (!v) return 0;
  const k = Math.max(0, Math.min(n, game.state.inventory[key] ?? 0, cargoRoom(v)));
  if (!k) return 0;
  game.addItem(key, -k);
  v.cargo[key] = (v.cargo[key] ?? 0) + k;
  return k;
}

/** Moves up to n units of `key` from the back into your pockets. Returns how many came out. */
export function unloadCargo(game, id, key, n) {
  const v = find(game, id);
  if (!v) return 0;
  const k = Math.max(0, Math.min(n, v.cargo[key] ?? 0));
  if (!k) return 0;
  game.addItem(key, k);
  if (v.cargo[key] === k) delete v.cargo[key];
  else v.cargo[key] -= k;
  return k;
}

/** Fills the tank of a vehicle at the pump. Returns { ok, msg }. */
export function refuel(game, id) {
  const v = find(game, id);
  if (!v) return { ok: false, msg: 'Dat voertuig is er niet.' };
  const spec = VEHICLES[v.type];
  if (!usesFuel(spec)) return { ok: false, msg: `Een ${spec.name.toLowerCase()} heeft geen benzine nodig.` };
  const cost = fillCost(spec, v.fuel);
  if (!cost) return { ok: false, msg: 'De tank is al vol.' };
  if (!game.addCash(-cost)) return { ok: false, msg: `Vol tanken kost €${cost}.` };
  fill(v, spec);
  return { ok: true, msg: `Vol getankt voor €${cost}.` };
}

/** The treasure crate on the hidden beach: once per game. Returns the reward, or null. */
export function openChest(game) {
  const e = store(game);
  if (e.schat) return null;
  e.schat = true;
  game.addCash(CHEST_CASH);
  game.addXp(CHEST_XP);
  return { cash: CHEST_CASH, xp: CHEST_XP };
}
