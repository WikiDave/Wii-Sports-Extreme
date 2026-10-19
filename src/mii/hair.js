// The 72 hairstyles of the Wii, in Wii editor order, measured from Nintendo's Mii
// renders (assets/hair.bin, assets/hair.png). Each style is a mesh around the head with
// a class texture: hair, the cap of a hat (in the favourite colour), black seams, or
// open where the head itself shows through. loadHairLibrary() must finish before Miis
// are built.

import * as THREE from 'three';
import { MiiMaterial, MII_HAIR_LIGHT } from '../three/miiMaterial.js';

// Internal Wii id of every editor position (libmii tables on wiibrew).
const TO_EDITOR = [59, 42, 65, 49, 40, 44, 52, 47, 45, 63, 51, 54, 36, 37, 48, 70, 61, 56, 64, 43, 53, 58, 50, 27, 69, 41, 39, 46, 66, 71, 33, 11, 12, 0, 35, 57, 30, 14, 25, 4, 1, 31, 26, 24, 3, 6, 62, 13, 15, 7, 19, 2, 17, 67, 29, 20, 9, 34, 18, 8, 22, 60, 23, 55, 21, 32, 16, 28, 10, 38, 5, 68];
const IDS = TO_EDITOR.reduce((out, editor, id) => ((out[editor] = id), out), []);

export const HAIR_STYLES = IDS.map((id, i) => ({ name: `Kapsel ${i + 1}`, id }));

const library = { meshes: [], atlas: null, textures: new Map(), geometries: new Map() };
let loading = null;

/** Fetches the hair meshes and textures (once). */
export function loadHairLibrary(base = new URL('../../assets/', import.meta.url)) {
  loading ??= (async () => {
    const [bin, img] = await Promise.all([
      fetch(new URL('hair.bin', base)).then((r) => r.arrayBuffer()),
      new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = new URL('hair.png', base).href;
      }),
    ]);
    const view = new DataView(bin);
    const count = view.getUint32(4, true);
    for (let id = 0; id < count; id++) {
      const at = 8 + id * 12;
      const offset = view.getUint32(at, true);
      const vertices = view.getUint32(at + 4, true);
      const indices = view.getUint32(at + 8, true);
      library.meshes[id] = vertices ? { bin, offset, vertices, indices } : null;
    }
    library.atlas = img;
  })();
  return loading;
}

function geometry(id) {
  let g = library.geometries.get(id);
  if (g) return g;
  const m = library.meshes[id];
  const pos = new Int16Array(m.bin, m.offset, m.vertices * 3);
  const uv = new Uint16Array(m.bin, m.offset + m.vertices * 6, m.vertices * 2);
  const index = new Uint16Array(m.bin, m.offset + m.vertices * 10, m.indices);
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(pos, (v) => v / 16384), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(Float32Array.from(uv, (v) => v / 32768), 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  g.userData.shared = true;
  library.geometries.set(id, g);
  return g;
}

/** The class texture of hair style id, cut from the atlas. */
export function hairTexture(id) {
  let tex = library.textures.get(id);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  c.getContext('2d').drawImage(library.atlas, (id % 8) * 512, Math.floor(id / 8) * 256, 512, 256, 0, 0, 512, 256);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.flipY = false;
  tex.premultiplyAlpha = false;
  library.textures.set(id, tex);
  return tex;
}

/** Material for captured hair: color = hair, color2 = cap (favourite colour). */
export function hairMaterial(color) {
  const mat = new MiiMaterial({ color, side: THREE.DoubleSide, light: MII_HAIR_LIGHT });
  // The hair hugs the scalp; keep it in front of the head where the two meet.
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -8;
  return mat;
}

/** The hair of editor style `style` (a group, empty for bald styles); sets the material's texture. */
export function buildHair(style, material) {
  const group = new THREE.Group();
  const id = HAIR_STYLES[style].id;
  if (!library.atlas) throw new Error('loadHairLibrary() first');
  material.uniforms.uClassMap.value = hairTexture(id);
  material.uniforms.uHasClassMap.value = true;
  if (library.meshes[id]) group.add(new THREE.Mesh(geometry(id), material));
  return group;
}
