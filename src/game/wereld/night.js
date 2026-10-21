// How dark it is, as a number 0..1 (0 = full day, 1 = full night), with soft evenings and
// mornings. Pure logic: the night life and the villagers use it.

export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Night level for a clock hour (0..24). Evening fades in from 18:00 to 20:00, morning out from 5:00 to 7:00. */
export function nightLevel(hour) {
  const h = ((hour % 24) + 24) % 24;
  return h >= 12 ? clamp01((h - 18) / 2) : clamp01((7 - h) / 2);
}

/** 1 when d is within `near`, 0 beyond `far`, linear in between. */
export function fade(d, near, far) {
  return clamp01((far - d) / (far - near));
}
