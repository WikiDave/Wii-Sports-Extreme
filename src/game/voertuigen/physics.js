// Arcade driving as pure functions (no three.js, no DOM: tested in tests/voertuigen.test.mjs).
//
// A vehicle record is { x, z, h, speed, wheel, fuel }: metres, heading in radians (0 = +z, the way
// the Mii faces), m/s, the steering wheel -1..1 (for the picture), litres. `spec` is its entry in
// data.js. `world` is { height(x, z), colliders, skip, extra }: the ground height (decks
// included), the round obstacles ({x, z, r}; `skip` is the vehicle's own collider) and extra
// obstacles that only boats feel (jetty sides). `ctl` is { throttle -1..1, steer -1..1, brake }.

import { burnStep } from './fuel.js';

/** A land vehicle stops at the water's edge (shallow water is the most it drives in). */
export const LAND_MIN = -0.3;
/** A boat stops at the beach: it needs this much water under it. */
export const WATER_MAX = -0.45;
/** Metres from the island's centre; the open sea ends there (boats turn round). */
export const SEA_LIMIT = 1000;
/** Largest physics step in seconds, so a fast boat cannot skip over an obstacle. */
export const SUB = 1 / 60;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Whether ground at height h is drivable for this kind of vehicle. */
export function terrainOk(kind, h) {
  return kind === 'water' ? h <= WATER_MAX : h >= LAND_MIN;
}

/** Whether a vehicle of this spec may be at (x, z) on this world (terrain and the sea's edge). */
export function allowedAt(spec, world, x, z) {
  return terrainOk(spec.kind, world.height(x, z)) && x * x + z * z <= SEA_LIMIT * SEA_LIMIT;
}

/** Forward slope ahead of the vehicle, rise over run (positive is uphill). */
export function gradeAhead(v, world, run = 1.2) {
  const here = world.height(v.x, v.z);
  return (world.height(v.x + Math.sin(v.h) * run, v.z + Math.cos(v.h) * run) - here) / run;
}

/**
 * Pushes a circle of radius R out of the round obstacles. Returns { x, z, hit, nx, nz }: the new
 * centre and the normal of the last obstacle that was touched.
 */
export function pushOut(x, z, R, obstacles, skip = null) {
  let hit = false;
  let nx = 0;
  let nz = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of obstacles) {
      if (c === skip) continue;
      const dx = x - c.x;
      const dz = z - c.z;
      const min = c.r + R;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2);
      nx = d > 1e-9 ? dx / d : 1;
      nz = d > 1e-9 ? dz / d : 0;
      x = c.x + nx * min;
      z = c.z + nz * min;
      hit = true;
    }
  }
  return { x, z, hit, nx, nz };
}

/**
 * One physics step of dt seconds (dt should be at most SUB; use drive() for longer). Mutates v.
 * Returns { hit (0 or 1), impact (m/s lost to a wall), grade (slope ahead) }.
 */
