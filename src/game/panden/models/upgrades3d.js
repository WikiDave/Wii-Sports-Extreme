// The visible parts of the upgrades, added to a property (or the hut) once; view.js shows the ones
// whose level is reached. Each part is a group with userData { track, level }.

import * as THREE from 'three';
import { part, lockMesh, cameraMesh, crateStack, flowerBed, box, cyl, glow } from './parts.js';
import { streetLamp } from '../../world/buildings.js';
import { PAINTS } from '../../data/properties.js';

/**
 * Adds the upgrade parts to `root`, placed by the layout's `up` entry:
 *   lock (security 1), cams (security 2 and 3), crates (storage 1..3), machines[0] boost lights (speed 1..3),
 *   bed pillow (comfort 1), lamps[0] bed lamp (comfort 2), flowers (decor 2), lanterns (decor 3).
 */
export function addUpgradeParts(root, layout) {
  const up = layout.up ?? {};
  const add = (track, level, obj, at = {}) => {
    const p = part(track, level);
    p.position.set(at.x ?? 0, at.y ?? 0, at.z ?? 0);
    p.rotation.y = at.rot ?? 0;
    p.add(obj);
    root.add(p);
    return p;
  };
  if (up.lock) add('security', 1, lockMesh(), up.lock);
  (up.cams ?? []).forEach((c, i) => add('security', i + 2, cameraMesh(), c));
  (up.crates ?? []).forEach((c, i) => add('storage', i + 1, crateStack(2, 0, 0), { x: c.x, y: 0, z: c.z, rot: c.rot ?? 0 }));
  const m0 = layout.machines?.[0];
  if (m0) {
    for (let i = 0; i < 3; i++) {
      const strip = box(new THREE.Group(), 0.3, 0.3, 1.2, 0, 0, 0, null, glow('#35e06a', 1.1));
      add('speed', i + 1, strip, { x: m0.x + 1.6, y: 0.5 + i * 0.4, z: m0.z });
    }
  }
  if (up.bed) {
    const pillow = box(new THREE.Group(), 0.8, 0.2, 0.5, 0, 0, 0, '#ffffff');
    add('comfort', 1, pillow, { x: up.bed.x, y: 0.7, z: up.bed.z + 0.7 });
  }
  const lamp = up.lamps?.[0];
  if (lamp) {
    const g = new THREE.Group();
    cyl(g, 0.06, 1.8, 0, 0.9, 0, '#3a4452', null, 6);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), glow('#fff3c0', 1.4));
    bulb.position.y = 1.9;
    g.add(bulb);
    add('comfort', 2, g, { x: lamp.x, y: 0, z: lamp.z });
  }
  (up.flowers ?? []).forEach((f, i) => add('decor', 2, flowerBed(3, 1.2, i + 3), f));
  (up.lanterns ?? []).forEach((l) => add('decor', 3, streetLamp(), { x: l.x, y: 0, z: l.z }));
}

/** Colours the walls of a building: index 0 = the original colour, others from PAINTS. */
export function applyPaint(root, index) {
  const color = index > 0 ? PAINTS[index]?.color : null;
  root.traverse((o) => {
    if (o.userData?.wall && o.material) o.material.color.set(color ?? o.userData.base);
  });
}
