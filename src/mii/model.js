// A complete 3D Mii built from Mii data. update() rebuilds only what changed.

import * as THREE from 'three';
import { normalizeMii } from './data.js';
import { FAVORITE_COLORS, SKIN_COLORS, HAIR_COLORS, PANTS_COLOR } from './palette.js';
import { paintFaceTexture, faceLayout } from './face.js';
import { CAPTURE_UNIT, FACE_TEX, MASK } from './mask.js';
import { HEAD_CENTER } from './head-data.js';
import { FACE_SHAPES, headGeometries, faceSurface } from './head.js';
import { NOSES } from './parts.js';
import { noseGeometry } from './nose.js';
import { buildBeard } from './beard.js';
import { buildHair, hairMaterial } from './hair.js';
import { buildBody } from './body.js';
import { MiiMaterial, MII_HAIR_LIGHT } from '../three/miiMaterial.js';

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose();
  });
}

export class MiiModel {
  /**
   * @param data Mii data (see data.js)
   * @param options.textureScale resolution of the face texture (1 = 24 pixels per mask unit)
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
      skin: new MiiMaterial(),
      // The face texture has the skin colour as background, so face and head match.
      face: new MiiMaterial({ map: this.face.tex }),
      shirt: new MiiMaterial(),
      pants: new MiiMaterial({ color: PANTS_COLOR }),
      hair: hairMaterial('#000000'),
      beard: new MiiMaterial({ light: MII_HAIR_LIGHT }),
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
    this.mats.hair.color2.set(FAVORITE_COLORS[m.favoriteColor].hex);
    this.mats.beard.color.set(HAIR_COLORS[m.facialHair.color].hex);

    const headKey = JSON.stringify([m.face.shape, m.hair.style, m.hair.flip, m.nose, m.facialHair.beard]);
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
    const L = faceLayout(m);
    const geo = headGeometries(shape, null);
    head.add(new THREE.Mesh(geo.face, this.mats.face));
    // The 3D nose carries the face texture too, so the nose line lies on it.
    const nose = noseGeometry(NOSES[m.nose.type].id, m.nose.y, m.nose.size, MASK.y(L.nose.v) + shape.lift, faceSurface(shape));
    if (nose) head.add(new THREE.Mesh(nose, this.mats.face));
    const beard = buildBeard(m.facialHair.beard, m.face.shape, this.mats.beard);
    if (beard) head.add(beard);
    head.add(new THREE.Mesh(geo.crown, this.mats.skin));
    head.add(new THREE.Mesh(geo.back, this.mats.skin));
    const hair = buildHair(m.hair.style, this.mats.hair);
    // Slightly larger than the head so the crown never pokes through the decimated hair mesh.
    const grow = 1.022;
    hair.scale.set((m.hair.flip ? -1 : 1) * grow, grow, grow);
    hair.position.set(0, shape.lift + HEAD_CENTER[1] * CAPTURE_UNIT * (1 - grow), HEAD_CENTER[2] * CAPTURE_UNIT * (1 - grow));
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
      paintFaceTexture(target.canvas.getContext('2d'), m, { scale: this.textureScale, blink });
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
    if (this.parts.armL) this.parts.armL.rotation.x = Math.sin(t * 1.3) * 0.04;
    if (this.parts.armR) this.parts.armR.rotation.x = -Math.sin(t * 1.3) * 0.04;
  }

  dispose() {
    disposeTree(this.group);
    for (const mat of Object.values(this.mats)) mat.dispose();
    this.face.tex.dispose();
    this.faceBlink.tex.dispose();
  }
}
