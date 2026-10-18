// Off-screen snapshots of Miis: portraits for the plaza and 3D option icons
// (hairstyles, face shapes) in the editor. One shared WebGL renderer;
// requests are queued so the page stays responsive while icons appear.

import * as THREE from 'three';
import { MiiModel } from './model.js';
import { addStudioLights, framing } from '../three/stage.js';

let gl = null;
const cache = new Map();
const CACHE_LIMIT = 500;

function setup() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  addStudioLights(scene);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
  return { renderer, scene, camera };
}

function keyOf(data, view, size, yaw) {
  const { id, name, creator, birthday, ...look } = data;
  return `${view}|${size}|${yaw}|${JSON.stringify(look)}`;
}

/** Renders a Mii to a PNG data URL. view: 'face' or 'body'. */
export function snapshot(data, { view = 'face', size = 192, yaw = 0 } = {}) {
  const key = keyOf(data, view, size, yaw);
  if (cache.has(key)) return cache.get(key);
  gl ??= setup();
  const { renderer, scene, camera } = gl;
  renderer.setSize(size, size, false);
  const model = new MiiModel(data, { textureScale: size > 200 ? 0.75 : 0.5, body: view === 'body' });
  model.group.rotation.y = yaw;
  scene.add(model.group);

  const f = framing(model, view, camera.fov);
  camera.position.set(f.target.x, f.target.y + f.dist * 0.05, f.target.z + f.dist);
  camera.lookAt(f.target);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(model.group);
  model.dispose();

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, url);
  return url;
}

export function hasSnapshot(data, { view = 'face', size = 192, yaw = 0 } = {}) {
  return cache.has(keyOf(data, view, size, yaw));
}

const queue = [];
let pumping = false;

function pump() {
  const job = queue.shift();
  if (!job) {
    pumping = false;
    return;
  }
  if (job.isCancelled?.()) {
    pump();
    return;
  }
  try {
    job.resolve(snapshot(job.data, job.options));
  } catch (err) {
    job.reject(err);
  }
  setTimeout(pump, 0);
}

/**
 * Queued snapshot. Cached results resolve straight away.
 * isCancelled() lets a screen drop requests that are no longer on screen.
 */
export function snapshotAsync(data, options = {}, isCancelled = null) {
  if (hasSnapshot(data, options)) return Promise.resolve(snapshot(data, options));
  return new Promise((resolve, reject) => {
    queue.push({ data, options, resolve, reject, isCancelled });
    if (!pumping) {
      pumping = true;
      setTimeout(pump, 0);
    }
  });
}

/** Fills an <img> with a snapshot, showing a soft placeholder until it is ready. */
export function snapshotImage(img, data, options, isCancelled) {
  img.decoding = 'async';
  if (hasSnapshot(data, options)) {
    img.src = snapshot(data, options);
    return;
  }
  img.classList.add('is-loading');
  snapshotAsync(data, options, isCancelled).then(
    (url) => {
      img.src = url;
      img.classList.remove('is-loading');
    },
    () => img.classList.remove('is-loading'),
  );
}
