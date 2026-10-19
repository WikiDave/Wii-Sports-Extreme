// A market stall with a striped awning (market, beach stand).

import * as THREE from 'three';

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
  return g;
}
