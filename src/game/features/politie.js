// Feature "politie" (6.7): the law of the island, escalating and readable.
//
// What it adds (the guards and the heat rules are in world/guards.js and police.js):
//   - the police post in Havenstad: talk to the desk for the wanted level, the bribe for agent Bram,
//     the disguise for the day and the messages of the police
//   - bushes and the hotel lobby to hide in (guards.hideSpots); swimming breaks a chase too
//   - police cars from heat level 3 that drive the roads with sirens, a checkpoint near Havenstad
//     (carry product and the heat goes up) and a roadblock from level 4
//   - raids on the morning after heat 3 or more: stock seized, unless the place has security upgrades
//     (state.ext.panden.security[id]); the message goes to the Politie app
//   - the arrest: a cutscene at the post, bail or a night in the cell; repeated catches raise the sentence
//   - the phone app "Politie" with the same panel as the desk
//   - rivals who taunt you when you walk past (world/rivalView.js walks them about)
//
// Save data: state.ext.politie (politie/state.js). Events it listens to: 'politie:arrest' (caught()
// then waits for the cutscene), 'newday' (raids). Events it emits: 'politie:radio' { guard, count, chase }
// when a guard calls the colleagues.

import { pol, logEvent, unreadInbox } from '../politie/state.js';
import { planRaids, applyRaids } from '../politie/raid.js';
import { openArrestScene } from '../politie/cutscene.js';
import { skipTime } from '../politie/arrest.js';
import { BAIL_OUT, MORNING, RADIO, CHECKPOINT_CLEAN, CHECKPOINT_SEARCHED, ROADBLOCK, HIDE_IN } from '../politie/texts.js';
import { PoliceCars } from '../politie/cars3d.js';
import { checkpointOutcome, CHECKPOINT_NEAR } from '../politie/cars.js';
import { placeBushes, hidingSpots, hideSpotAt } from '../politie/hide.js';
import { tauntFor, isThreat, TAUNT_GAP } from '../politie/taunts.js';
import { policePanel, policeAppPage } from '../politie/panel.js';
import { Speech } from '../politie/speech.js';
import { buildPoliceStation } from '../politie/visuals/station.js';
import { buildBushes } from '../politie/visuals/bushes3d.js';
import { STYLES } from '../politie/styles.js';
import { addHeat, carried, heatLevel } from '../police.js';
import { PATHS, pathDistance } from '../world/zones.js';
import { RIVALS } from '../data/rivals.js';
import { unregisterApp } from '../phoneApps.js';

const POST_SEARCH = { x: 236, z: 40 }; // the police post is built near here, in Havenstad
const DOOR_OFFSET = 4.6; // the front door is this far in front of the post's centre (+z)
const TAUNT_RANGE = 14; // metres: the rival talks to you from here
const FIRST_TAUNT = 6; // seconds before the first taunt

/** A dry spot in Havenstad for the post: away from paths and other buildings. */
function findPostSpot({ heightAt, zoneAt, colliders }, from) {
  for (let i = 0; i < 900; i++) {
    const a = i * 2.4;
    const r = 6 + i * 0.22;
    const x = from.x + Math.cos(a) * r;
    const z = from.z + Math.sin(a) * r;
    const y = heightAt(x, z);
    if (zoneAt(x, z) !== 'haven' || y < 2.4 || y > 6.5) continue;
    if (pathDistance(x, z) < 14) continue;
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 8)) continue;
    return { x, z, y };
  }
  return { x: from.x, z: from.z, y: Math.max(2.5, heightAt(from.x, from.z)) };
}

