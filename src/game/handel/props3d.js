// 3D pieces of the feature, built from boxes and cylinders with flat colours: the mailbox with its
// flag, the delivery crate, the wholesale sign at the market, and the seller's cooler box + parasol.

import * as THREE from 'three';

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
const box = (w, hgt, d, m, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, d), m);
  mesh.position.set(x, y, z);
  return mesh;
};

/** A blue mailbox on a wooden post. userData.flag is the pivot of the red flag: rotation.z 0 = up, ~3 = down. */
export function buildMailbox() {
  const g = new THREE.Group();
  const wood = mat('#a8743a');
  const blue = mat('#3a9ad9');
  const red = mat('#e2513f');
  const cream = mat('#fff4e0');
  g.add(box(0.22, 1.5, 0.22, wood, 0, 0.75, 0));
  g.add(box(0.8, 0.55, 1.15, blue, 0, 1.65, 0));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.15, 12), blue);
  roof.rotation.x = Math.PI / 2;
  roof.position.y = 1.925;
  g.add(roof);
  g.add(box(0.66, 0.42, 0.05, cream, 0, 1.65, 0.6));
  g.add(box(0.2, 0.05, 0.06, wood, 0, 1.75, 0.64));
  // The flag on the right side: arm + cloth on a pivot.
  const pivot = new THREE.Group();
  pivot.position.set(0.46, 1.62, -0.1);
  pivot.add(box(0.06, 0.9, 0.06, wood, 0, 0.45, 0));
  pivot.add(box(0.5, 0.3, 0.05, red, 0.25, 0.72, 0));
  g.add(pivot);
  g.userData.flag = pivot;
  return g;
}

/** A wooden delivery crate with fruit and sugar on top. userData.stack: extra crates shown for bigger deliveries. */
export function buildCrate() {
  const g = new THREE.Group();
  const wood = mat('#b98245');
  const dark = mat('#8a5a2b');
  const one = () => {
    const c = new THREE.Group();
    c.add(box(1.1, 0.7, 0.85, wood, 0, 0.35, 0));
    for (const [x, z] of [[-0.52, -0.38], [0.52, -0.38], [-0.52, 0.38], [0.52, 0.38]]) c.add(box(0.1, 0.74, 0.1, dark, x, 0.37, z));
    for (const y of [0.18, 0.52]) c.add(box(1.14, 0.06, 0.88, dark, 0, y, 0));
    return c;
  };
  const a = one();
  const b = one();
  b.position.set(-0.1, 0.7, 0.05);
  b.rotation.y = 0.35;
  b.scale.setScalar(0.85);
  const c = one();
  c.position.set(1.15, 0, 0.15);
  c.rotation.y = -0.2;
  g.add(a, b, c);
  // Goods peeking out of the top crate.
  const lemon = mat('#ffd83a');
  const mint = mat('#6bd05a');
  const sugar = mat('#ffffff');
  const goods = new THREE.Group();
  for (const [x, z, m, r] of [[-0.3, -0.1, lemon, 0.16], [0.05, 0.15, lemon, 0.15], [0.3, -0.15, mint, 0.14], [-0.05, -0.25, sugar, 0.13], [0.38, 0.2, lemon, 0.14]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
    s.position.set(x, 0.0, z);
    goods.add(s);
  }
  goods.position.set(-0.1, 1.45, 0.05);
  g.add(goods);
  g.userData.stack = [b, goods, c];
  return g;
}

/** Wholesale sign for the market: a green board with text on two posts, and a pile of crates. */
export function buildBoard() {
  const g = new THREE.Group();
  const wood = mat('#a8743a');
  g.add(box(0.2, 3.0, 0.2, wood, -1.5, 1.5, 0));
  g.add(box(0.2, 3.0, 0.2, wood, 1.5, 1.5, 0));
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = '#3c9d3c';
  c.fillRect(0, 0, 512, 256);
  c.strokeStyle = '#fff4e0';
  c.lineWidth = 12;
  c.strokeRect(8, 8, 496, 240);
  c.fillStyle = '#fff4e0';
  c.textAlign = 'center';
  c.font = '800 70px "M PLUS Rounded 1c", "Arial Rounded MT Bold", Arial, sans-serif';
  c.fillText('GROOT', 256, 110);
  c.fillText('HANDEL', 256, 190);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const front = new THREE.MeshLambertMaterial({ map: tex });
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.7, 0.18), [wood, wood, wood, wood, front, wood]);
  board.position.set(0, 2.45, 0);
  g.add(board);
  const crates = buildCrate();
  crates.position.set(2.6, 0, 0.6);
  crates.scale.setScalar(0.9);
  g.add(crates);
  g.userData.tex = tex;
  return g;
}

