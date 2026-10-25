// Customers in the world. Each one follows a day of their own (klanten/timeline.js: position is
// a function of the game clock, so nothing is simulated), and walks between places along the
// footpaths. Only the nearest few get a 3D Mii (a small pool, models are kept for a while so a
// customer who comes back does not need to be built again). Talk to one: "Praat met <name>";
// knock on the door of one who is at home: "Klop aan bij <name>".

import { shadowsOn } from './render.js';
import { MiiModel } from '../../mii/model.js';
import { MII_SCALE } from '../player.js';
import { CUSTOMERS } from '../data/customers.js';
import { isUnlocked, record, boycotted, wantsToday } from '../customers.js';
import { activeRequest } from '../phone.js';
import { buildGraph, buildWorld } from '../klanten/places.js';
import { dayTimeline, locate, slotIn } from '../klanten/timeline.js';
import { pickVisible } from '../klanten/visible.js';
import { lineFor } from '../klanten/lines.js';
import { miiFor } from '../klanten/looks.js';
import { setLiveWorld } from '../klanten/live.js';
import { animateBlink, animateIdle, animateWalk, animateWave } from '../klanten/animate.js';
import { tierOf } from '../klanten/tiers.js';
import { heightAt } from './island.js';
import { bridgeTop } from './zones.js';

