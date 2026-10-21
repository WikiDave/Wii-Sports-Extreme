// The waypoint: a bobbing gold (or blue, or green) beacon above where the player must go, with a
// small label that follows it on screen ('Oma Mies · 34 m'). It is also drawn on the minimap and on
// the big map (an arrow at the rim when the target is off the map). Browser only.

const COLORS = { goal: '#ffd23f', tip: '#3fb6ef', ready: '#35e06a' };
// Minimap (see ui/minimap.js): 160 px show 520 m; the big map shows 1400 m on 640 px.
const MINI = { size: 160, scale: 160 / 520, rim: 70 };
const FULL = { size: 640, scale: 640 / 1400, centre: { x: 90, z: -20 }, extent: 700 };

export class Waypoint {
  constructor(ctx) {
    const T = ctx.THREE;
    this.THREE = T;
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.screen = ctx.screen;
    this.minimap = ctx.minimap;
    this.heightAt = ctx.heightAt;
    this.h = ctx.h;
    this.target = null; // { x, z, label, kind }
    this.kind = '';
    this.label = '';
    this.v = new T.Vector3();
    this.w = 1;
    this.hgt = 1;
    this.group = new T.Group();
    this.group.visible = false;
    this.mat = new T.MeshBasicMaterial({ color: COLORS.goal });
    const cone = new T.Mesh(new T.ConeGeometry(0.75, 1.8, 16), this.mat);
    cone.rotation.x = Math.PI;
    cone.position.y = 2.4;
    this.ringMat = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
    this.ring = new T.Mesh(new T.TorusGeometry(1.8, 0.16, 6, 30), this.ringMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.3;
    this.group.add(cone, this.ring);
    this.scene.add(this.group);
    this.pin = this.h('div', { class: 'ms-pin', hidden: true });
    this.screen.append(this.pin);
    this.ro = new ResizeObserver(() => {
      this.w = this.screen.clientWidth || 1;
      this.hgt = this.screen.clientHeight || 1;
    });
    this.ro.observe(this.screen);
  }

  /** target: { x, z, label, kind: 'goal' | 'tip' | 'ready' } or null. Cheap when unchanged. */
  setTarget(t) {
    if (!t) {
      this.target = null;
      this.group.visible = false;
      this.pin.hidden = true;
      return;
    }
    const moved = !this.target || this.target.x !== t.x || this.target.z !== t.z;
    this.target = t;
    if (moved) this.group.position.set(t.x, Math.max(0, this.heightAt(t.x, t.z)), t.z);
    if (t.kind !== this.kind) {
      this.kind = t.kind;
      this.mat.color.set(COLORS[t.kind] ?? COLORS.goal);
      this.pin.className = `ms-pin is-${t.kind}`;
    }
    this.label = t.label;
  }

  /** Every frame: bob, spin, place the label, draw on the maps. */
  update(t, player) {
    if (!this.target) return;
    const { x, z } = this.target;
    const d = Math.hypot(x - player.pos.x, z - player.pos.z);
    const near = d < 3.5;
    const base = Math.max(0, this.heightAt(x, z));
    this.group.position.y = base + Math.sin(t * 3) * 0.35;
    this.group.rotation.y = t * 1.6;
    this.group.visible = !near;
    this.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    this.v.set(x, base + 3.4, z).project(this.camera);
    const onScreen = this.v.z > -1 && this.v.z < 1;
    const show = onScreen && !near;
    this.pin.hidden = !show;
    if (show) {
      const px = (this.v.x * 0.5 + 0.5) * this.w;
      const py = (-this.v.y * 0.5 + 0.5) * this.hgt;
      this.pin.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -100%)`;
      const text = `${this.label} · ${Math.round(d)} m`;
      if (this.pin.textContent !== text) this.pin.textContent = text;
    }
    this.drawMaps(player);
  }

  drawMaps(player) {
    const m = this.minimap;
    const { x, z } = this.target;
    const px = player.pos.x;
    const pz = player.pos.z;
    if (m.mini) {
      const g = m.mini.getContext('2d');
      const c = MINI.size / 2;
      let dx = (x - px) * MINI.scale;
      let dz = (z - pz) * MINI.scale;
      const len = Math.hypot(dx, dz);
      if (len > MINI.rim) {
        dx = (dx / len) * MINI.rim;
        dz = (dz / len) * MINI.rim;
      }
      this.dot(g, c + dx, c + dz, len > MINI.rim, Math.atan2(dx, -dz));
    }
    if (m.big && m.full) {
      const g = m.full.getContext('2d');
      const fx = (x - FULL.centre.x + FULL.extent) * FULL.scale;
      const fz = (z - FULL.centre.z + FULL.extent) * FULL.scale;
      const cx = Math.min(FULL.size - 14, Math.max(14, fx));
      const cz = Math.min(FULL.size - 14, Math.max(14, fz));
      this.dot(g, cx, cz, false, 0);
    }
  }

  /** A gold dot (or an arrow at the rim when `edge`, pointing along `angle`). */
  dot(g, x, y, edge, angle) {
    g.save();
    g.translate(x, y);
    g.fillStyle = COLORS[this.kind] ?? COLORS.goal;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.5;
    g.beginPath();
    if (edge) {
      g.rotate(angle);
      g.moveTo(0, -9);
      g.lineTo(7, 6);
      g.lineTo(-7, 6);
    } else {
      g.arc(0, 0, 7, 0, Math.PI * 2);
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  dispose() {
    this.ro.disconnect();
    this.pin.remove();
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      o.geometry?.dispose();
    });
    this.mat.dispose();
    this.ringMat.dispose();
  }
}