export function driveStep(v, spec, ctl, dt, world) {
  const land = spec.kind === 'land';
  const grade = land ? gradeAhead(v, world) : 0;
  const fuelOk = !spec.fuelMax || v.fuel > 0;
  const throttle = clamp(ctl.throttle || 0, -1, 1);

  // Speed: move towards a target at the accel or brake rate. Uphill the top speed is lower.
  const slow = land ? clamp(1 - 2.2 * Math.max(0, grade), 0.3, 1) : 1;
  const top = (fuelOk ? spec.maxSpeed : spec.pushSpeed) * slow;
  let target = 0;
  let rate = spec.coast;
  if (throttle > 0.05) {
    target = throttle * top;
    rate = v.speed >= 0 ? spec.accel : spec.brake;
  } else if (throttle < -0.05) {
    target = throttle * spec.reverse;
    rate = v.speed <= 0 ? spec.accel * 0.5 : spec.brake;
  }
  if (ctl.brake) {
    target = 0;
    rate = spec.brake * 1.5;
  }
  const change = rate * dt;
  v.speed += clamp(target - v.speed, -change, change);

  // Steering: a car needs to roll to turn, and turns less at top speed. Reverse steers the other way.
  const s = clamp(ctl.steer || 0, -1, 1);
  v.wheel = (v.wheel ?? 0) + (s - (v.wheel ?? 0)) * Math.min(1, dt * 8);
  const sp = Math.abs(v.speed);
  const authority = land ? clamp(sp / 2.2, 0, 1) : clamp(0.35 + sp / 1.2, 0, 1);
  const sens = land ? 1 - 0.35 * clamp(sp / spec.maxSpeed, 0, 1) : 1;
  const dir = v.speed < -0.05 ? -1 : 1;
  v.h = wrap(v.h + s * spec.turn * authority * sens * dir * dt);

  // Movement: the shore (terrain) first, the round obstacles second.
  const fx = Math.sin(v.h);
  const fz = Math.cos(v.h);
  const dist = v.speed * dt;
  let nx = v.x + fx * dist;
  let nz = v.z + fz * dist;
  let hit = 0;
  let impact = 0;
  const ok = (x, z) => allowedAt(spec, world, x, z);
  if (!ok(nx, nz)) {
    hit = 1;
    impact = Math.abs(v.speed);
    if (ok(nx, v.z)) nz = v.z; // slide along the shore
    else if (ok(v.x, nz)) nx = v.x;
    else {
      nx = v.x;
      nz = v.z;
    }
    v.speed *= 0.4;
  }
  let p = pushOut(nx, nz, spec.radius, world.colliders, world.skip);
  let normal = p;
  if (world.extra) {
    const q = pushOut(p.x, p.z, spec.radius, world.extra, null);
    if (q.hit) normal = q;
    p = { x: q.x, z: q.z, hit: p.hit || q.hit };
  }
  if (p.hit) {
    hit = 1;
    impact = Math.max(impact, Math.abs(v.speed));
    v.speed *= 0.35;
    if (ok(p.x, p.z)) {
      nx = p.x;
      nz = p.z;
    }
    // Slide: turn the nose along the wall, on the side it is already pointing to.
    const tx = -normal.nz;
    const tz = normal.nx;
    const sg = tx * fx + tz * fz >= 0 ? 1 : -1;
    const want = Math.atan2(sg * tx, sg * tz);
    v.h = wrap(v.h + wrap(want - v.h) * 0.5);
  }
  v.x = nx;
  v.z = nz;
  burnStep(v, spec, dt);
  return { hit, impact, grade };
}

/** Drives for dt seconds in steps of at most SUB. Returns the worst { hit, impact } and the last grade. */
export function drive(v, spec, ctl, dt, world) {
  let left = dt;
  let out = { hit: 0, impact: 0, grade: 0 };
  let n = 0;
  while (left > 1e-9 && n < 400) {
    const step = Math.min(SUB, left);
    left -= step;
    n++;
    const r = driveStep(v, spec, ctl, step, world);
    out = { hit: Math.max(out.hit, r.hit), impact: Math.max(out.impact, r.impact), grade: r.grade };
  }
  return out;
}

/**
 * Tilt of a land vehicle on the ground under it: { y, pitch, roll } (radians). Pitch is negative
 * when the nose is up, roll is negative when the right side is up (the way the model is built).
 */
export function surfaceFrame(v, spec, world) {
  const fx = Math.sin(v.h);
  const fz = Math.cos(v.h);
  const L = spec.len / 2;
  const W = spec.wid / 2;
  const hf = world.height(v.x + fx * L, v.z + fz * L);
  const hb = world.height(v.x - fx * L, v.z - fz * L);
  // The vehicle's right-hand side, which is (-cos h, sin h) in the ground plane.
  const rx = -fz;
  const rz = fx;
  const hr = world.height(v.x + rx * W, v.z + rz * W);
  const hl = world.height(v.x - rx * W, v.z - rz * W);
  return {
    y: world.height(v.x, v.z),
    pitch: -Math.atan2(hf - hb, 2 * L),
    roll: -Math.atan2(hr - hl, 2 * W),
  };
}

/** Speed for the gauge, in km/h (always positive). */
export const kmh = (v) => Math.round(Math.abs(v.speed) * 3.6);