export default {
  id: 'politie',
  install(ctx) {
    const { game, scene, player, props, interactions, guards, rival, audio, toast, h, modal, heightAt, zoneAt, follow, screen, camera, shadowsOn, registerApp, addStyle } = ctx;
    addStyle(STYLES);
    pol(game.state);
    const offs = [];
    const timers = [];
    const undo = [];

    // ------------------------------------------------------------ the police post and its desk
    const post = findPostSpot({ heightAt, zoneAt, colliders: props.colliders }, POST_SEARCH);
    const station = buildPoliceStation();
    station.group.position.set(post.x, post.y - 0.3, post.z);
    scene.add(station.group);
    shadowsOn(station.group);
    const postCollider = { x: post.x, z: post.z, r: 6 };
    props.colliders.push(postCollider);
    const door = { x: post.x, z: post.z + DOOR_OFFSET };
    const desk = interactions.add({ x: door.x, z: door.z, r: 6.5, label: 'Politiebureau', run: () => openDesk() });
    undo.push(() => {
      scene.remove(station.group);
      const i = props.colliders.indexOf(postCollider);
      if (i >= 0) props.colliders.splice(i, 1);
      const j = interactions.items.indexOf(desk);
      if (j >= 0) interactions.items.splice(j, 1);
    });

    const openDesk = () => {
      const p = policePanel(game, { h, toast });
      modal({
        title: 'Politiebureau Havenstad',
        body: h('div', {}, h('p', { class: 'pz-scene' }, 'Agent Bram kijkt op van zijn koffie. "Wat komt u doen? Ik heb het druk, hoor."'), p.el),
        actions: [{ label: 'Sluiten' }],
        wide: true,
      });
    };

    // ------------------------------------------------------------ places to hide
    const hotel = props.colliders.find((c) => c.hotel)?.hotel ?? null;
    const bushPlaces = placeBushes(Math.random, { heightAt, pathDistance, colliders: props.colliders, n: 16 });
    const bushes = buildBushes(bushPlaces);
    scene.add(bushes);
    guards.hideSpots = hidingSpots({ hotel, bushes: bushPlaces });
    undo.push(() => {
      scene.remove(bushes);
      guards.hideSpots = [];
    });
    let lastHide = null;

    // ------------------------------------------------------------ police cars and the roadblock
    let sirenStep = 0;
    const cars = new PoliceCars(scene, {
      lines: [PATHS[0], PATHS[5]],
      checkpoint: { line: 0, seg: 3, f: 0.5 },
      roadblock: { line: 0, seg: 1, f: 0.5 },
      heightAt,
      colliders: props.colliders,
      onCheckpoint: () => checkpoint(),
      onRoadblock: () => toast(ROADBLOCK),
      onSiren: (d) => {
        sirenStep++;
        audio.tone(sirenStep % 2 ? 660 : 880, 0.42, { type: 'triangle', vol: 0.02 + 0.04 * (1 - Math.min(1, d / 90)) });
      },
    });
    undo.push(() => cars.dispose());

    /** A car stops at the checkpoint: a search when you are near and carry product. */
    const checkpoint = () => {
      const p = player.pos;
      const near = Math.hypot(p.x - cars.cpPos.x, p.z - cars.cpPos.z) < CHECKPOINT_NEAR;
      const out = checkpointOutcome(carried(game.state), near);
      if (!out) return;
      if (out.searched) {
        addHeat(game, out.heat);
        logEvent(game.state, 'controle', 'Controle bij de brug: de agent keek in je tas.');
        toast(CHECKPOINT_SEARCHED);
      } else toast(CHECKPOINT_CLEAN);
    };

    // ------------------------------------------------------------ events: radio, raids, arrests
    offs.push(game.on('politie:arrest', () => {})); // a listener: caught() waits for the cutscene
    offs.push(
      game.on('politie:radio', ({ guard, count }) => {
        audio.play('alert');
        if (count > 0) toast(RADIO(guard));
      }),
    );
    offs.push(
      game.on('newday', () => {
        const plans = planRaids(game.state, heatLevel(game.state), Math.random);
        if (!plans.length) return;
        const msgs = applyRaids(game, plans);
        audio.play('alarm');
        timers.push(setTimeout(() => toast(`🚔 ${msgs[0].text}${msgs.length > 1 ? ` (+${msgs.length - 1} meer)` : ''}`), 3600));
      }),
    );

    let cutscene = false;
    const moveToPost = () => {
      const z = door.z + 2.8;
      player.pos.set(door.x, Math.max(0, heightAt(door.x, z)), z);
      player.group.position.copy(player.pos);
      player.vy = 0;
      player.grounded = true;
      follow.snap(player);
    };
    const openArrest = () => {
      cutscene = true;
      openArrestScene({
        game,
        h,
        modal,
        onDone: (r) => {
          skipTime(game, r);
          cutscene = false;
          moveToPost();
          toast(r.bail ? BAIL_OUT : MORNING);
        },
      });
    };

    // ------------------------------------------------------------ rival taunts
    const speech = new Speech(screen, camera, h);
    undo.push(() => speech.dispose());
    let tauntIn = FIRST_TAUNT;
    const taunts = (dt) => {
      const r = game.state.rival;
      const mii = rival.mii;
      if (!r || !mii) {
        tauntIn = FIRST_TAUNT;
        return;
      }
      const near = Math.hypot(mii.group.position.x - player.pos.x, mii.group.position.z - player.pos.z) < TAUNT_RANGE;
      if (!near) return;
      tauntIn -= dt;
      if (tauntIn > 0) return;
      tauntIn = TAUNT_GAP[0] + Math.random() * (TAUNT_GAP[1] - TAUNT_GAP[0]);
      const name = RIVALS.find((x) => x.id === r.id)?.name ?? 'Rivaal';
      const threat = isThreat();
      speech.say(name, tauntFor(r.id, Math.random, threat), mii.group.position);
      if (threat && carried(game.state) > 0) {
        addHeat(game, 0.25);
        logEvent(game.state, 'dreiging', `${name} dreigde de bewaking te bellen.`);
      }
    };

    // ------------------------------------------------------------ phone app
    registerApp({
      id: 'politie',
      label: 'Politie',
      icon: '🚓',
      color: '#2f5fd0',
      badge: (g) => unreadInbox(g.state),
      render: ({ page, game: g, h: hh, toast: tt }) => page('Politie', policeAppPage(g, { h: hh, toast: tt }).el),
    });
    undo.push(() => unregisterApp('politie'));

    // ------------------------------------------------------------ the frame
    return {
      update(t, dt, paused) {
        const s = game.state;
        if (!paused && !cutscene && pol(s).pending) openArrest();
        if (!paused) {
          cars.update(dt, t, player.pos, heatLevel(s));
          taunts(dt);
          const hideNow = hideSpotAt(guards.hideSpots, player.pos.x, player.pos.z);
          if (hideNow !== lastHide) {
            lastHide = hideNow;
            if (hideNow && (guards.chasing || guards.list.some((g) => g.suspicion > 0.05))) toast(HIDE_IN(hideNow.kind));
          }
        }
        speech.update(dt, screen.clientWidth || 1, screen.clientHeight || 1);
      },
      dispose() {
        offs.forEach((off) => off());
        timers.forEach((id) => clearTimeout(id));
        for (const fn of undo.reverse()) {
          try {
            fn();
          } catch (err) {
            console.error('politie dispose', err);
          }
        }
      },
    };
  },
};
