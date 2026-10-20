// Wahoe-eiland: a height field built from the zones plus noise, coloured like the
// Wii Sports Resort island (sand, bright grass, rock, dark volcano), and the sea.

import * as THREE from 'three';
import { fbm } from './noise.js';
import { ZONES, SEA_LEVEL } from './zones.js';

export const ISLAND_SIZE = 1500;
const SEGMENTS = 300;
const SEA_FLOOR = -24;
export const SEA_FLOOR_DEPTH = -SEA_FLOOR;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Height of one zone at distance fraction t (0 at its centre, 1 at its edge). */
function profile(zone, t) {
  if (zone.profile === 'plateau') return zone.h * smooth((1 - t) / 0.45);
  if (zone.profile === 'cone') {
    const cone = Math.max(0, 1 - t) ** 1.6;
    const crater = smooth((0.12 - t) / 0.08) * 0.22;
    return zone.h * (cone - crater);
  }
  return zone.h * smooth(1 - t) ** 1.2;
}

/** Ground height at (x, z), in metres; below SEA_LEVEL is under water. */
export function heightAt(x, z) {
  let land = 0;
  let reach = 0;
  for (const zone of ZONES) {
    // Noisy shorelines: the radius wobbles with the direction.
    const dx = x - zone.x;
    const dz = z - zone.z;
    const wobble = 1 + 0.18 * fbm(Math.atan2(dz, dx) * 2 + zone.x * 0.01, zone.z * 0.01, 3, 7);
    const t = Math.hypot(dx, dz) / (zone.r * wobble);
    land = Math.max(land, profile(zone, t));
    reach = Math.max(reach, smooth((1.35 - t) / 0.6));
  }
  // The shelf drops from the beach to the sea floor beyond the zones.
  let h = land + 1.2 - (1 - reach) * (1.2 - SEA_FLOOR);
  // Rolling ground inland, calm beaches near the sea.
  const inland = smooth((land - 2.5) / 6);
  h += inland * (4 + 0.12 * land) * fbm(x / 110, z / 110, 5, 3) + 0.35 * fbm(x / 40, z / 40, 3, 5);
  return Math.max(SEA_FLOOR, h);
}

/** Id of the zone (x, z) belongs to most, or null in the sea. */
export function zoneAt(x, z) {
  let best = null;
  let bestT = 1.15;
  for (const zone of ZONES) {
    const t = Math.hypot(x - zone.x, z - zone.z) / zone.r;
    if (t < bestT) [best, bestT] = [zone.id, t];
  }
  return best;
}

const C = (hex) => new THREE.Color(hex);
const COLORS = {
  deep: C('#1d6fa5'),
  shallow: C('#cdbf98'),
  sand: C('#ddcb9f'),
  grass: C('#83c94d'),
  grassHigh: C('#5ea93e'),
  rock: C('#a6957f'),
  lava: C('#5b4c45'),
};

function groundColor(h, slope, out) {
  if (h < -6) return out.copy(COLORS.deep).lerp(COLORS.shallow, smooth((h - SEA_FLOOR) / (-6 - SEA_FLOOR)));
  if (h < 2.4) return out.copy(COLORS.shallow).lerp(COLORS.sand, smooth((h + 6) / 7));
  out.copy(COLORS.sand).lerp(COLORS.grass, smooth((h - 2.4) / 1.2));
  out.lerp(COLORS.grassHigh, smooth((h - 15) / 40));
  out.lerp(COLORS.rock, smooth((slope - 0.55) / 0.25));
  return out.lerp(COLORS.lava, smooth((h - 55) / 25));
}

function terrain() {
  const g = new THREE.PlaneGeometry(ISLAND_SIZE, ISLAND_SIZE, SEGMENTS, SEGMENTS);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    groundColor(pos.getY(i), 1 - nrm.getY(i), c).toArray(colors, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  return mesh;
}

function seaFloor() {
  // Deep sea floor under and beyond the terrain, lit the same, so the terrain edge never shows.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7000, 64), new THREE.MeshLambertMaterial({ color: COLORS.deep }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = SEA_FLOOR - 0.3;
  return floor;
}

/** The island scene graph: terrain and sea floor (the water itself is water.js). */
export function buildIsland() {
  const group = new THREE.Group();
  const ground = terrain();
  group.add(ground, seaFloor());
  return { group, ground };
}
