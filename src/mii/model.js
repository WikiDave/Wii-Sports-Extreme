// A complete 3D Mii built from Mii data. update() rebuilds only what changed.

import * as THREE from 'three';
import { normalizeMii } from './data.js';
import { FAVORITE_COLORS, SKIN_COLORS, HAIR_COLORS, PANTS_COLOR, SHOE_COLOR } from './palette.js';
import { drawFace, faceLayout, FACE_TEX } from './face.js';
import { FACE_SHAPES, headGeometry, faceGeometry, buildEars, buildNose } from './head.js';
import { HAIR_STYLES, buildHair, hairMaterial } from './hair.js';
import { buildBody } from './body.js';

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose();
  });
}

export class MiiModel {
  /**
   * @param data Mii data (see data.js)
   * @param options.textureScale resolution of the face texture (1 = 1024 x 768)
   * @param options.body false builds only the head (for portraits)
   */
  constructor(data, { textureScale = 1, body = true } = {}) {
    this.withBody = body;
    this.group = new THREE.Group();
    this.headPivot = new THREE.Group();
    this.group.add(this.headPivot);

    const makeCanvas = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(FACE_TEX.width * textureScale);
      c.height = Math.round(FACE_TEX.height * textureScale);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return { canvas: c, tex };
    };
    this.face = makeCanvas();
    this.faceBlink = makeCanvas();
    this.textureScale = textureScale;

    this.mats = {
      skin: new THREE.MeshStandardMaterial({ roughness: 0.78 }),
      face: new THREE.MeshStandardMaterial({
        map: this.face.tex,
        transparent: true,
        roughness: 0.78,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
      shirt: new THREE.MeshStandardMaterial({ roughness: 0.72 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS_COLOR, roughness: 0.8 }),
      shoes: new THREE.MeshStandardMaterial({ color: SHOE_COLOR, roughness: 0.6 }),
      hair: hairMaterial('#000000'),
    };
    this.parts = null;
    this.keys = {};
    this.update(data);
  }

  update(data) {
    const m = normalizeMii(data);
    this.data = m;
    this.mats.skin.color.set(SKIN_COLORS[m.face.skin].hex);
    this.mats.shirt.color.set(FAVORITE_COLORS[m.favoriteColor].hex);
    this.mats.hair.color.set(HAIR_COLORS[m.hair.color].hex);

    const headKey = JSON.stringify([m.face.shape, m.hair, m.nose]);
    const bodyKey = JSON.stringify([m.gender, m.height, m.weight]);
    const faceKey = JSON.stringify([m.face, m.eyes, m.brows, m.mouth, m.facialHair, m.glasses, m.mole]);

    if (headKey !== this.keys.head) this.buildHead(m);
    if (this.withBody && bodyKey !== this.keys.body) this.buildBody(m);
    if (faceKey !== this.keys.face) this.paintFace(m);
    this.keys = { head: headKey, body: bodyKey, face: faceKey };
  }

  buildHead(m) {
    if (this.head) {
      disposeTree(this.head);
      this.headPivot.remove(this.head);
    }
    const shape = FACE_SHAPES[m.face.shape];
    const head = new THREE.Group();
    head.add(new THREE.Mesh(headGeometry(shape), this.mats.skin));
    const faceMesh = new THREE.Mesh(faceGeometry(shape), this.mats.face);
    faceMesh.renderOrder = 1;
    head.add(faceMesh);
    if (!HAIR_STYLES[m.hair.style].hideEars) head.add(buildEars(shape, this.mats.skin));
    const L = faceLayout(m);
    head.add(buildNose(m.nose.type, shape, L.noseTheta, L.noseScale, this.mats.skin));
    const hair = buildHair(m.hair.style, shape, this.mats.hair);
    if (m.hair.flip) hair.scale.x = -1;
    head.add(hair);
    this.head = head;
    this.headPivot.add(head);
  }

  buildBody(m) {
    if (this.parts) {
      disposeTree(this.parts.group);
      this.group.remove(this.parts.group);
    }
    this.parts = buildBody(m, this.mats);
    this.group.add(this.parts.group);
    this.headPivot.position.y = this.parts.headY;
  }

  paintFace(m) {
    for (const [target, blink] of [[this.face, false], [this.faceBlink, true]]) {
      const ctx = target.canvas.getContext('2d');
      ctx.setTransform(this.textureScale, 0, 0, this.textureScale, 0, 0);
      ctx.clearRect(0, 0, FACE_TEX.width, FACE_TEX.height);
      drawFace(ctx, m, { blink });
      target.tex.needsUpdate = true;
    }
  }

  /** Height of the head centre above the feet (0 when built without a body). */
  get headY() {
    return this.headPivot.position.y;
  }

  setBlink(closed) {
    this.mats.face.map = closed ? this.faceBlink.tex : this.face.tex;
  }

  /** Gentle idle motion for menus and the editor. */
  idle(t) {
    if (!this.parts) return;
    const breathe = Math.sin(t * 2.1);
    this.parts.torso.scale.y = 1 + breathe * 0.012;
    this.headPivot.rotation.z = Math.sin(t * 0.9) * 0.035;
    this.headPivot.rotation.x = Math.sin(t * 0.7 + 1) * 0.025;
    this.parts.armL.rotation.x = Math.sin(t * 1.3) * 0.04;
    this.parts.armR.rotation.x = -Math.sin(t * 1.3) * 0.04;
  }

  dispose() {
    disposeTree(this.group);
    for (const mat of Object.values(this.mats)) mat.dispose();
    this.face.tex.dispose();
    this.faceBlink.tex.dispose();
  }
}
