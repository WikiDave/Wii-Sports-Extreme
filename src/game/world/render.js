// The island's render pipeline: sun shadows that follow the player, and a grading pass
// (exposure, contrast, saturation, warm highlights, vignette) for the bright Resort look.
//
// The scene is drawn into an sRGB render target with MSAA. three encodes its own materials
// to sRGB there; the Mii shader writes sRGB values directly, so both end up alike. Sampling
// the target decodes to linear, the grade works in linear and the pass encodes back.

import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uScene;
  uniform float uExposure;
  uniform float uContrast;
  uniform float uSaturation;
  uniform vec3 uTint;
  uniform float uVignette;
  uniform float uNight;
  varying vec2 vUv;

  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }

  void main() {
    vec3 c = texture2D(uScene, vUv).rgb * uExposure;
    // Saturation and contrast around mid grey, in a perceptual-ish (sRGB) space.
    vec3 s = toSRGB(max(c, 0.0));
    float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
    s = mix(vec3(l), s, uSaturation);
    s = (s - 0.5) * uContrast + 0.5;
    // Warm highlights, cool shadows (stronger blue at night).
    float hl = smoothstep(0.35, 1.0, l);
    s *= mix(vec3(0.96, 0.99, 1.04 + 0.08 * uNight), uTint, hl);
    // Soft vignette.
    vec2 d = vUv - 0.5;
    s *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
    gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
  }
`;

export class IslandRenderer {
  constructor(renderer, { quality = 'high' } = {}) {
    this.renderer = renderer;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.size = quality === 'high' ? 2048 : 1024;
    this.target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.UnsignedByteType });
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uScene: { value: this.target.texture },
          uExposure: { value: 1.0 },
          uContrast: { value: 1.08 },
          uSaturation: { value: 1.1 },
          uTint: { value: new THREE.Color(1.04, 1.0, 0.94) },
          uVignette: { value: 0.22 },
          uNight: { value: 0 },
        },
      }),
    );
    this.quad.frustumCulled = false;
    this.post = new THREE.Scene();
    this.post.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  /** Sets up the sun's shadow: an area of `range` metres around the point it follows. */
  setupSun(sun, range = 45) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.size, this.size);
    const c = sun.shadow.camera;
    c.left = -range;
    c.right = range;
    c.top = range;
    c.bottom = -range;
    c.near = 1;
    c.far = 1600;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    sun.shadow.radius = 3;
    this.sun = sun;
    this.range = range;
  }

  /** Keeps the shadow area on `focus` (a Vector3); the sun's direction stays the same. */
  follow(focus, sunDir) {
    if (!this.sun) return;
    // Snap to shadow texels, so shadow edges do not crawl while walking.
    const texel = (this.range * 2) / this.size;
    const fx = Math.round(focus.x / texel) * texel;
    const fz = Math.round(focus.z / texel) * texel;
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.position.set(fx, focus.y, fz).addScaledVector(sunDir, 600);
    this.sun.target.updateMatrixWorld();
  }

  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    this.target.setSize(Math.round(w * pr), Math.round(h * pr));
  }

  /** night 0..1 for the grade. */
  render(scene, camera, night = 0) {
    this.quad.material.uniforms.uNight.value = night;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.post, this.postCam);
  }

  dispose() {
    this.target.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }
}

/** Every mesh in obj casts (and, unless it is a Mii, receives) shadows. */
export function shadowsOn(obj, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = receive;
    }
  });
}