/** A seller's cooler box on the ground with up to three bottles on top, under a striped parasol. userData.set(fraction). */
export function buildStand() {
  const g = new THREE.Group();
  const white = mat('#f4f7fa');
  const orange = mat('#ff6e19');
  g.add(box(0.95, 0.55, 0.6, white, 0, 0.275, 0));
  const lid = box(1.0, 0.1, 0.65, orange, 0, 0.6, 0);
  g.add(lid);
  const bottles = [];
  for (const [x, color] of [[-0.3, '#ffd83a'], [0, '#ff9ec7'], [0.3, '#7fe0e8']]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.38, 8), mat(color));
    b.position.set(x, 0.84, 0);
    g.add(b);
    bottles.push(b);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), mat('#a8743a'));
  pole.position.set(-0.7, 1.25, -0.2);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 8), orange);
  canopy.position.set(-0.7, 2.6, -0.2);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.09, 8, 1, true), white);
  rim.position.set(-0.7, 2.36, -0.2);
  rim.material.side = THREE.DoubleSide;
  g.add(pole, canopy, rim);
  g.userData.set = (fraction) => bottles.forEach((b, i) => (b.visible = fraction > i / 3 + 0.01));
  return g;
}

/** A name tag above a head: a rounded label with a name and a second line. Call set(name, sub) when they change. */
export function buildTag() {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 112;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(2.2, 0.77, 1);
  sprite.renderOrder = 6;
  let key = '';
  sprite.userData.set = (name, sub, warn = false) => {
    const k = `${name}|${sub}|${warn}`;
    if (k === key) return;
    key = k;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, 320, 112);
    c.fillStyle = warn ? 'rgba(255, 233, 210, 0.95)' : 'rgba(255, 255, 255, 0.92)';
    c.strokeStyle = warn ? '#f2a516' : '#ff6e19';
    c.lineWidth = 6;
    c.beginPath();
    if (c.roundRect) c.roundRect(6, 6, 308, 100, 30);
    else c.rect(6, 6, 308, 100);
    c.fill();
    c.stroke();
    c.fillStyle = '#3b4049';
    c.textAlign = 'center';
    c.font = '800 40px "M PLUS Rounded 1c", "Arial Rounded MT Bold", Arial, sans-serif';
    c.fillText(name, 160, sub ? 50 : 70);
    if (sub) {
      c.font = '700 28px "M PLUS Rounded 1c", Arial, sans-serif';
      c.fillStyle = warn ? '#a8470f' : '#1c8a3a';
      c.fillText(sub, 160, 88);
    }
    tex.needsUpdate = true;
  };
  return sprite;
}

/** A small pool of floating texts ("+€18") that rise and fade. */
export class Popups {
  constructor(scene, size = 6) {
    this.scene = scene;
    this.list = [];
    for (let i = 0; i < size; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 64;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(1.8, 0.6, 1);
      sprite.visible = false;
      sprite.renderOrder = 7;
      scene.add(sprite);
      this.list.push({ sprite, canvas, tex, life: 0 });
    }
    this.next = 0;
  }

  show(x, y, z, text, color = '#1c8a3a') {
    const p = this.list[this.next++ % this.list.length];
    const c = p.canvas.getContext('2d');
    c.clearRect(0, 0, 192, 64);
    c.font = '800 44px "M PLUS Rounded 1c", "Arial Rounded MT Bold", Arial, sans-serif';
    c.textAlign = 'center';
    c.lineWidth = 8;
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.strokeText(text, 96, 46);
    c.fillStyle = color;
    c.fillText(text, 96, 46);
    p.tex.needsUpdate = true;
    p.sprite.position.set(x, y, z);
    p.sprite.material.opacity = 1;
    p.sprite.visible = true;
    p.life = 1.5;
  }

  update(dt) {
    for (const p of this.list) {
      if (!p.sprite.visible) continue;
      p.life -= dt;
      p.sprite.position.y += dt * 0.9;
      p.sprite.material.opacity = Math.max(0, Math.min(1, p.life / 0.5));
      if (p.life <= 0) p.sprite.visible = false;
    }
  }

  dispose() {
    for (const p of this.list) {
      this.scene.remove(p.sprite);
      p.tex.dispose();
      p.sprite.material.dispose();
    }
  }
}
