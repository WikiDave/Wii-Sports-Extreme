// The island guards: Miis in blue with a flashlight, a view cone and a suspicion meter above the
// head. Each has a personality (politie/personality.js): the lazy one stands around, the alert one
// sees and hears more, and the buddy walks next to the guard before him.
//
// A guard who sees you carrying product grows suspicious (the meter fills) and frisks you. On the
// highest level a guard who sees you gives chase, and calls the colleagues nearby on the radio.
// Guards come to look when you run past them or when a deal happens near them. You can break a
// chase by hiding (the hut, a bush, the hotel lobby) or by swimming: they cannot swim.

import * as THREE from 'three';
import { shadowsOn } from './render.js';
import { MiiModel } from '../../mii/model.js';
import { OFFICIAL_MIIS } from '../../mii/official.js';
import { MII_SCALE } from '../player.js';
import { heightAt } from './island.js';
import { GUARDS, MAX_LEVEL, heatLevel, carried, inCone, viewRange } from '../police.js';
import { viewFactor } from '../weather.js';
import { PERSONAS, personaOf, partnerOf, hearRadius, radioRecipients } from '../politie/personality.js';
import { inHideSpot } from '../politie/hide.js';
import { isDisguised, DISGUISE_VIEW } from '../politie/shop.js';
import { makeFlashlight, setLensGlow, beamMaterial, setBeam, makeMeter, paintMeter, disposeMeter } from '../politie/visuals/guardVisuals.js';

const LOOKS = ['Gast A', 'Gast B', 'Gast C', 'Gast D', 'Gast E', 'Gast F', 'Kentaro'];
const CHASE = 7.4; // a little slower than the player running (8.5)
const FOV = 0.95;
const LOSE_AFTER = 7; // seconds out of sight to escape a chase
const RADIO_RANGE = 42; // metres a guard can call colleagues from
const RADIO_TIME = 14; // seconds the colleagues come to help
const RADIO_COOLDOWN = 20;
const INVESTIGATE_TIME = 4; // seconds a guard looks around after a noise
const RUN_SPEED = 7.2; // running faster than this is heard

function coneMesh() {
  const geo = new THREE.CircleGeometry(1, 20, -Math.PI / 2 - FOV / 2, FOV);
  // Lay it flat; the fan then points along +z, the way the guard faces.
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, beamMaterial());
  m.renderOrder = 2;
  return m;
}

export class Guards {
  /** centres: patrol points [{x,z}]; colliders as for the player. */
  constructor(scene, game, colliders, centres) {
    this.scene = scene;
    this.game = game;
    this.colliders = colliders;
    this.centres = centres;
    this.list = [];
    this.chasing = false;
    this.unseen = 0;
    this.hideSpots = []; // set by the politie feature: bushes and the hotel lobby
    this.viewNow = viewRange(0);
    this.dealHeard = false;
    this.off = game.on('deal', () => (this.dealHeard = true));
    this.sync();
  }

  free(x, z) {
    if (heightAt(x, z) < 0.4) return false;
    return this.colliders.every((c) => (x - c.x) ** 2 + (z - c.z) ** 2 > (c.r + 0.5) ** 2);
  }

  /** A random free waypoint near one of the patrol centres. */
  waypoint() {
    for (let i = 0; i < 30; i++) {
      const c = this.centres[Math.floor(Math.random() * this.centres.length)];
      const x = c.x + (Math.random() - 0.5) * 70;
      const z = c.z + (Math.random() - 0.5) * 70;
      if (this.free(x, z)) return { x, z };
    }
    return { ...this.centres[0] };
  }

  /** Matches the number of guards to the heat level. */
  sync() {
    const want = GUARDS[heatLevel(this.game.state)];
    while (this.list.length < want) {
      const i = this.list.length;
      const persona = personaOf(i);
      const name = LOOKS[i % LOOKS.length];
      const data = structuredClone(OFFICIAL_MIIS.find((m) => m.name === name));
      data.favoriteColor = 5; // blue uniform
      const mii = new MiiModel(data);
      mii.group.scale.setScalar(MII_SCALE);
      const start = this.waypoint();
      const cone = coneMesh();
      const flash = makeFlashlight();
      // In the right hand: armR is the shoulder joint (0.85 m above the feet), the hand hangs just below it.
      flash.group.position.set(0, -0.2, 0.4);
      mii.parts.armR.add(flash.group);
      const meter = makeMeter();
      shadowsOn(mii.group, false);
      this.scene.add(mii.group, cone, meter.sprite);
      this.list.push({
        i,
        name,
        persona,
        P: PERSONAS[persona],
        partner: partnerOf(i, persona),
        mii,
        cone,
        flash,
        meter,
        x: start.x,
        z: start.z,
        heading: 0,
        target: this.waypoint(),
        suspicion: 0,
        cooldown: 0,
        phase: Math.random() * 6,
        speed: 0,
        aim: 0,
        wait: 0,
        investigate: null,
        alert: 0,
        lastSeen: null,
        radioCool: 0,
      });
    }
    while (this.list.length > want) {
      const g = this.list.pop();
      this.scene.remove(g.mii.group, g.cone, g.meter.sprite);
      g.mii.dispose();
      g.cone.geometry.dispose();
      g.cone.material.dispose();
      disposeMeter(g.meter);
    }
  }

