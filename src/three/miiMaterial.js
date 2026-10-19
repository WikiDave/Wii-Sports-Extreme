// The shading of Nintendo's Mii renderer, fitted to Mii Studio renders (6 skin colours,
// 3 directions; error about 0.02). It works on sRGB colour values, as the renderer does:
//
//   colour = albedo * (ambient + diffuse * max(N.L, 0)) + rim * (1 - N.z)^rimPower + add
//
// with N the normal in view space, so the light stays put when the Mii turns, like in
// the Wii's editor. The rim term is the warm glow along the outline.

import * as THREE from 'three';

export const MII_LIGHT = {
  dir: new THREE.Vector3(-0.151, 0.511, 0.846).normalize(),
  ambient: new THREE.Vector3(0.942, 0.797, 0.68),
  diffuse: new THREE.Vector3(0.359, 0.388, 0.436),
  rim: new THREE.Vector3(0.911, 0.825, 0.753),
  rimPower: 3.76,
  add: new THREE.Vector3(0.041, 0.03, 0.02),
};

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D uMap;
  uniform bool uHasMap;
  uniform vec3 uLightDir;
  uniform vec3 uAmbient;
  uniform vec3 uDiffuse;
  uniform vec3 uRim;
  uniform float uRimPower;
  uniform vec3 uAdd;
  varying vec3 vNormal;
  varying vec2 vUv;

  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    // Colours arrive in three.js's linear working space; the Mii shading works on sRGB values.
    vec3 albedo = toSRGB(uHasMap ? texture2D(uMap, vUv).rgb : uColor);
    float ndl = max(dot(n, uLightDir), 0.0);
    vec3 c = albedo * (uAmbient + uDiffuse * ndl) + uRim * pow(clamp(1.0 - n.z, 0.0, 1.0), uRimPower) + uAdd;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

/** A Mii surface: plain colour or a texture (the face), lit like the Mii renders. */
export class MiiMaterial extends THREE.ShaderMaterial {
  constructor({ color = '#ffffff', map = null, side = THREE.FrontSide, light = MII_LIGHT } = {}) {
    super({
      vertexShader,
      fragmentShader,
      side,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uMap: { value: map },
        uHasMap: { value: Boolean(map) },
        uLightDir: { value: light.dir },
        uAmbient: { value: light.ambient },
        uDiffuse: { value: light.diffuse },
        uRim: { value: light.rim },
        uRimPower: { value: light.rimPower },
        uAdd: { value: light.add },
      },
    });
  }

  get color() {
    return this.uniforms.uColor.value;
  }

  get map() {
    return this.uniforms.uMap.value;
  }

  set map(tex) {
    if (!this.uniforms) return;
    this.uniforms.uMap.value = tex;
    this.uniforms.uHasMap.value = Boolean(tex);
  }
}
