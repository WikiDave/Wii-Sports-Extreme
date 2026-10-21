// Candidate places for the shells, by kind: the beaches, the cliffs, the roofs of the houses,
// the planks of the jetty, and the ground under the bushes. Every candidate is on land and clear
// of the props (see shells.js validSpot); planShells() picks the 60 from these.

import { heightAt, zoneAt } from '../../world/island.js';
import { ZONES } from '../../world/zones.js';
import { validSpot, planShells, KIND_QUOTA } from '../shells.js';
import { rng, between } from '../rng.js';

const ZONE_NAME = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));
const BOX = { x0: -420, x1: 720, z0: -420, z1: 420 };

/** Candidate spots per kind, with a seeded rand (same seed, same spots). boats: [{ x, z }] by the jetty. */
export function shellSpots(colliders, houses, bushes, jetty, boats = [], seed = 88) {
  const r = rng(seed);
  const isLand = (x, z) => heightAt(x, z) > 0.15;
  const ok = (x, z) => validSpot(x, z, { isLand, colliders, margin: 1.4 });
  const zoneName = (x, z) => ZONE_NAME[zoneAt(x, z)] ?? null;
  const spots = { strand: [], klif: [], dak: [], steiger: [], struik: [] };

  // Beaches: a band just above the waterline.
  for (let i = 0; i < 9000 && spots.strand.length < 120; i++) {
    const x = between(r, BOX.x0, BOX.x1);
    const z = between(r, BOX.z0, BOX.z1);
    const h = heightAt(x, z);
    if (h < 0.25 || h > 1.4 || zoneAt(x, z) === 'vulkaan' || !ok(x, z)) continue;
    spots.strand.push({ x, y: h, z, zone: zoneName(x, z) });
  }
  // Cliffs and steep slopes above the sea.
  for (let i = 0; i < 9000 && spots.klif.length < 60; i++) {
    const x = between(r, BOX.x0, BOX.x1);
    const z = between(r, BOX.z0, BOX.z1);
    const h = heightAt(x, z);
    if (h < 6 || h > 60 || !ok(x, z)) continue;
    const steep = Math.abs(h - heightAt(x + 3, z)) + Math.abs(h - heightAt(x, z + 3));
    if (steep < 2.4) continue;
    spots.klif.push({ x, y: h, z, zone: zoneName(x, z) });
  }
  // Roofs: on top of the houses (the collider is the house itself, so no check).
  for (const hs of houses) spots.dak.push({ x: hs.x, y: hs.top, z: hs.z, zone: zoneName(hs.x, hs.z) });
  // The planks of the jetty.
  if (jetty) {
    for (let k = 2; k < 17; k += 2) spots.steiger.push({ x: jetty.x + 0.2, y: jetty.y + 0.3, z: jetty.z + k, zone: 'Strand-Zuid' });
  }
  // The moored boats beside it.
  for (const b of boats) spots.steiger.push({ x: b.x, y: 1.1, z: b.z, zone: 'Strand-Zuid' });
  // Under the bushes, on the grass.
  for (const b of bushes) {
    const a = r() * Math.PI * 2;
    const d = between(r, 1.6, 2.6);
    const x = b.x + Math.cos(a) * d;
    const z = b.z + Math.sin(a) * d;
    const h = heightAt(x, z);
    if (h < 1.6 || !ok(x, z)) continue;
    spots.struik.push({ x, y: h, z, zone: zoneName(x, z) });
  }
  return { spots, quota: KIND_QUOTA };
}

/** The shells for this island (deterministic): [{ id, kind, x, y, z, zone }]. */
export function layoutShells(colliders, houses, bushes, jetty, boats = [], seed = 88) {
  const { spots, quota } = shellSpots(colliders, houses, bushes, jetty, boats, seed);
  return planShells(rng(seed + 1), spots, { quota });
}