  /** The view range of the guards now (weather, heat, disguise). */
  currentView() {
    const s = this.game.state;
    return viewRange(heatLevel(s), viewFactor(s.day)) * (isDisguised(s) ? DISGUISE_VIEW : 1);
  }

  /** Whether any guard sees point p (for deals in plain sight). */
  sees(p) {
    const view = this.currentView();
    return this.list.some((g) => inCone(g.x, g.z, g.heading, p.x, p.z, view * g.P.view, FOV));
  }

  /** A noise at (x, z): the guards near it walk over to look (kind: 'run' | 'deal'). */
  hear(x, z, kind) {
    if (this.chasing) return;
    for (const g of this.list) {
      if (Math.hypot(x - g.x, z - g.z) > hearRadius(g.P, kind)) continue;
      if (g.investigate) Object.assign(g.investigate, { x, z, t: INVESTIGATE_TIME });
      else g.investigate = { x, z, t: INVESTIGATE_TIME };
    }
  }

  /** A guard calls the colleagues close by: they come to where you were seen. */
  radio(from, p) {
    from.radioCool = RADIO_COOLDOWN;
    const helpers = radioRecipients(this.list, from, RADIO_RANGE);
    for (const g of helpers) {
      g.alert = RADIO_TIME;
      g.lastSeen = { x: p.x, z: p.z };
    }
    this.game.emit('politie:radio', { guard: from.name, count: helpers.length, chase: this.chasing });
  }

  /**
   * One frame. player: the Player. hidden(pos): true when the player is hiding (in the hut).
   * on: { frisk(), caught(), escaped(), chase() } callbacks.
   */
  update(dt, player, hidden, on) {
    const s = this.game.state;
    const level = heatLevel(s);
    const view = this.currentView();
    this.viewNow = view;
    const p = player.pos;
    const hid = hidden(p) || !!player.swimming || inHideSpot(this.hideSpots, p.x, p.z);
    const hasGoods = carried(s) > 0;
    const disguised = isDisguised(s);
    if (this.dealHeard) {
      this.dealHeard = false;
      this.hear(p.x, p.z, 'deal');
    }
    if (!hid && player.speed > RUN_SPEED) this.hear(p.x, p.z, 'run');
    let seenNow = false;
    for (const g of this.list) {
      g.cooldown = Math.max(0, g.cooldown - dt);
      g.radioCool = Math.max(0, g.radioCool - dt);
      g.alert = Math.max(0, g.alert - dt);
      const range = (this.chasing ? view * 1.5 : view) * g.P.view;
      const sees = !hid && inCone(g.x, g.z, g.heading, p.x, p.z, range, this.chasing ? FOV * 1.6 : FOV);
      if (sees) seenNow = true;
      if (!this.chasing && sees && level >= MAX_LEVEL) {
        this.chasing = true;
        this.unseen = 0;
        on.chase();
        this.radio(g, p);
      }
      const dist = Math.hypot(p.x - g.x, p.z - g.z);
      let tx = g.target.x;
      let tz = g.target.z;
      let speed = 0;
      let looking = false;
      let hold = false;
      if (this.chasing) {
        tx = p.x;
        tz = p.z;
        speed = CHASE;
      } else if (sees && hasGoods && level >= 1 && !g.cooldown) {
        // Suspicious: stop, look at the player, then come and frisk.
        g.suspicion = Math.min(1, g.suspicion + dt * (0.5 + 0.15 * level) * g.P.suspect * (disguised ? 0.5 : 1));
        if (g.suspicion > 0.3 && g.radioCool <= 0) this.radio(g, p);
        tx = p.x;
        tz = p.z;
        speed = g.suspicion > 0.6 ? 4 : 0;
        if (g.suspicion >= 1 && dist < 2.5) {
          g.suspicion = 0;
          g.cooldown = 45;
          on.frisk();
        }
      } else {
        g.suspicion = Math.max(0, g.suspicion - dt * 0.3);
        if (g.alert > 0 && g.lastSeen) {
          tx = g.lastSeen.x;
          tz = g.lastSeen.z;
          speed = 3.4;
          looking = Math.hypot(tx - g.x, tz - g.z) < 1.5;
        } else if (g.investigate) {
          const inv = g.investigate;
          if (Math.hypot(inv.x - g.x, inv.z - g.z) > 1.2) {
            tx = inv.x;
            tz = inv.z;
            speed = 3;
          } else {
            looking = true;
            inv.t -= dt;
            if (inv.t <= 0) g.investigate = null;
          }
        } else if (g.partner !== null && this.list[g.partner]) {
          // The buddy walks just beside the guard before him.
          const m = this.list[g.partner];
          tx = m.x + Math.sin(m.heading + Math.PI / 2) * 2.4;
          tz = m.z + Math.cos(m.heading + Math.PI / 2) * 2.4;
          speed = Math.hypot(tx - g.x, tz - g.z) > 1.2 ? g.P.speed : 0;
        } else if (g.wait > 0) {
          g.wait -= dt; // a lazy guard stands still for a while
          hold = true;
        } else {
          speed = g.P.speed;
          if (Math.hypot(tx - g.x, tz - g.z) < 1.5) {
            g.wait = g.P.wait[0] + Math.random() * (g.P.wait[1] - g.P.wait[0]);
            g.target = this.waypoint();
          }
        }
      }
      // Turn towards the target (or look around), then walk.
      const dx = tx - g.x;
      const dz = tz - g.z;
      const d = Math.hypot(dx, dz);
      if (hold) {
        // standing still: keep the heading
      } else if (looking) g.heading += dt * 1.2;
      else {
        let turn = Math.atan2(dx, dz) - g.heading;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        g.heading += turn * Math.min(1, dt * (this.chasing ? 10 : 4));
      }
      g.speed += (speed - g.speed) * Math.min(1, dt * 6);
      if (d > 0.8 && g.speed > 0.05) {
        const nx = g.x + Math.sin(g.heading) * g.speed * dt;
        const nz = g.z + Math.cos(g.heading) * g.speed * dt;
        if (this.free(nx, nz)) [g.x, g.z] = [nx, nz];
        else if (this.free(nx, g.z)) g.x = nx;
        else if (this.free(g.x, nz)) g.z = nz;
        else if (!this.chasing && g.partner === null) g.target = this.waypoint();
      }
      if (this.chasing && Math.hypot(p.x - g.x, p.z - g.z) < 1.3) {
        this.chasing = false;
        on.caught();
        break;
      }
      this.pose(g, dt, view, sees || this.chasing || g.alert > 0 || g.suspicion > 0.05);
    }
    if (this.chasing) {
      this.unseen = seenNow ? 0 : this.unseen + dt;
      if (this.unseen > LOSE_AFTER || hid) {
        this.chasing = false;
        on.escaped();
      }
    }
    if (this.list.length !== GUARDS[heatLevel(s)]) this.sync();
  }

