// The shells you can find: small pearly shells that bob on the spot with a soft glow round
// them. One instanced body and one instanced glow; a collected shell shrinks to nothing. Walk
// within reach of a shell and it is yours.

import * as THREE from 'three';
import { softTexture } from '../exterior/volcano.js';
import { mat } from '../mats.js';

const REACH = 2.4;
const ROOF_REACH = 6.4; // the house collider keeps the Mii about 5 m from a roof

export class ShellView {
  /** shells: [{ id, kind, x, y, z }]; collected(): the ids already collected. */
  constructor(scene, shells) {
    this.shells = shells;
    this.group = new THREE.Group();
    scene.add(this.group);
    const bodyGeo = new THREE.SphereGeometry(0.42, 10, 7);
    this.body = new THREE.InstancedMesh(bodyGeo, mat('#ffd6ea', { emissive: '#ffb3d9', emissiveIntensity: 0.55 }), shells.length);
    this.tex = softTexture('rgba(255, 245, 210, 1)');
    this.haloMat = new THREE.MeshBasicMaterial({ map: this.tex, color: '#fff3d6', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    this.halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.6, 2.6), this.haloMat, shells.length);
    this.group.add(this.body, this.halo);
    this.hidden = new Set();
    this.idQuat = new THREE.Quaternion();
    this.tmp = new THREE.Matrix4();
    this.pos = new THREE.Vector3();
    this.scl = new THREE.Vector3();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.body.frustumCulled = false;
    this.halo.frustumCulled = false;
  }

  /** Shows (or hides) the shells collected already. */
  setCollected(ids) {
    this.hidden = new Set(ids);
  }

  /**
   * One frame: bobs the shells, turns the glows to the camera, and calls onGet(shell) for a
   * shell within reach of (px, pz) that is not hidden.
   */
  update(t, camera, px, py, pz, onGet) {
    this.shells.forEach((s, i) => {
      if (this.hidden.has(s.id)) {
        this.body.setMatrixAt(i, this.zero);
        this.halo.setMatrixAt(i, this.zero);
        return;
      }
      const bob = Math.sin(t * 2.1 + i * 1.7) * 0.22;
      this.pos.set(s.x, s.y + 0.6 + bob, s.z);
      this.scl.set(1, 0.42, 1);
      this.tmp.compose(this.pos, this.idQuat, this.scl);
      this.body.setMatrixAt(i, this.tmp);
      const glow = 1.5 + Math.sin(t * 3 + i) * 0.2;
      this.scl.set(glow, glow, glow);
      this.tmp.compose(this.pos, camera.quaternion, this.scl);
      this.halo.setMatrixAt(i, this.tmp);
      // A shell on a roof is picked up from the street: a wider reach, and a higher one.
      const roof = s.kind === 'dak';
      const reach = roof ? ROOF_REACH : REACH;
      const dx = s.x - px;
      const dz = s.z - pz;
      if (dx * dx + dz * dz < reach * reach && Math.abs(s.y - py) < (roof ? 12 : 3) && onGet) onGet(s);
    });
    this.body.instanceMatrix.needsUpdate = true;
    this.halo.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.body.geometry.dispose();
    this.halo.geometry.dispose();
    this.tex.dispose();
    this.haloMat.dispose();
    this.group.removeFromParent();
  }
}