const MAX_SHOWN = 8; // Miis on screen at the same time
const MAX_SHOWN_PHONE = 6;
const RADIUS = 110; // metres
const GREET = 7.5; // they notice you from here
const CACHE = 12; // models kept (shown and hidden)
const TAG_RANGE = 14;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class CustomerView {
  /**
   * spots: { strand, haven } free places next to the beach stand and the market (customers gather
   * there). onTalk(customer) opens the deal; the customer it gets has `spot` (where they stand now,
   * for the rival's prices) and `visit` ('straat' or 'deur').
   */
  constructor(scene, spots, interactions, game, onTalk, { phone = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches } = {}) {
    this.scene = scene;
    this.game = game;
    this.spots = spots;
    this.interactions = interactions;
    this.onTalk = onTalk;
    this.bubbles = null; // set by the klanten feature (speech bubbles and name tags)
    this.isPaused = () => !!document.querySelector('.modal-backdrop'); // the feature gives ctx.isPaused
    this.world = buildWorld({ spots });
    setLiveWorld(this.world);
    this.version = 0;
    this.maxShown = phone ? MAX_SHOWN_PHONE : MAX_SHOWN;
    this.models = new Map(); // id -> { mii, top, used }
    this.lastT = 0;
    this.frame = 0;
    this.picked = [];
    this.dist = new Float64Array(MAX_SHOWN);
    this.tagList = [];
    this.entries = CUSTOMERS.map((c, i) => {
      const e = {
        c,
        id: i,
        loc: {},
        x: 0, z: 0, y: 0, px: 0, pz: 0,
        known: false, indoors: true, ok: false, shown: false, knockable: false,
        tl: null, tlDay: -1, tlVer: -1, stamp: -1,
        rot: 0, phase: i * 1.7, blinkAt: 1 + i * 0.37, lastGreet: -999, waveUntil: 0, speedNow: 0,
        model: null, tag: c.name, flag: '', doorY: 0,
        doorTag: { c: { id: `door:${c.id}` }, tag: `🏠 ${c.name}`, flag: '' },
      };
      e.talk = interactions.add({ x: 0, z: 0, r: 3.4, label: `Praat met ${c.name}`, enabled: () => e.shown && !e.indoors, run: () => this.talkTo(e, false) });
      e.knock = interactions.add({ x: 0, z: 0, r: 3.6, label: `Klop aan bij ${c.name}`, enabled: () => e.knockable, run: () => this.talkTo(e, true) });
      return e;
    });
    this.placeDoors();
    this.refresh();
    this.off = [game.on('change', () => this.refresh()), game.on('newday', () => this.refresh())];
  }

  /** Front doors and extra places of the real island (houses, hotel); customers re-plan their routes. */
  configure({ homes = this.world.homes, places = {}, colliders = null, isLand = null } = {}) {
    this.world = buildWorld({ spots: this.spots, homes, places, colliders, graph: buildGraph(undefined, { isLand }) });
    setLiveWorld(this.world);
    this.version++;
    this.placeDoors();
  }

  placeDoors() {
    for (const e of this.entries) {
      const door = slotIn(this.world, e.c, 'thuis');
      e.knock.x = door.x;
      e.knock.z = door.z;
      e.doorY = Math.max(heightAt(door.x, door.z), 0);
    }
  }

  /** Who is known, who waits for their order: recomputed when the game state changes. */
  refresh() {
    const s = this.game.state;
    const rank = this.game.rank;
    for (const e of this.entries) {
      e.known = isUnlocked(s, e.c, rank);
      if (!e.known) continue;
      const rec = record(s, e.c.id);
      e.tag = `${tierOf(rec.loyalty).icon} ${e.c.name}`;
      e.flag = activeRequest(s, e.c.id) ? '📦' : '';
      e.served = !wantsToday(s, e.c) && !boycotted(s, e.c);
      e.angry = boycotted(s, e.c);
      e.trust = rec.loyalty;
    }
  }

  talkTo(e, door) {
    const near = (spot) => spot && Math.hypot(e.x - spot.x, e.z - spot.z) < 32;
    const spot = door ? null : near(this.spots.strand) ? 'strand' : near(this.spots.haven) ? 'haven' : null;
    this.onTalk(Object.create(e.c, { spot: { value: spot }, visit: { value: door ? 'deur' : 'straat' } }));
  }

  model(e) {
    let m = this.models.get(e.c.id);
    if (m) return m;
    if (this.madeThisFrame) return null; // one new Mii per frame at most
    this.madeThisFrame = true;
    const mii = new MiiModel(structuredClone(miiFor(e.c)));
    mii.group.scale.setScalar(MII_SCALE);
    mii.group.visible = false;
    shadowsOn(mii.group, false);
    this.scene.add(mii.group);
    m = { mii, top: (mii.headY + 1.15) * MII_SCALE, used: this.frame };
    this.models.set(e.c.id, m);
    // Over the limit: drop the model that was needed longest ago and is not on screen.
    if (this.models.size > CACHE) {
      let oldest = null;
      for (const [id, x] of this.models) {
        if (x === m || this.entries.find((q) => q.c.id === id).shown) continue;
        if (!oldest || x.used < oldest[1].used) oldest = [id, x];
      }
      if (oldest) {
        this.scene.remove(oldest[1].mii.group);
        oldest[1].mii.dispose();
        this.models.delete(oldest[0]);
      }
    }
    return m;
  }

  /** Per frame: where everybody is, who is shown, how they stand and walk. */
  update(t, playerPos) {
    const dt = Math.min(0.1, Math.max(0.001, t - this.lastT));
    this.lastT = t;
    this.frame++;
    this.madeThisFrame = false;
    const s = this.game.state;
    const hour = s.minutes / 60;
    const awake = hour >= 7 && hour < 23;
    for (const e of this.entries) {
      if (!e.known) {
        e.ok = false;
        e.knockable = false;
        continue;
      }
      if (e.tlDay !== s.day || e.tlVer !== this.version) {
        e.tl = dayTimeline(this.world, e.c, s.day);
        e.tlDay = s.day;
        e.tlVer = this.version;
      }
      const loc = locate(this.world, e.c, e.tl, s.minutes, e.loc);
      e.x = loc.x;
      e.z = loc.z;
      e.indoors = loc.indoors;
      e.ok = !loc.indoors;
      e.knockable = loc.indoors && awake && (e.tl.homeAll || (e.trust ?? 0) >= 10);
    }
    pickVisible(this.entries, playerPos.x, playerPos.z, this.maxShown, RADIUS, this.picked, this.dist);
    for (const i of this.picked) this.entries[i].stamp = this.frame;
    for (const e of this.entries) if (e.shown && e.stamp !== this.frame) this.hide(e);
    this.tagList.length = 0;
    for (const i of this.picked) {
      const e = this.entries[i];
      if (!e.shown && !this.show(e)) continue;
      this.pose(e, t, dt, playerPos);
      e.talk.x = e.x;
      e.talk.z = e.z;
      if (Math.hypot(e.x - playerPos.x, e.z - playerPos.z) < TAG_RANGE) this.tagList.push(e);
    }
    // Somebody at home: a tag over their front door when you walk by.
    for (const e of this.entries) {
      if (this.tagList.length >= 3) break;
      if (e.knockable && Math.hypot(e.knock.x - playerPos.x, e.knock.z - playerPos.z) < TAG_RANGE) this.tagList.push(e.doorTag);
    }
    this.bubbles?.setTags(this.tagList);
    if (!this.madeThisFrame && this.frame % 24 === 0) this.prewarm(playerPos);
  }

  /** Builds the Mii of the nearest customer who is out but not built yet, in a quiet moment (a model takes ~25 ms). */
  prewarm(player) {
    if (this.models.size >= this.maxShown + 3) return;
    let best = null;
    let bestD = (RADIUS * 1.6) ** 2;
    for (const e of this.entries) {
      if (!e.ok || this.models.has(e.c.id)) continue;
      const d = (e.x - player.x) ** 2 + (e.z - player.z) ** 2;
      if (d < bestD) [best, bestD] = [e, d];
    }
    if (best) this.model(best);
  }

  show(e) {
    const m = this.model(e);
    if (!m) return false;
    e.model = m;
    m.used = this.frame;
    m.mii.group.visible = true;
    e.shown = true;
    e.px = e.x;
    e.pz = e.z;
    e.speedNow = 0;
    e.rot = Math.atan2(e.loc.hx, e.loc.hz);
    return true;
  }

  hide(e) {
    e.shown = false;
    if (e.model) e.model.mii.group.visible = false;
    e.model = null;
  }

  pose(e, t, dt, player) {
    const { mii } = e.model;
    e.model.used = this.frame;
    e.y = bridgeTop(e.x, e.z) ?? Math.max(heightAt(e.x, e.z), 0); // on the bridge: its deck
    mii.group.position.set(e.x, e.y, e.z);
    // How fast they really move now (a paused game freezes the clock: they stand still then).
    const v = Math.hypot(e.x - e.px, e.z - e.pz) / dt;
    e.px = e.x;
    e.pz = e.z;
    e.speedNow += (Math.min(v, 6) - e.speedNow) * Math.min(1, dt * 8);
    const walking = e.speedNow > 0.25;
    const dp = Math.hypot(player.x - e.x, player.z - e.z);
    const near = dp < GREET;
    // Facing: their walking direction; standing, towards you when you are near.
    let want = Math.atan2(e.loc.hx, e.loc.hz);
    if (!walking && near) want = Math.atan2(player.x - e.x, player.z - e.z);
    e.rot += wrap(want - e.rot) * Math.min(1, dt * (walking ? 10 : 5));
    mii.group.rotation.y = e.rot;
    if (walking) animateWalk(mii, e, dt);
    else animateIdle(mii, e, t);
    // A wave and a word when you come close.
    if (near && t - e.lastGreet > 40 && e.ok && !this.isPaused()) {
      e.lastGreet = t;
      e.waveUntil = t + 2.4;
      this.greet(e);
    }
    if (t < e.waveUntil) animateWave(mii, t);
    animateBlink(mii, e, t);
  }

  /** What they call out when you come near. */
  greet(e) {
    if (!this.bubbles) return;
    const event = e.angry ? 'boycott' : e.flag ? 'request' : e.served ? 'again' : 'greet';
    this.bubbles.say(e.c.id, e.c.name, lineFor(e.c.voice, event));
  }

  /** Where a speech bubble goes: above the head of a shown customer. Fills out and returns whether they are shown. */
  anchor(id, out) {
    if (id.startsWith('door:')) {
      const d = this.entries.find((x) => x.c.id === id.slice(5));
      if (!d?.knockable) return false;
      out.x = d.knock.x;
      out.y = d.doorY + 2.4;
      out.z = d.knock.z;
      return true;
    }
    const e = this.entries.find((x) => x.c.id === id);
    if (!e?.shown || !e.model) return false;
    out.x = e.x;
    out.y = e.y + e.model.top;
    out.z = e.z;
    return true;
  }

  /** Where one customer is now (for other features, e.g. a mission to find somebody), or null if unknown to the player. */
  locationOf(id) {
    const e = this.entries.find((x) => x.c.id === id);
    return e?.known ? { x: e.x, z: e.z, place: e.loc.place, moving: !!e.loc.moving, indoors: e.indoors, shown: e.shown } : null;
  }

  /** The Miis on screen by customer id (what this class exposed before customers walked). */
  get minis() {
    return new Map(this.entries.filter((e) => e.shown && e.model).map((e) => [e.c.id, e.model.mii]));
  }

  /** For tests and tools: where everybody is. */
  debug() {
    return this.entries.map((e) => ({ id: e.c.id, known: e.known, x: e.x, z: e.z, y: e.y, place: e.loc.place, moving: !!e.loc.moving, indoors: e.indoors, shown: e.shown }));
  }

  dispose() {
    setLiveWorld(null);
    this.off.forEach((f) => f());
    for (const e of this.entries) {
      for (const item of [e.talk, e.knock]) {
        const i = this.interactions.items.indexOf(item);
        if (i >= 0) this.interactions.items.splice(i, 1);
      }
    }
    for (const m of this.models.values()) {
      this.scene.remove(m.mii.group);
      m.mii.dispose();
    }
    this.models.clear();
  }
}
