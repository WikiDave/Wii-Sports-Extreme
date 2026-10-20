// Poses of the customers' Miis: walking, standing, waving, blinking. They only turn the joints
// (mii.parts.legL/legR/armL/armR, see mii/body.js); e is the customer's state in customerView.js
// ({ phase, speedNow, blinkAt }).

/** Walk cycle: legs and arms swing with the speed, a little bounce and lean. */
export function animateWalk(mii, e, dt) {
  const p = mii.parts;
  e.phase += dt * (5 + e.speedNow * 1.7);
  const f = Math.min(1, e.speedNow / 2);
  const swing = Math.sin(e.phase) * (0.42 + 0.12 * Math.min(1, e.speedNow / 3)) * f;
  p.legL.rotation.x = swing;
  p.legR.rotation.x = -swing;
  p.armL.rotation.x = -swing * 0.9;
  p.armR.rotation.x = swing * 0.9;
  p.armL.rotation.z = 0.08;
  p.armR.rotation.z = -0.08;
  mii.group.position.y += Math.abs(Math.cos(e.phase)) * 0.05 * f;
  mii.group.rotation.x = 0.05 * f;
}

/** Standing: breathing and a gentle sway of the head. */
export function animateIdle(mii, e, t) {
  const p = mii.parts;
  p.legL.rotation.x = p.legR.rotation.x = 0;
  mii.group.rotation.x = 0;
  mii.idle(t + e.id);
}

/** Waving with the right arm. */
export function animateWave(mii, t) {
  const p = mii.parts;
  p.armR.rotation.x = -2.4 + Math.sin(t * 11) * 0.28;
  p.armR.rotation.z = -0.5;
}

/** Blinks now and then. */
export function animateBlink(mii, e, t) {
  if (t <= e.blinkAt) return;
  mii.setBlink(true);
  if (t > e.blinkAt + 0.12) {
    mii.setBlink(false);
    e.blinkAt = t + 2 + ((e.id * 7) % 3);
  }
}
