// A small 3D viewport that shows one Mii on a turntable: drag to turn it,
// the camera glides between a face close-up and a full-body view.

import * as THREE from 'three';

/** Bright, soft lighting like the Wii Mii renders: key light from the front left. */
export function addStudioLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 2.1));
  const key = new THREE.DirectionalLight(0xfffbf0, 1.9);
  key.position.set(-1.4, 1.6, 4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(3, 0.5, 2);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(0, 2.5, -4);
  scene.add(key, fill, rim);
}

let shadowTexture = null;
export function shadowBlob(size = 1.3) {
  if (!shadowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(40,52,70,0.34)');
    grad.addColorStop(0.55, 'rgba(40,52,70,0.16)');
    grad.addColorStop(1, 'rgba(40,52,70,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    shadowTexture = new THREE.CanvasTexture(c);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * 0.8),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}

/**
 * Camera target and distance that frame a Mii's face or whole body,
 * for a camera with vertical field of view fov (degrees) and the given aspect.
 */
export function framing(model, view, fov = 26, aspect = 1) {
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanH = tanV * aspect;
  if (view === 'face' || !model.parts) {
    return { target: new THREE.Vector3(0, model.headY - 0.02, 0), dist: Math.max(0.78 / tanV, 0.64 / tanH) };
  }
  const top = model.headY + 0.68;
  return { target: new THREE.Vector3(0, top / 2 - 0.02, 0), dist: Math.max((top * 0.56) / tanV, 0.8 / tanH) };
}

export class MiiStage {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'stage-canvas';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.05, 60);
    addStudioLights(this.scene);
    this.turntable = new THREE.Group();
    this.scene.add(this.turntable);
    this.scene.add(shadowBlob());

    this.model = null;
    this.view = 'body';
    this.target = new THREE.Vector3(0, 1, 0);
    this.dist = 6;
    this.camTarget = this.target.clone();
    this.camDist = this.dist;
    this.spin = 0;
    this.spinVel = 0;
    this.nextBlink = 2;
    this.blinkUntil = 0;
    this.running = true;
    this.clock = new THREE.Clock();

    this.bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  setModel(model) {
    if (this.model) this.turntable.remove(this.model.group);
    this.model = model;
    if (model) this.turntable.add(model.group);
    this.refocus(true);
  }

  setView(view, instant = false) {
    this.view = view;
    this.refocus(instant);
  }

  /** Re-aims the camera, e.g. after the Mii got taller. */
  refocus(instant = false) {
    if (!this.model) return;
    const f = framing(this.model, this.view, this.camera.fov, this.camera.aspect);
    this.target.copy(f.target);
    this.dist = f.dist;
    if (instant) {
      this.camTarget.copy(this.target);
      this.camDist = this.dist;
    }
  }

  resetTurn() {
    this.spinVel = 0;
    this.spinTo = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2;
  }

  bindPointer() {
    let last = null;
    this.onDown = (e) => {
      last = e.clientX;
      this.spinVel = 0;
      this.spinTo = null;
      this.canvas.setPointerCapture?.(e.pointerId);
    };
    this.onMove = (e) => {
      if (last == null) return;
      const dx = e.clientX - last;
      last = e.clientX;
      this.spin += dx * 0.012;
      this.spinVel = dx * 0.012;
    };
    this.onUp = () => {
      last = null;
    };
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.refocus();
  }

  frame() {
    if (!this.running) return;
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    if (this.spinTo != null) {
      this.spin += (this.spinTo - this.spin) * Math.min(1, dt * 6);
      if (Math.abs(this.spinTo - this.spin) < 0.001) this.spinTo = null;
    } else {
      this.spin += this.spinVel;
      this.spinVel *= Math.pow(0.04, dt);
    }
    this.turntable.rotation.y = this.spin;

    const k = 1 - Math.pow(0.002, dt);
    this.camTarget.lerp(this.target, k);
    this.camDist += (this.dist - this.camDist) * k;
    this.camera.position.set(this.camTarget.x, this.camTarget.y + this.camDist * 0.05, this.camTarget.z + this.camDist);
    this.camera.lookAt(this.camTarget);

    if (this.model) {
      this.model.idle(t);
      if (t > this.nextBlink) {
        this.blinkUntil = t + 0.13;
        this.nextBlink = t + 2 + Math.random() * 3.5;
      }
      this.model.setBlink(t < this.blinkUntil);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    this.resizeObserver.disconnect();
    if (this.model) this.turntable.remove(this.model.group);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
