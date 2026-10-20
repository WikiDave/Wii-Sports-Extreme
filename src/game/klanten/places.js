// The places customers go to (x runs east, z south, metres) and the footpaths between them.
//
// A place is where a customer stands (within `spread` metres of its centre, each customer on
// their own spot). `at` completes the sentence "meestal ..." in the contacts. `exposed` places
// are open to the weather: when it rains customers move to `shelter` (mostly: they stay at home).
// Coordinates were checked against the terrain and the props (houses, palms, rocks), see
// tests/klanten.test.mjs for the structural checks.
//
// Two places are only known when the island is built: 'strand' and 'markt' are the customer
// spots next to the beach stand and the market (island.js findHutSpot), and every customer's
// front door ('thuis'). buildWorld() takes them as options; the values here are the defaults.

import { PATHS } from '../world/zones.js';

export const PLACES = {
  thuis: { name: 'thuis', at: 'thuis', x: 0, z: 0, spread: 0 },
  strand: { name: 'het strand', at: 'bij het strand', x: 54, z: 186, spread: 6, exposed: true, shelter: 'thuis' },
  surf: { name: 'de surfbaai', at: 'bij de surfbaai', x: -18, z: 222, spread: 7, exposed: true, shelter: 'thuis' },
  markt: { name: 'de markt', at: 'op de markt', x: 256, z: 75, spread: 6 },
  terras: { name: 'het haventerras', at: 'op het haventerras', x: 224, z: 95, spread: 5 },
  steiger: { name: 'de steiger', at: 'bij de steiger', x: 356, z: 70, spread: 4, exposed: true, shelter: 'terras' },
  hotel: { name: 'het resorthotel', at: 'bij het resorthotel', x: -38, z: 29, spread: 6 },
  uitzicht: { name: 'het uitzichtpunt', at: 'op het uitzichtpunt', x: -2, z: 100, spread: 5, exposed: true, shelter: 'hotel' },
  weide: { name: 'de weide', at: 'op de weide', x: 100, z: 50, spread: 8, exposed: true, shelter: 'thuis' },
  kaap: { name: 'de Vuurtorenkaap', at: 'op de Vuurtorenkaap', x: -256, z: -132, spread: 5, exposed: true, shelter: 'thuis' },
  vulkaan: { name: 'de voet van de vulkaan', at: 'aan de voet van de vulkaan', x: 28, z: -130, spread: 5, exposed: true, shelter: 'thuis' },
};

/** Footpaths that are not on the map: to the pier at the end of the harbour road, and along the beach to the surf bay. */
export const LINKS = [
  [[268, 60], [278, 68], [300, 70], [340, 70], [356, 70]],
  [[30, 212], [8, 217], [-18, 222]],
];

const STEP = 12; // nodes on the paths this far apart

/**
 * A graph of the footpaths: nodes {x, z, edges: [[node, length]]}, paths cut into short steps.
 * isLand(x, z) (optional) drops the steps that cross water (the road from the beach to Havenstad
 * wades through an inlet): customers then take the way round over the hills.
 */
export function buildGraph(lines = [...PATHS, ...LINKS], { isLand = null } = {}) {
  const nodes = [];
  const index = new Map();
  const nodeAt = (x, z) => {
    const key = `${Math.round(x * 2)}:${Math.round(z * 2)}`;
    let i = index.get(key);
    if (i == null) {
      i = nodes.length;
      nodes.push({ x, z, edges: [] });
      index.set(key, i);
    }
    return i;
  };
  const link = (a, b) => {
    if (a === b) return;
    if (isLand && !(isLand(nodes[a].x, nodes[a].z) && isLand(nodes[b].x, nodes[b].z) && isLand((nodes[a].x + nodes[b].x) / 2, (nodes[a].z + nodes[b].z) / 2))) return;
    const len = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
    nodes[a].edges.push([b, len]);
    nodes[b].edges.push([a, len]);
  };
  for (const line of lines) {
    for (let k = 0; k < line.length - 1; k++) {
      const [ax, az] = line[k];
      const [bx, bz] = line[k + 1];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / STEP));
      let prev = nodeAt(ax, az);
      for (let s = 1; s <= n; s++) {
        const cur = nodeAt(ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n);
        link(prev, cur);
        prev = cur;
      }
    }
  }
  return { nodes };
}

/** Index of the node closest to (x, z). */
export function nearestNode(graph, x, z) {
  let best = 0;
  let bestD = Infinity;
  graph.nodes.forEach((n, i) => {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

/** Shortest way between two nodes over the paths: array of node indices (Dijkstra), or null. */
export function shortestPath(graph, from, to) {
  const n = graph.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  dist[from] = 0;
  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    if (u === to) break;
    done[u] = 1;
    for (const [v, len] of graph.nodes[u].edges) {
      if (dist[u] + len < dist[v]) [dist[v], prev[v]] = [dist[u] + len, u];
    }
  }
  if (dist[to] === Infinity) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev[path[0]]);
  return path;
}

/**
 * The places of an island. opts.spots: { strand, haven } customer spots; opts.homes: { id: {x, z} }
 * front doors per customer; opts.places: other overrides { id: {x, z} }; opts.colliders: the round
 * obstacles { x, z, r } that standing spots keep out of.
 */
export function buildWorld({ spots = null, homes = {}, places = {}, graph = buildGraph(), colliders = null } = {}) {
  const out = {};
  for (const [id, p] of Object.entries(PLACES)) out[id] = { id, ...p };
  if (spots?.strand) Object.assign(out.strand, { x: spots.strand.x, z: spots.strand.z });
  if (spots?.haven) Object.assign(out.markt, { x: spots.haven.x, z: spots.haven.z });
  for (const [id, p] of Object.entries(places)) Object.assign(out[id], p);
  for (const p of Object.values(out)) p.node = p.id === 'thuis' ? null : nearestNode(graph, p.x, p.z);
  return { places: out, homes, graph, colliders, routes: new Map() };
}
