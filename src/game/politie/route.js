// Routes for the police cars: a path (world/zones.js PATHS) as a polyline with the distance along
// it. A car drives back and forth along its route. Pure logic.

/** A route from a polyline [[x, z], ...]: segments with their start distance, and the total length. */
export function makeRoute(line) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    seg.push({ ax, az, bx, bz, len, start: total });
    total += len;
  }
  return { seg, total };
}

/** Distance along the route at the middle of segment i (or at fraction f of it). */
export function along(route, i, f = 0.5) {
  const g = route.seg[i];
  return g.start + g.len * f;
}

/** Position and heading (atan2(dx, dz), like the Mii's rotation) at distance s, clamped to the route. */
export function routeAt(route, s, out = { x: 0, z: 0, heading: 0 }) {
  const d = Math.max(0, Math.min(route.total, s));
  let g = route.seg[route.seg.length - 1];
  for (const q of route.seg) {
    if (d <= q.start + q.len) {
      g = q;
      break;
    }
  }
  const t = g.len ? (d - g.start) / g.len : 0;
  out.x = g.ax + (g.bx - g.ax) * t;
  out.z = g.az + (g.bz - g.az) * t;
  out.heading = Math.atan2(g.bx - g.ax, g.bz - g.az);
  return out;
}

/** Moves a car along its route by speed * dt, turning at both ends. car: { s, dir }. Returns car. */
export function driveCar(car, route, dt, speed) {
  car.s += car.dir * speed * dt;
  if (car.s >= route.total) {
    car.s = route.total;
    car.dir = -1;
  } else if (car.s <= 0) {
    car.s = 0;
    car.dir = 1;
  }
  return car;
}

/** Whether a move from s0 to s1 passed the point at (crossed a distance `at`). */
export const crossed = (s0, s1, at) => (s0 < at && s1 >= at) || (s1 < at && s0 >= at);
