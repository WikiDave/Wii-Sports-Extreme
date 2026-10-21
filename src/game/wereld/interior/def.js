// The description of one room, in the form the hub (hub.js) needs: what is solid, where the
// floor is, where the Mii starts, which lamps light it and which items the prompt offers.

import * as THREE from 'three';

/** The Mii's radius for walls and furniture (same as player.js RADIUS). */
const R = 0.45;

/**
 * group: the room's meshes (world coordinates); bounds: the walkable box { x0, x1, z0, z1 };
 * solids: furniture boxes { x0, x1, z0, z1 }; floorAt(x, z) -> world y; spawn: { x, z };
 * lamps: up to three { x, y, z, color, intensity, dist }; items: interaction items;
 * update(t, dt): animation while the room is shown; camBoundsAt(x, z) -> the box the camera
 * stays in (default: bounds). ambient/ambColor/ambGround: the light of the room (sky.hemi).
 */
export function makeDef({ group, bounds, solids = [], floorAt, origin, spawn, heading = 0, lamps = [], items = [], update = null, ambient = 0.9, ambColor = '#fff1d6', ambGround = '#8a6a4a', bg = '#332a40', camDist, camBoundsAt = null, onEnter = null }) {
  const free = (x, z) => {
    if (x < bounds.x0 + R || x > bounds.x1 - R || z < bounds.z0 + R || z > bounds.z1 - R) return false;
    for (const s of solids) if (x > s.x0 - R && x < s.x1 + R && z > s.z0 - R && z < s.z1 + R) return false;
    return true;
  };
  const floor = floorAt ?? (() => origin.y);
  return {
    group,
    bounds,
    solids,
    free,
    floorAt: floor,
    camBoundsAt,
    spawn: new THREE.Vector3(spawn.x, floor(spawn.x, spawn.z), spawn.z),
    heading,
    lamps,
    items,
    update,
    ambient,
    ambColor: new THREE.Color(ambColor),
    ambGround: new THREE.Color(ambGround),
    bg: new THREE.Color(bg),
    camDist,
    onEnter,
  };
}

/** An interaction item inside a room. */
export const item = (x, z, r, label, run, extra = {}) => ({ x, z, r, label, run, ...extra });
