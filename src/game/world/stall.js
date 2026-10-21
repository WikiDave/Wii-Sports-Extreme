// A market stall with a striped awning (market, beach stand).

import * as THREE from 'three';
import { mergeInPlace } from '../uiterlijk/merge.js';

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export function buildStall(awning = '#e2513f') {
  const g = new THREE.Group();
  const wood = mat('#a8743a');
  const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2), mat('#fff4e0'));
  counter.position.y = 0.6;
  g.add(counter);
  for (const [x, z] of [[-2.3, -0.9], [2.3, -0.9], [-2.3, 0.9], [2.3, 0.9]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 0.2), wood);
    post.position.set(x, 1.6, z);
    g.add(post);
  }
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1, 0.25, 2.6), mat(i % 2 ? '#ffffff' : awning));
    stripe.position.set(-2 + i, 3.3, 0);
    stripe.rotation.x = -0.15;
    g.add(stripe);
  }
  return mergeInPlace(g);
}

/** A production machine: a steel tank with a pipe and a status lamp (red busy, green ready). */
export function buildMachine() {
  const g = new THREE.Group();
  const steel = mat('#cfd8e0');
  const dark = mat('#4a5866');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 14), steel);
  body.position.y = 1.15;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel);
  cap.position.y = 2.0;
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 2.0), dark);
  base.position.y = 0.15;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), dark);
  pipe.position.set(0.5, 2.7, 0);
  const lampMat = new THREE.MeshLambertMaterial({ color: '#888888', emissive: '#000000' });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lampMat);
  lamp.position.set(0, 1.5, 0.92);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), mat('#ffffff'));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.0, 1.0, 0.9);
  g.add(base, body, cap, pipe, lamp, dial);
  g.userData.lamp = lampMat;
  return mergeInPlace(g); // the lamp keeps its own material, so it still changes colour
}
