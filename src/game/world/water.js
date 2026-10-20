// The sea: a shader with small moving waves (normals only, no heavy geometry), sky
// reflection with Fresnel, a sun glint, colour from turquoise shallows to deep blue by the
// water depth, and foam that laps the shore. The depth comes from the terrain's own heights
// baked into a texture. Colours of the sky are shared with sky.js so it follows the time of day.

import * as THREE from 'three';
import { ISLAND_SIZE, SEA_FLOOR_DEPTH } from './island.js';

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform sampler2D uDepth;
  uniform float uSize;
  uniform float uMaxDepth;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uLight;
  uniform float uRough;
  varying vec3 vWorld;

  // Height of the little waves and its slope, from a few travelling sines plus a cross swell.
  // Each octave fades out once it gets finer than a few pixels (no shimmer in the distance).
  vec2 waveSlope(vec2 p, float t, float dist) {
    vec2 s = vec2(0.0);
    vec2 dirs[5];
    dirs[0] = vec2(1.0, 0.25); dirs[1] = vec2(-0.6, 1.0); dirs[2] = vec2(0.3, -1.0);
    dirs[3] = vec2(0.9, 0.7); dirs[4] = vec2(-1.0, -0.2);
    float freq = 0.35;
    float amp = 0.12;
    for (int i = 0; i < 5; i++) {
      vec2 d = normalize(dirs[i]);
      float ph = dot(d, p) * freq + t * (0.8 + 0.25 * float(i));
      float lod = 1.0 - smoothstep(15.0, 60.0, dist * freq);
      s += d * cos(ph) * amp * freq * lod;
      freq *= 1.83;
      amp *= 0.62;
    }
    return s * uRough;
  }

  void main() {
    vec2 uv = vWorld.xz / uSize + 0.5;
    bool inside = all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)));
    float ground = inside ? texture2D(uDepth, uv).r : -uMaxDepth;
    float depth = max(0.0, -ground);

    vec3 view = cameraPosition - vWorld;
    float dist = length(view);
    view /= dist;
    // Waves fade out with distance so they do not shimmer.
    vec2 sl = waveSlope(vWorld.xz, uTime, dist);
    vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));

    // Water colour by depth: clear turquoise over the sand, deep blue further out.
    vec3 shallow = vec3(0.30, 0.86, 0.84);
    vec3 mid = vec3(0.07, 0.62, 0.80);
    vec3 deep = vec3(0.02, 0.26, 0.55);
    vec3 col = mix(shallow, mid, smoothstep(0.0, 4.0, depth));
    col = mix(col, deep, smoothstep(4.0, 18.0, depth));
    col *= uLight;
    float alpha = mix(0.45, 0.95, smoothstep(0.0, 6.0, depth));

    // Sky reflection, stronger at grazing angles.
    vec3 r = reflect(-view, n);
    vec3 sky = mix(uHorizon, uTop, pow(clamp(r.y, 0.0, 1.0), 0.55));
    float fres = 0.03 + 0.97 * pow(1.0 - max(dot(n, view), 0.0), 5.0);
    col = mix(col, sky, fres * 0.85);
    alpha = mix(alpha, 1.0, fres);

    // Sun (or moon) glint.
    float spec = pow(max(dot(r, normalize(uSunDir)), 0.0), 260.0);
    col += uSunColor * spec * 2.2;
    alpha = max(alpha, min(1.0, spec * 2.0));

    // Foam: a soft band at the waterline and a second wave of it that runs up and back.
    float edge = 1.0 - smoothstep(0.0, 0.12, depth);
    float run = 0.5 + 0.5 * sin(uTime * 1.1 - depth * 5.0 + sin(vWorld.x * 0.08 + vWorld.z * 0.05) * 2.0);
    float band = smoothstep(0.7, 0.95, run) * smoothstep(0.05, 0.15, depth) * (1.0 - smoothstep(0.2, 0.5, depth));
    float foam = max(edge, band * 0.75) * step(0.001, depth + 0.02);
    col = mix(col, vec3(1.0) * mix(0.75, 1.0, uLight), foam * 0.85);
    alpha = max(alpha, foam * 0.9);

    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

/** Bakes the terrain heights (a PlaneGeometry rotated flat, ISLAND_SIZE wide) into a texture. */
function depthTexture(ground) {
  const pos = ground.geometry.attributes.position;
  const n = Math.round(Math.sqrt(pos.count));
  const data = new Float32Array(n * n);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const px = Math.round((x / ISLAND_SIZE + 0.5) * (n - 1));
    const pz = Math.round((z / ISLAND_SIZE + 0.5) * (n - 1));
    data[pz * n + px] = pos.getY(i);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.FloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** The sea mesh; sky: the Sky (its colours are shared). Call update(t, sky) every frame. */
export function buildWater(ground, sky) {
  const u = sky.dome.material.uniforms;
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 },
      uDepth: { value: null },
      uSize: { value: ISLAND_SIZE },
      uMaxDepth: { value: SEA_FLOOR_DEPTH },
      uLight: { value: 1 },
      uRough: { value: 1 },
    }]),
  });
  // Share (not copy) the sky's colour uniforms.
  Object.assign(mat.uniforms, { uTop: u.uTop, uHorizon: u.uHorizon, uSunDir: u.uSunDir, uSunColor: u.uSunColor });
  mat.uniforms.uDepth.value = depthTexture(ground);
  const water = new THREE.Mesh(new THREE.CircleGeometry(7000, 96), mat);
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 1;
  water.userData.update = (t, light = 1, rough = 1) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uLight.value = light;
    mat.uniforms.uRough.value = rough;
  };
  return water;
}
