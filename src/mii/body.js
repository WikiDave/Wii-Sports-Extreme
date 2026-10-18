// The Mii body, in Wii proportions: head, shirt and legs about equally long; a
// shirt in the favourite colour with matching ball hands; grey trousers whose
// legs end in rounded feet. Built with the feet at y = 0; joints are groups so
// the sports can animate them later.

import * as THREE from 'three';

/** Height 0..127 -> length multiplier (64 is average). */
export const heightScale = (h) => (h < 64 ? 0.7 + (h / 64) * 0.3 : 1 + ((h - 64) / 63) * 0.32);
/** Weight 0..127 -> width multiplier (64 is average). */
export const weightScale = (w) => (w < 64 ? 0.74 + (w / 64) * 0.26 : 1 + ((w - 64) / 63) * 0.62);

const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

// Shirt profiles (radius, height) for a shirt 0.95 tall.
const SHIRT_M = v2([[0, 0], [0.245, 0], [0.258, 0.03], [0.252, 0.3], [0.243, 0.6], [0.238, 0.75], [0.22, 0.84], [0.17, 0.905], [0.09, 0.94], [0, 0.95]]);
const SHIRT_F = v2([[0, 0], [0.33, 0], [0.338, 0.025], [0.305, 0.2], [0.262, 0.45], [0.24, 0.64], [0.235, 0.75], [0.216, 0.84], [0.165, 0.905], [0.085, 0.94], [0, 0.95]]);
const HIPS = v2([[0, 0], [0.2, 0], [0.232, 0.04], [0.24, 0.14], [0.232, 0.22], [0, 0.22]]);

const shirtGeo = { m: new THREE.LatheGeometry(SHIRT_M, 40), f: new THREE.LatheGeometry(SHIRT_F, 40) };
const hipsGeo = new THREE.LatheGeometry(HIPS, 32);
const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
for (const g of [shirtGeo.m, shirtGeo.f, hipsGeo, sphereGeo]) g.userData.shared = true;

export function buildBody(m, mats) {
  const hs = heightScale(m.height);
  const ws = weightScale(m.weight);
  const female = m.gender === 'f';
  const limb = 0.85 + 0.15 * ws;

  const group = new THREE.Group();
  const hipY = 0.82 * hs;
  const torsoTop = hipY - 0.07 + 0.95 * hs;

  const hips = new THREE.Mesh(hipsGeo, mats.pants);
  hips.position.y = hipY - 0.13;
  hips.scale.set(ws, 1, ws * 0.78);
  group.add(hips);

  const shirtBottom = hipY - (female ? 0.22 : 0.07) * hs;
  const torso = new THREE.Group();
  torso.position.y = shirtBottom;
  const shirt = new THREE.Mesh(shirtGeo[female ? 'f' : 'm'], mats.shirt);
  shirt.scale.set(ws, (torsoTop - shirtBottom) / 0.95, ws * 0.78);
  torso.add(shirt);
  group.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 16), mats.skin);
  neck.position.y = torsoTop + 0.04;
  group.add(neck);

  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.112 * ws, hipY, 0);
    const r = 0.1 * limb * (female ? 0.94 : 1);
    const len = Math.max(0.05, hipY - 2 * r);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mats.pants);
    leg.position.y = -hipY / 2;
    pivot.add(leg);
    const foot = new THREE.Mesh(sphereGeo, mats.pants);
    foot.scale.set(r * 1.12, r * 0.85, r * 1.55);
    foot.position.set(0, r * 0.85 - hipY, r * 0.55);
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  });

  const shoulderY = torsoTop - 0.14 * hs;
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (0.225 * ws + 0.02), shoulderY, 0);
    pivot.rotation.z = side * (0.3 + 0.16 * (ws - 1));
    const r = 0.07 * limb;
    const len = 0.68 * hs;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mats.shirt);
    arm.position.y = -len / 2;
    pivot.add(arm);
    const hand = new THREE.Mesh(sphereGeo, mats.shirt);
    hand.scale.setScalar(0.105 * limb);
    hand.position.y = -len - r * 0.9;
    pivot.add(hand);
    group.add(pivot);
    return pivot;
  });

  return {
    group,
    torso,
    legL: legs[0],
    legR: legs[1],
    armL: arms[0],
    armR: arms[1],
    headY: torsoTop + 0.41,
  };
}
