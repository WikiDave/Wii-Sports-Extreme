// Building blocks for the interior rooms: boxes and cylinders in the flat Wii style, a room
// shell with a door gap, collision boxes, and Mii characters for the people in the rooms.

import * as THREE from 'three';
import { mat } from '../mats.js';
import { MiiModel } from '../../../mii/model.js';
import { OFFICIAL_MIIS } from '../../../mii/official.js';
import { MII_SCALE } from '../../player.js';

export const WALL_T = 0.4;

/** A box mesh with a colour (cached material). */
export function box(w, h, d, color, x, y, z, { rx = 0, ry = 0, rz = 0, mat: m = null } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m ?? mat(color));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

/** A cylinder (top radius rt, bottom radius rb) standing on y. */
export function cyl(rt, rb, h, color, x, y, z, seg = 10, m = null) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m ?? mat(color));
  mesh.position.set(x, y, z);
  return mesh;
}

/** A ball (or a squashed one) for plants and lamps. */
export function ball(r, color, x, y, z, sy = 1, m = null) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m ?? mat(color));
  mesh.position.set(x, y, z);
  mesh.scale.y = sy;
  return mesh;
}

/** A collision box in world coordinates: x0..x1, z0..z1. */
export const solid = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });

/**
 * The shell of a room (floor at y0, walls to y0 + h) in world coordinates. The wall at z0 has a
 * door gap of `door.w` centred on `door.x`. Returns the walkable bounds (inside the walls).
 */
export function roomShell(g, { x0, x1, z0, z1, y0 = 0, h = 3.4, floor = '#c9955a', wall = '#fff1d6', trim = '#ffffff', door = null, wallColor = null }) {
  const w = wallColor ?? wall;
  const T = WALL_T;
  g.add(box(x1 - x0 + T * 2, 0.3, z1 - z0 + T * 2, floor, (x0 + x1) / 2, y0 - 0.15, (z0 + z1) / 2));
  // Back and sides.
  g.add(box(x1 - x0 + T * 2, h, T, w, (x0 + x1) / 2, y0 + h / 2, z1 + T / 2));
  g.add(box(T, h, z1 - z0, w, x0 - T / 2, y0 + h / 2, (z0 + z1) / 2));
  g.add(box(T, h, z1 - z0, w, x1 + T / 2, y0 + h / 2, (z0 + z1) / 2));
  // Front, with the door gap.
  const fz = z0 - T / 2;
  if (door) {
    const left = door.x - door.w / 2;
    const right = door.x + door.w / 2;
    g.add(box(left - x0 + T, h, T, w, (x0 - T + left) / 2, y0 + h / 2, fz));
    g.add(box(x1 + T - right, h, T, w, (right + x1 + T) / 2, y0 + h / 2, fz));
    g.add(box(door.w, h - 2.6, T, w, door.x, y0 + 2.6 + (h - 2.6) / 2, fz));
    // Door frame in trim colour.
    g.add(box(0.2, 2.6, T + 0.1, trim, left, y0 + 1.3, fz));
    g.add(box(0.2, 2.6, T + 0.1, trim, right, y0 + 1.3, fz));
  } else {
    g.add(box(x1 - x0 + T * 2, h, T, w, (x0 + x1) / 2, y0 + h / 2, fz));
  }
  // Skirting in trim, a little detail that reads as a room.
  g.add(box(x1 - x0, 0.25, 0.08, trim, (x0 + x1) / 2, y0 + 0.13, z0 + 0.04));
  return { x0: x0 + 0.25, x1: x1 - 0.25, z0: z0 + 0.25, z1: z1 - 0.25 };
}

/** A flat board with text lines (a menu or a sign), painted once on a canvas. w and h in metres. */
export function textBoard(lines, w, h, { bg = '#2d3a4a', fg = '#ffffff', size = 40 } = {}) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg;
  x.font = `bold ${size}px system-ui, sans-serif`;
  x.textBaseline = 'middle';
  const step = c.height / (lines.length + 0.6);
  lines.forEach((t, i) => x.fillText(t, 26, step * (i + 0.6)));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

/** A new Mii model from one of the official Miis (by name), with a shirt colour (FAVORITE_COLORS index). */
export function newMii(name, fav = null) {
  const data = structuredClone(OFFICIAL_MIIS.find((m) => m.name === name) ?? OFFICIAL_MIIS[0]);
  const m = new MiiModel({ ...data, favoriteColor: fav ?? data.favoriteColor });
  m.group.scale.setScalar(MII_SCALE);
  shadowsOff(m.group);
  return m;
}

/** Places a Mii (position and turn about y). */
export function placeMii(model, x, y, z, ry) {
  model.group.position.set(x, y, z);
  model.group.rotation.y = ry;
  return model;
}

function shadowsOff(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
}