  pose(g, dt, view, aiming) {
    const y = heightAt(g.x, g.z);
    g.mii.group.position.set(g.x, y, g.z);
    g.mii.group.rotation.y = g.heading;
    const parts = g.mii.parts;
    const f = Math.min(1, g.speed / 4);
    g.phase += dt * (6 + g.speed * 1.1);
    const s = Math.sin(g.phase);
    // The flashlight arm lifts and points ahead while the guard is watching someone.
    g.aim += ((aiming ? 1 : 0) - g.aim) * Math.min(1, dt * 4);
    parts.legL.rotation.x = s * 0.55 * f;
    parts.legR.rotation.x = -s * 0.55 * f;
    parts.armL.rotation.x = -s * 0.5 * f;
    parts.armR.rotation.x = s * 0.5 * f * (1 - g.aim) - 1.35 * g.aim;
    g.mii.group.position.y += Math.abs(Math.cos(g.phase)) * 0.05 * f;
    const night = this.game.isNight;
    const mood = this.chasing ? 'chase' : aiming ? 'alert' : night ? 'night' : 'day';
    setBeam(g.cone.material, mood);
    setLensGlow(g.flash, night);
    const range = view * g.P.view * (this.chasing ? 1.5 : 1);
    g.cone.position.set(g.x, y + 0.06, g.z);
    g.cone.rotation.y = g.heading;
    g.cone.scale.setScalar(range);
    // The meter above the head: only while something is going on.
    const value = this.chasing ? 1 : Math.max(g.suspicion, g.alert > 0 ? 0.5 : 0);
    g.meter.sprite.visible = value > 0.02;
    if (g.meter.sprite.visible) {
      g.meter.sprite.position.set(g.x, y + 2.35, g.z);
      paintMeter(g.meter, value, this.chasing ? 'chase' : g.alert > 0 && g.suspicion < 0.05 ? 'radio' : 'verdacht');
    }
  }

  dispose() {
    this.off?.();
    for (const g of this.list) {
      g.mii.dispose();
      g.cone.geometry.dispose();
      g.cone.material.dispose();
      disposeMeter(g.meter);
    }
  }
}
