// Sky dome, sun and fog that follow the time of day (hours 0..24). The colours are
// keyframes, blended between: bright Resort daylight, orange evening, blue night.

import * as THREE from 'three';

const KEYS = [
  { t: 0, top: '#0b1634', horizon: '#1f3360', sun: '#8fa6ff', sunI: 0.25, hemi: 0.45, ground: '#22324d' },
  { t: 5, top: '#16224a', horizon: '#3d4d7d', sun: '#8fa6ff', sunI: 0.3, hemi: 0.5, ground: '#2a3550' },
  { t: 6.5, top: '#5d86c9', horizon: '#ffb98a', sun: '#ffb070', sunI: 1.8, hemi: 0.8, ground: '#7a6a5a' },
  { t: 9, top: '#2f95ee', horizon: '#c4ecff', sun: '#fff3dc', sunI: 3.3, hemi: 1.15, ground: '#8fb06a' },
  { t: 16, top: '#2f95ee', horizon: '#cdeeff', sun: '#ffeed0', sunI: 3.3, hemi: 1.15, ground: '#8fb06a' },
  { t: 19, top: '#4f6fb8', horizon: '#ff9a5c', sun: '#ff8a3c', sunI: 2.0, hemi: 0.75, ground: '#7a5a4a' },
  { t: 20.5, top: '#1a2552', horizon: '#6a4d78', sun: '#8fa6ff', sunI: 0.35, hemi: 0.55, ground: '#2a3550' },
  { t: 24, top: '#0b1634', horizon: '#1f3360', sun: '#8fa6ff', sunI: 0.25, hemi: 0.45, ground: '#22324d' },
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

function sample(hour) {
  hour = ((hour % 24) + 24) % 24;
  let i = 0;
  while (KEYS[i + 1].t < hour) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const f = (hour - a.t) / (b.t - a.t);
  const mix = (k) => tmpA.set(a[k]).lerp(tmpB.set(b[k]), f).clone();
  return { top: mix('top'), horizon: mix('horizon'), sun: mix('sun'), ground: mix('ground'), sunI: a.sunI + (b.sunI - a.sunI) * f, hemi: a.hemi + (b.hemi - a.hemi) * f };
}

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, 0.0, 1.0);
    // Below the horizon the far sea has faded into the fog, which is the horizon colour.
    vec3 c = mix(uHorizon, uTop, pow(up, 0.55));
    float s = max(dot(d, uSunDir), 0.0);
    c += uSunColor * (pow(s, 900.0) * 1.6 + pow(s, 40.0) * 0.25 + pow(s, 6.0) * 0.12);
    // Haze: a lighter band just above the horizon.
    c = mix(c, uHorizon * 1.08, exp(-abs(d.y) * 14.0) * 0.35);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

export class Sky {
  constructor(scene) {
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() } },
      }),
    );
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1;
    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    this.sun.target.position.set(0, 0, 0);
    scene.fog = new THREE.Fog('#ffffff', 1400, 4500);
    // The light and fog for the time of day, before the weather (weatherFx.js scales them each frame).
    this.baseSun = this.sun.intensity;
    this.baseHemi = this.hemi.intensity;
    this.baseFog = scene.fog.color.clone();
    // Stars, faded in at night.
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos.set([r * Math.cos(a) * 4000, Math.abs(u) * 4000 + 200, r * Math.sin(a) * 4000], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);
    scene.add(this.dome, this.hemi, this.sun, this.sun.target);
    this.scene = scene;
    this.dir = new THREE.Vector3();
  }

  /** Sets the time of day in hours (0..24). */
  setTime(hour) {
    const k = sample(hour);
    // The sun rises in the east (+x) at 6, is highest at 12 and sets at 18; at night the moon takes over.
    const day = ((hour - 6) / 12) * Math.PI;
    const isDay = hour >= 5.5 && hour <= 18.5;
    const a = isDay ? day : day - Math.PI;
    this.dir.set(Math.cos(a), Math.max(0.08, Math.sin(a)) * 0.9, 0.35).normalize();
    this.sun.position.copy(this.dir).multiplyScalar(800);
    this.sun.color.copy(k.sun);
    this.sun.intensity = k.sunI;
    this.baseSun = k.sunI;
    this.hemi.color.copy(k.horizon).lerp(new THREE.Color('#ffffff'), 0.5);
    this.hemi.groundColor.copy(k.ground);
    this.hemi.intensity = k.hemi;
    this.baseHemi = k.hemi;
    const u = this.dome.material.uniforms;
    u.uTop.value.copy(k.top);
    u.uHorizon.value.copy(k.horizon);
    u.uSunDir.value.copy(this.dir);
    u.uSunColor.value.copy(k.sun);
    this.baseFog.copy(k.horizon);
    this.scene.fog.color.copy(k.horizon);
    this.night = Math.min(1, Math.max(0, (0.9 - k.hemi) / 0.4));
    this.stars.material.opacity = 0.85 * this.night * this.night;
  }

  /** Keeps the dome around the camera. */
  follow(camera) {
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
    this.stars.position.copy(camera.position);
  }
}
