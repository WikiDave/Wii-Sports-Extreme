// The zones of Wahoe-eiland (see docs/ONTWERP.md). x runs east, z runs south, in metres.
// Each zone is a landmass: profile 'plateau' (flat top), 'cliff' (flat top, steep sides), 'hill'
// or 'cone' (the volcano).

export const SEA_LEVEL = 0;

export const ZONES = [
  { id: 'heuvels', name: 'Resort-heuvels', x: -40, z: 10, r: 240, h: 55, profile: 'hill', rank: 3 },
  { id: 'strand', name: 'Strand-Zuid', x: 20, z: 230, r: 150, h: 2.2, profile: 'plateau', rank: 1 },
  { id: 'haven', name: 'Havenstad', x: 250, z: 70, r: 140, h: 5, profile: 'plateau', rank: 1 },
  { id: 'kaap', name: 'Vuurtorenkaap', x: -270, z: -150, r: 110, h: 24, profile: 'cliff', rank: 2 },
  { id: 'vulkaan', name: 'Vulkaanberg', x: 40, z: -230, r: 170, h: 120, profile: 'cone', rank: 4 },
  { id: 'vliegveld', name: 'Vliegveld-eiland', x: 470, z: -300, r: 110, h: 3.5, profile: 'plateau', rank: 5 },
  // A small sandbank far out at sea: only reachable by boat (features/voertuigen).
  { id: 'schat', name: 'Verborgen strand', x: -430, z: 255, r: 58, h: 1, profile: 'plateau', rank: 0 },
];

/**
 * The strait round Vuurtorenkaap: a ring of sea (centre x, z; middle radius r; half width) that
 * makes the cape an island of its own. The bridge (BRIDGE, world/bridge.js) crosses it.
 */
export const STRAIT = { x: -270, z: -150, r: 155, half: 26, depth: -8 };

/**
 * The bridge over the strait, Golden Gate style (world/bridge.js): a flat deck from the cape's
 * plateau (a) to the hillside (b), both at the deck's height `top`, on the path to the lighthouse.
 */
export const BRIDGE = { a: [-197.88, -88.18], b: [-134.48, -33.84], top: 27 };

/** The bridge deck's height at (x, z), or null off the bridge (pure: for paths and people). */
export function bridgeTop(x, z) {
  const [ax, az] = BRIDGE.a;
  const dx = BRIDGE.b[0] - ax;
  const dz = BRIDGE.b[1] - az;
  const len = Math.hypot(dx, dz);
  const u = ((x - ax) * dx + (z - az) * dz) / len;
  const v = Math.abs((x - ax) * dz - (z - az) * dx) / len;
  return u >= 0 && u <= len && v <= 3 ? BRIDGE.top : null;
}

/** Dirt paths between the places, as polylines of [x, z] (metres). */
export const PATHS = [
  [[30, 212], [70, 190], [120, 150], [175, 112], [222, 84], [252, 72]],
  [[252, 72], [268, 60]],
  [[30, 212], [12, 165], [-8, 110], [-30, 50]],
  [[-30, 50], [-95, 0], BRIDGE.b], // to the bridge over the strait ...
  [BRIDGE.a, [-215, -110], [-262, -142]], // ... and from it to the lighthouse
  [[-30, 50], [-10, -20], [12, -90], [30, -140]],
  [[175, 112], [130, 60], [70, 40], [-30, 50]],
];
export const PATH_WIDTH = 2.4;

/** Distance from (x, z) to the nearest path centre line. */
export function pathDistance(x, z) {
  let best = Infinity;
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
    }
  }
  return best;
}

/** All path segments as [ax, az, bx, bz]. */
export const PATH_SEGMENTS = PATHS.flatMap((line) => line.slice(1).map((b, i) => [line[i][0], line[i][1], b[0], b[1]]));
