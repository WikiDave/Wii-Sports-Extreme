// Which customers get a 3D model: the nearest few within sight. Pure, no allocation per call.

/**
 * Fills `out` with the indices of the nearest `max` entries of `list` ({ x, z, ok, shown }) that are
 * within `radius` of (px, pz); entries with ok === false are skipped. Entries that are shown already
 * count as 30% closer, so a customer at the edge does not flicker in and out. Returns out.length.
 */
export function pickVisible(list, px, pz, max, radius, out, dist = new Float64Array(max)) {
  out.length = 0;
  const r2 = radius * radius;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.ok) continue;
    const d2 = (e.x - px) ** 2 + (e.z - pz) ** 2;
    if (d2 > r2 * (e.shown ? 1.44 : 1)) continue; // a shown one may drift 20% beyond the radius
    const score = e.shown ? d2 * 0.7 : d2;
    // insertion into the sorted top `max`
    let k = out.length;
    if (k === max && score >= dist[max - 1]) continue;
    if (k < max) out.length = ++k;
    while (k > 1 && dist[k - 2] > score) {
      dist[k - 1] = dist[k - 2];
      out[k - 1] = out[k - 2];
      k--;
    }
    dist[k - 1] = score;
    out[k - 1] = i;
  }
  return out.length;
}
