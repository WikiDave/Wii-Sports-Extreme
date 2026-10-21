// Fuel for the scooter, the golf cart and the motor boat: burning it while moving, filling it at
// the harbour pump, and the slow push when the tank is empty. Pure functions.

import { FUEL_PRICE } from './data.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Whether this vehicle has an engine that uses fuel at all. */
export const usesFuel = (spec) => spec.fuelMax > 0;

/** Empty tank (an engine vehicle with no litres left). */
export const isEmpty = (spec, fuel) => usesFuel(spec) && fuel <= 0.01;

/** Share of the tank left, 0..1 (1 for vehicles without fuel, so the gauge is full). */
export const fuelShare = (spec, fuel) => (usesFuel(spec) ? clamp(fuel / spec.fuelMax, 0, 1) : 1);

/** Euros to fill the tank up from `fuel` litres (whole euros, rounded up). */
export const fillCost = (spec, fuel) => (usesFuel(spec) ? Math.ceil(Math.max(0, spec.fuelMax - fuel) * FUEL_PRICE) : 0);

/** Burns fuel for one step: a little at idle-ish speed, the full rate at top speed. Mutates v. */
export function burnStep(v, spec, dt) {
  if (!usesFuel(spec) || v.fuel <= 0 || Math.abs(v.speed) < 0.05) return;
  const load = clamp(Math.abs(v.speed) / spec.maxSpeed, 0.15, 1);
  v.fuel = Math.max(0, v.fuel - spec.fuelUse * load * dt);
}

/** Fills the tank of record v. Returns the euros it costs (the caller takes the money). */
export function fill(v, spec) {
  const cost = fillCost(spec, v.fuel);
  if (usesFuel(spec)) v.fuel = spec.fuelMax;
  return cost;
}
