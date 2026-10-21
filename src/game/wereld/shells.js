// The 60 hidden shells (schelpen) of the island: where they may lie, how they are chosen,
// what collecting them pays, and the rough-direction hints. Pure logic (no three.js), tested
// in tests/wereld.test.mjs. The places themselves are found by shells/spots.js.

export const SHELL_COUNT = 60;
/** Paid for every shell; a milestone adds its own bonus (each one only once). */
export const SHELL_CASH = 5;
export const SHELL_XP = 2;
export const SHELL_MILESTONES = [
  { n: 10, cash: 100, xp: 30, text: 'Tien schelpen: de kust kent je nu.' },
  { n: 25, cash: 300, xp: 80, text: 'Vijfentwintig schelpen: een echte strandvinder.' },
  { n: 40, cash: 800, xp: 150, text: 'Veertig schelpen: het hele eiland ligt aan je voeten.' },
  { n: 60, cash: 2000, xp: 400, text: 'Alle zestig schelpen! Het eiland is van jou.' },
];

/** Where the shells lie, by kind; the quota adds up to SHELL_COUNT. */
export const KIND_QUOTA = { strand: 27, klif: 10, dak: 12, steiger: 3, struik: 8 };

/** A spot is valid for a shell: on land, and not inside an obstacle (with a margin for the Mii). */
export function validSpot(x, z, { isLand, colliders = [], margin = 1.2 }) {
  if (!isLand(x, z)) return false;
  for (const c of colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + margin) return false;
  return true;
}

/**
 * Chooses the shells from candidate spots { kind: [{ x, y, z, zone }] } with a seeded rand.
 * Shells keep `spacing` metres apart. Returns [{ id, kind, x, y, z, zone }] with ids s01..s60.
 */
export function planShells(rand, spots, { quota = KIND_QUOTA, spacing = 6 } = {}) {
  const out = [];
  for (const kind of Object.keys(quota)) {
    const list = (spots[kind] ?? []).slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    let got = 0;
    for (const p of list) {
      if (got >= quota[kind]) break;
      if (out.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < spacing)) continue;
      out.push({ kind, x: p.x, y: p.y, z: p.z, zone: p.zone ?? null });
      got++;
    }
  }
  return out.map((s, i) => ({ ...s, id: `s${String(i + 1).padStart(2, '0')}` }));
}

/** The milestones reached with `count` shells that are not claimed yet. */
export function milestonesReached(count, claimed = []) {
  return SHELL_MILESTONES.filter((m) => count >= m.n && !claimed.includes(m.n));
}

const COMPASS = ['noorden', 'noordoosten', 'oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten'];

/** Compass word from a point towards (dx, dz); x runs east, z runs south. */
export function compassTo(dx, dz) {
  const a = Math.atan2(dx, -dz); // 0 = north, a quarter turn = east
  const turn = (a + 2 * Math.PI) % (2 * Math.PI);
  return COMPASS[Math.round(turn / (Math.PI / 4)) % 8];
}

/** A rough distance in words, never the exact metres. */
export function distanceWord(d) {
  return d < 40 ? 'vlakbij' : d < 130 ? 'op een eindje' : 'ver weg';
}

/** The hint for a shell seen from a position: "Naar het oosten, op een eindje. Bij Havenstad." */
export function hintText(from, shell) {
  const dx = shell.x - from.x;
  const dz = shell.z - from.z;
  const where = shell.zone ? ` Bij ${shell.zone}.` : '';
  return `Naar het ${compassTo(dx, dz)}, ${distanceWord(Math.hypot(dx, dz))}.${where}`;
}

/** The nearest shell that is not collected yet, or null. */
export function nearestLeft(from, shells, collected = []) {
  let best = null;
  let bestD = Infinity;
  for (const s of shells) {
    if (collected.includes(s.id)) continue;
    const d = Math.hypot(s.x - from.x, s.z - from.z);
    if (d < bestD) [best, bestD] = [s, d];
  }
  return best;
}
