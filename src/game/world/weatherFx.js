// Weather you can see: drifting clouds, falling rain, and dimmer light and fog. The sky
// (sky.js) sets the colours for the time of day; this scales them for the weather and fades
// smoothly when the weather changes.

import * as THREE from 'three';
import { WEATHER } from '../weather.js';
import { mergeInPlace } from '../uiterlijk/merge.js';

const RAIN_COUNT = 1600;
const RAIN_BOX = 60;
const GREY_FOG = new THREE.Color('#8a96a3');

/** Vertex colours: white on top, a soft grey underneath, so each cloud has some volume. */
function shadeFromBelow(geo) {
  const p = geo.attributes.position;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < p.count; i++) {
    lo = Math.min(lo, p.getY(i));
    hi = Math.max(hi, p.getY(i));
  }
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - lo) / (hi - lo || 1);
    const k = 0.78 + 0.22 * t * t * (3 - 2 * t);
    col.set([k, k, Math.min(1, k * 1.03)], i * 3);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
}

export class WeatherFx {
  constructor(scene, sky) {
    this.sky = sky;
    this.scene = scene;
    this.level = { sun: 1, fog: 1, rain: 0, clouds: 0.25 };
    this.target = WEATHER.zon;

    // Clouds: soft puffy clusters high above the island. Each cloud is one merged mesh, lit
    // from above and shaded a little darker underneath (vertex colours).
    this.clouds = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.92, flatShading: true, vertexColors: true });
    this.cloudMat = mat;
    const puff = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 22; i++) {
      const c = new THREE.Group();
      const n = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(puff, mat);
        const top = k === Math.floor(n / 2) ? 4 : 0; // the middle puff rises above the rest
        b.position.set((k - n / 2) * 22 + Math.random() * 8, Math.random() * 5 + top, Math.random() * 14 - 4);
        b.scale.set(17 + Math.random() * 12, 9 + Math.random() * 5, 13 + Math.random() * 8);
        c.add(b);
      }
      mergeInPlace(c);
      shadeFromBelow(c.children[0].geometry);
      c.position.set((Math.random() - 0.5) * 1800, 260 + Math.random() * 60, (Math.random() - 0.5) * 1400);
      c.userData.speed = 4 + Math.random() * 4;
      this.clouds.add(c);
    }
    scene.add(this.clouds);

    // Rain: short streaks in a box that follows the camera.
    const pos = new Float32Array(RAIN_COUNT * 6);
    for (let i = 0; i < RAIN_COUNT; i++) {
      const x = (Math.random() - 0.5) * RAIN_BOX;
      const y = Math.random() * RAIN_BOX;
      const z = (Math.random() - 0.5) * RAIN_BOX;
      pos.set([x, y, z, x, y - 1.2, z], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.55 }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  setWeather(id) {
    this.target = WEATHER[id];
  }

  /** dt seconds; camera for the rain box. Call after sky.setTime for the frame. */
  update(dt, camera, t) {
    const k = Math.min(1, dt * 0.8);
    for (const key of ['sun', 'fog', 'rain', 'clouds']) this.level[key] += (this.target[key] - this.level[key]) * k;
    const L = this.level;
    // Dim the sun and hemisphere light, bring the fog closer. Always set from the base of the time
    // of day (sky.js), never multiplied on the last frame's value: this runs while a menu pauses
    // the clock too, where sky.setTime is not called.
    this.sky.sun.intensity = this.sky.baseSun * L.sun;
    this.sky.hemi.intensity = this.sky.baseHemi * (0.55 + 0.45 * Math.min(1, L.sun + 0.3));
    const fog = this.scene.fog;
    fog.near = 1400 * (0.15 + 0.85 * L.fog);
    fog.far = 4500 * (0.2 + 0.8 * L.fog);
    // Grey the fog colour in bad weather.
    fog.color.copy(this.sky.baseFog).lerp(GREY_FOG, Math.min(0.6, (1 - L.fog) * 0.7));
    this.clouds.visible = L.clouds > 0.05;
    this.cloudMat.opacity = 0.3 + 0.65 * Math.min(1, L.clouds);
    this.cloudMat.color.set('#ffffff').lerp(new THREE.Color('#9aa3ad'), Math.min(1, Math.max(0, L.rain) * 0.7));
    this.clouds.children.forEach((c, i) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 1000) c.position.x = -1000;
      c.visible = i / this.clouds.children.length < L.clouds + 0.05;
    });
    this.rain.visible = L.rain > 0.05;
    if (this.rain.visible) {
      this.rain.position.set(camera.position.x, camera.position.y - RAIN_BOX / 2, camera.position.z);
      this.rain.material.opacity = Math.min(0.6, 0.2 + 0.25 * L.rain);
      const a = this.rain.geometry.attributes.position;
      const fall = (22 + 8 * L.rain) * dt;
      const count = Math.floor(RAIN_COUNT * Math.min(1, 0.4 + 0.3 * L.rain));
      this.rain.geometry.setDrawRange(0, count * 2);
      for (let i = 0; i < RAIN_COUNT * 2; i += 2) {
        let y = a.getY(i) - fall;
        if (y < -1.2) y += RAIN_BOX;
        a.setY(i, y);
        a.setY(i + 1, y - 1.2);
      }
      a.needsUpdate = true;
    }
  }

  dispose() {
    this.clouds.traverse((o) => o.geometry?.dispose());
    this.cloudMat.dispose();
    this.rain.geometry.dispose();
    this.rain.material.dispose();
  }
}
