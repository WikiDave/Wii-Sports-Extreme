// The ground's material: Lambert with the vertex colours of island.js, plus detail made in
// the shader from world position: patchy grass in two greens with fine speckles, ripples in
// the sand, layered rock on steep slopes, and dirt paths (PATHS in zones.js).

import * as THREE from 'three';
import { PATH_SEGMENTS, PATH_WIDTH } from './zones.js';

const MAX_SEGMENTS = 32;

const noise = /* glsl */ `
  varying vec3 vWPos;
  varying vec3 vWNormal;
  uniform vec4 uPaths[${MAX_SEGMENTS}];
  uniform int uPathCount;
  uniform float uPathWidth;
  float th(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(th(i), th(i + vec2(1, 0)), u.x), mix(th(i + vec2(0, 1)), th(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm3(vec2 p) { return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.1) + 0.2 * vnoise(p * 4.3); }
  float pathDist(vec2 p) {
    float d = 1e5;
    for (int i = 0; i < ${MAX_SEGMENTS}; i++) {
      if (i >= uPathCount) break;
      vec2 a = uPaths[i].xy;
      vec2 b = uPaths[i].zw;
      vec2 ab = b - a;
      float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
      d = min(d, length(p - a - t * ab));
    }
    return d;
  }
`;

export function terrainMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const segs = PATH_SEGMENTS.slice(0, MAX_SEGMENTS).map((s) => new THREE.Vector4(...s));
  while (segs.length < MAX_SEGMENTS) segs.push(new THREE.Vector4());
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPaths = { value: segs };
    shader.uniforms.uPathCount = { value: Math.min(PATH_SEGMENTS.length, MAX_SEGMENTS) };
    shader.uniforms.uPathWidth = { value: PATH_WIDTH };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${noise}`).replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      {
        vec3 base = diffuseColor.rgb;
        vec2 p = vWPos.xz;
        float big = fbm3(p * 0.025);
        float mid = vnoise(p * 0.22);
        float fine = vnoise(p * 2.7);
        float green = smoothstep(0.03, 0.12, base.g - max(base.r, base.b) * 0.85);
        float sand = smoothstep(0.02, 0.1, base.r - base.b) * (1.0 - green);
        float slope = 1.0 - vWNormal.y;
        float rock = smoothstep(0.32, 0.55, slope);
        vec3 c = base;
        // Grass: big patches of fresher and deeper green, then mottling and blades.
        vec3 g = c * mix(0.84, 1.1, big);
        g = mix(g, g * vec3(1.08, 1.06, 0.82), smoothstep(0.55, 0.8, mid) * 0.5);
        g *= 0.93 + 0.12 * fine;
        c = mix(c, g, green);
        // Sand: soft ripples and grain.
        float ripple = sin(p.x * 0.9 + p.y * 0.35 + mid * 4.0) * 0.5 + 0.5;
        c = mix(c, c * (0.95 + 0.05 * ripple) * (0.96 + 0.08 * fine), sand);
        // Rock: horizontal layers, darker in the cracks.
        float strata = sin(vWPos.y * 1.4 + mid * 3.0) * 0.5 + 0.5;
        vec3 r = vec3(0.56, 0.5, 0.43) * (0.8 + 0.25 * strata) * (0.9 + 0.15 * fine);
        c = mix(c, r, rock * 0.9);
        green *= 1.0 - rock;
        // Dirt paths with ragged edges, only on dry land.
        float pd = pathDist(p) + (mid - 0.5) * 0.9;
        float onPath = (1.0 - smoothstep(uPathWidth - 0.5, uPathWidth + 0.3, pd)) * smoothstep(1.2, 2.2, vWPos.y);
        vec3 dirt = vec3(0.72, 0.6, 0.42) * (0.9 + 0.14 * fine) * (0.95 + 0.08 * big);
        c = mix(c, dirt, onPath);
        // Worn grass along the path's edge.
        c = mix(c, c * vec3(1.05, 0.98, 0.8), (1.0 - smoothstep(uPathWidth, uPathWidth + 1.4, pd)) * green * (1.0 - onPath) * 0.6);
        diffuseColor.rgb = c;
      }`,
    );
  };
  return mat;
}
