// The beach hut: the player's home base. Door faces +z (south), a sign above it.

import * as THREE from 'three';

const mat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export function buildHut() {
  const g = new THREE.Group();
  const wall = mat('#ffe2a8');
  const roof = mat('#3a9ad9');
  const wood = mat('#a8743a');
  const body = new THREE.Mesh(new THREE.BoxGeometry(8.4, 4.6, 7), wall);
  body.position.y = 2.3;
  const top = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.4, 4), roof);
  top.rotation.y = Math.PI / 4;
  top.position.y = 6.3;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.3), wood);
  door.position.set(0, 1.4, 3.55);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.2), mat('#e2513f'));
  sign.position.set(0, 3.9, 3.6);
  const porch = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 2), wood);
  porch.position.set(0, 0.15, 4.2);
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.2), mat('#bfe8ff'));
  window_.position.set(-2.6, 2.6, 3.55);
  const window2 = window_.clone();
  window2.position.x = 2.6;
  g.add(body, top, door, sign, porch, window_, window2);
  return g;
}
