// The guards' gear: the flashlight in the hand, the view cone on the ground and the suspicion
// meter above the head (a small billboard). Shared geometry; the materials change with the
// time of day and the mood, and the meter is only painted when its value changes.

import * as THREE from 'three';

const dark = new THREE.MeshLambertMaterial({ color: '#2c3440', flatShading: true });
const bodyGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.34, 6);
bodyGeo.rotateX(Math.PI / 2);
const lensGeo = new THREE.CircleGeometry(0.075, 7);

/** A flashlight: dark barrel, glowing lens pointing along +z. */
export function makeFlashlight() {
  const lensMat = new THREE.MeshLambertMaterial({ color: '#fff6c4', emissive: '#ffd24a', emissiveIntensity: 0.2, flatShading: true });
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(bodyGeo, dark);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.z = 0.172;
  g.add(barrel, lens);
  return { group: g, lens: lensMat };
}

/** Sets the lens glow: bright at night, a dull bulb by day. Cheap to call every frame. */
export const setLensGlow = (fl, night) => {
  fl.lens.emissiveIntensity = night ? 1.8 : 0.2;
};

/** The beam on the ground: a flat fan. Opacity and colour depend on the mood and the time. */
export function beamMaterial() {
  return new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
}

const BEAM = {
  day: { color: '#ffe14a', opacity: 0.16 },
  night: { color: '#fff5b0', opacity: 0.4 },
  alert: { color: '#ff9a2a', opacity: 0.26 },
  chase: { color: '#ff3b2f', opacity: 0.34 },
};

/** Paints the beam for a mood: 'day' | 'night' | 'alert' | 'chase'. Only changes when the mood does. */
export function setBeam(mat, mood) {
  if (mat.userData.mood === mood) return;
  mat.userData.mood = mood;
  const b = BEAM[mood] ?? BEAM.day;
  mat.color.set(b.color);
  mat.opacity = b.opacity;
}

/** A suspicion meter: a sprite with a bar and a mark. */
export function makeMeter() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 28;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.1, 0.32, 1);
  sprite.renderOrder = 10;
  sprite.visible = false;
  return { sprite, canvas, ctx: canvas.getContext('2d'), tex, mat, key: '' };
}

/** Paints the meter: value 0..1, mode 'verdacht' | 'radio' | 'chase'. Skips when nothing changed. */
export function paintMeter(m, value, mode) {
  const key = `${Math.round(value * 20)}|${mode}`;
  if (key === m.key) return;
  m.key = key;
  const c = m.ctx;
  c.clearRect(0, 0, 96, 28);
  c.fillStyle = 'rgba(24,34,46,0.78)';
  c.beginPath();
  c.roundRect(1, 2, 94, 24, 9);
  c.fill();
  const color = mode === 'chase' ? '#ff3b2f' : mode === 'radio' || value > 0.6 ? '#ff9a2a' : '#ffe14a';
  c.fillStyle = color;
  c.fillRect(7, 10, 60 * Math.max(0, Math.min(1, value)), 8);
  c.fillStyle = '#ffffff';
  c.font = 'bold 17px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(mode === 'chase' || mode === 'radio' || value > 0.6 ? '!' : '?', 82, 14);
  m.tex.needsUpdate = true;
}

export function disposeMeter(m) {
  m.tex.dispose();
  m.mat.dispose();
}
