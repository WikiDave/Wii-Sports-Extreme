// The Mii body: shirt in the favourite colour, trousers, shoes, arms and hands.
// Built with the feet at y = 0; joints are groups so sports can animate them later.

import * as THREE from 'three';

/** Height 0..127 -> length multiplier (64 is average). */
export const heightScale = (h) => (h < 64 ? 0.74 + (h / 64) * 0.26 : 1 + ((h - 64) / 63) * 0.3);
/** Weight 0..127 -> width multiplier (64 is average). */
export const weightScale = (w) => (w < 64 ? 0.74 + (w / 64) * 0.26 : 1 + ((w - 64) / 63) * 0.55);

const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

const SHIRT_M = v2([[0, 0], [0.235, 0], [0.262, 0.035], [0.27, 0.2], [0.275, 0.38], [0.27, 0.47], [0.25, 0.54], [0.2, 0.595], [0.12, 0.625], [0, 0.635]]);
const SHIRT_F = v2([[0, 0], [0.29, 0], [0.305, 0.025], [0.285, 0.09], [0.245, 0.22], [0.232, 0.34], [0.242, 0.45], [0.232, 0.53], [0.19, 0.59], [0.11, 0.622], [0, 0.632]]);
const HIPS = v2([[0, 0], [0.2, 0], [0.235, 0.04], [0.248, 0.12], [0.24, 0.2], [0, 0.2]]);

const shirtGeo = { m: new THREE.LatheGeometry(SHIRT_M, 40), f: new THREE.LatheGeometry(SHIRT_F, 40) };
const hipsGeo = new THREE.LatheGeometry(HIPS, 32);
const sphereGeo = new THREE.SphereGeometry(1, 24, 16);
for (const g of [shirtGeo.m, shirtGeo.f, hipsGeo, sphereGeo]) g.userData.shared = true;

export function buildBody(m, mats) {
  const hs = heightScale(m.height);
  const ws = weightScale(m.weight);
  const female = m.gender === 'f';
  const limb = 0.8 + 0.2 * ws;

  const group = new THREE.Group();
  const legLen = 0.46 * hs;
  const hipY = 0.08 + legLen;

  const hips = new THREE.Mesh(hipsGeo, mats.pants);
  hips.position.y = hipY - 0.12;
  hips.scale.set(ws, 1, ws * 0.8);
  group.add(hips);

  const shirtBottom = hipY - (female ? 0.1 : 0.04);
  const torso = new THREE.Group();
  torso.position.y = shirtBottom;
  const shirt = new THREE.Mesh(shirtGeo[female ? 'f' : 'm'], mats.shirt);
  shirt.scale.set(ws, hs, ws * 0.8);
  torso.add(shirt);
  group.add(torso);
  const torsoTop = shirtBottom + 0.632 * hs;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.2, 16), mats.skin);
  neck.position.y = torsoTop + 0.04;
  group.add(neck);

  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.115 * ws, hipY, 0);
    const r = 0.095 * limb * (female ? 0.92 : 1);
    const len = Math.max(0.05, legLen - 0.08 - r);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mats.pants);
    leg.position.y = -len / 2 - 0.02;
    pivot.add(leg);
    const shoe = new THREE.Mesh(sphereGeo, mats.shoes);
    shoe.scale.set(0.1 * limb, 0.07, 0.15);
    shoe.position.set(0, 0.065 - hipY, 0.035);
    pivot.add(shoe);
    group.add(pivot);
    return pivot;
  });

  const shoulderY = torsoTop - 0.1 * hs;
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * (0.25 * ws + 0.02), shoulderY, 0);
    pivot.rotation.z = side * (0.13 + 0.14 * (ws - 1));
    const r = 0.07 * limb;
    const len = 0.36 * hs;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mats.shirt);
    arm.position.y = -len / 2;
    pivot.add(arm);
    const hand = new THREE.Mesh(sphereGeo, mats.skin);
    hand.scale.setScalar(0.078 * limb);
    hand.position.y = -len - r * 0.55;
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
    headY: torsoTop + 0.43,
  };
}
