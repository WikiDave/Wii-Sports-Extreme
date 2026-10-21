// Feature "missies" (6.10): Oma Mies and her missions, the achievements, the skills and the
// first-day tutorial. Logic in src/game/missies/ (tracker.js is pure); this file wires it up.
//
// Save data: state.ext.missies (tracker.js emptyExt): chain, stats, achieved, skills, points, tutorial.
// The skills are read through skillBonus(state, id) (missies/skills.js). Hooks, all undone in dispose:
//   - player.update is wrapped: running uses breath (Uithoudingsvermogen), walking/swimming/jumping is counted
//   - guards.sees and guards.update are wrapped: Sluipen shrinks the view range (not while chasing)
//   - events: deal (Onderhandelen, Charme, sales), collected, frisked, caught, heat, newday, change,
//     klanten:refused, klanten:verklikt (see docs/FEATURES.md)
//   - economy.js and empire.js add bagBonus (Zware zak) to the stock limit
// Phone apps: Opdrachten, Prestaties, Vaardigheden. Interactions: 'Praat met Oma Mies'.
// Game events it emits: 'missies:klaar' { id } (a mission is ready to hand in), 'missies:prestatie' { id }.

import { registerApp, unregisterApp } from '../phoneApps.js';
import { STYLES } from '../missies/styles.js';
import { MISSIONS, PLACE_NAMES } from '../missies/data.js';
import { ensureExt, current, progressOf, describeGoal, evaluate, dialogue } from '../missies/tracker.js';
import {
  observeChange, observeDeal, observeNewDay, observeHeat, observeFrisk, observeCaught, observeCollected, observeBoycott,
  observeVerklikt, observeJump, observeBreath, observeNight, observeDepth, observeMove, markVisit, checkAchievements, applyBrew,
} from '../missies/stats.js';
import { BASE_RUN, skillBonus, skillLevel } from '../missies/skills.js';
import { STEPS, tutorialStep, tickHint, hideHint, skipTutorial } from '../missies/tutorial.js';
import { pierPoint, waterPoint, spotBeside } from '../missies/places.js';
import { createMentor, openMentor } from '../missies/mentor.js';
import { Waypoint } from '../missies/waypoint.js';
import { Hud } from '../missies/hud.js';
import { missionApps } from '../missies/apps.js';
import { record } from '../customers.js';
import { heatLevel, viewRange } from '../police.js';
import { viewFactor } from '../weather.js';
import { MINUTES_PER_SECOND, reportError } from '../state.js';

const NEAR_PLACE = 10; // metres: a place counts as visited
const TICK = 0.25; // seconds between the slower checks

export default {
  id: 'missies',
  install(ctx) {
    const { game, player, guards, interactions, props, heightAt, scene, hutPos, spots, audio, toast } = ctx;
    const ext = ensureExt(game); // old saves are caught up here
    const offs = [];
    ctx.addStyle(STYLES);
    const start = { x: player.pos.x, z: player.pos.z };

    // ---- places: Oma Mies beside the hut, the other spots from the island
    const item = (label) => interactions.items.find((i) => i.label === label) ?? null;
    const oma = spotBeside(heightAt, props.colliders, hutPos.x, hutPos.z);
    const mentorCollider = { x: oma.x, z: oma.z, r: 0.8 };
    props.colliders.push(mentorCollider);
    const places = {
      oma: { x: oma.x, z: oma.z },
      hut: hutPos,
      markt: item('Markt'),
      kantoor: item('Kantoor'),
      stations: item('Stations'),
      strand: spots.strand,
      steiger: pierPoint(heightAt),
      zee: waterPoint(heightAt, start.x, start.z),
    };

    // ---- Oma Mies: the 3D Mii, the talk, the hint for the dialogue
    const mentor = createMentor(scene, { x: oma.x, z: oma.z, y: Math.max(0, oma.y), fx: hutPos.x, fz: hutPos.z });
    let talking = false;
    const announceReady = () => {
      const m = current(ext);
      toast(`📜 Klaar: ${m.title}. Ga naar Oma Mies voor je beloning.`);
      audio.play('rank');
      hud.flash('Opdracht klaar!');
      game.emit('missies:klaar', { id: m.id });
    };
    const announceAchievements = (list) => {
      if (!list.length) return;
      toast(`🏆 ${list.map((a) => (a.hidden ? 'Geheime prestatie' : a.name)).join(', ')}`);
      audio.play('perfect');
      for (const a of list) game.emit('missies:prestatie', { id: a.id });
    };
    const talk = () => {
      if (document.querySelector('.modal-backdrop')) return;
      talking = true;
      let result;
      try {
        result = dialogue(game, ext);
      } finally {
        talking = false;
      }
      game.emit('change');
      if (result.handed) {
        audio.play('rank');
        hud.flash(`Beloning: ${result.handed.mission.title}`);
      }
      openMentor(mentor.data, result.lines, () => {
        if (evaluate(game, ext)) announceReady();
        refresh();
      });
    };
    const talkItem = interactions.add({ x: oma.x, z: oma.z, r: 3.4, label: 'Praat met Oma Mies', run: talk });

    // ---- HUD: the tracker, the tutorial hint, the banner
    const hud = new Hud(ctx, {
      onHideHint: () => {
        hideHint(ext);
        slow();
      },
      onSkipTutorial: () => {
        skipTutorial(ext);
        toast('Tutorial overgeslagen. Oma Mies vindt je het vanzelf wel.');
        slow();
      },
    });
    const waypoint = new Waypoint(ctx);

    const refresh = () => {
      const m = current(ext);
      const p = progressOf(game, ext, m);
      hud.setMission({
        kicker: ext.chain < MISSIONS.length ? `Opdracht ${ext.chain + 1} van ${MISSIONS.length}` : 'Vrije opdracht',
        title: m.title,
        text: ext.ready ? 'Klaar! Ga naar Oma Mies voor je beloning.' : describeGoal(m.goal),
        value: p.value,
        goal: p.goal,
        ready: ext.ready,
      });
    };

    // ---- the events that move the counters and the goals
    offs.push(
      game.on('change', () => {
        // Brouwen: batches started in the machines get the quality bonus (once per batch).
        applyBrew(game.state, skillLevel(game.state, 'brouwen'), skillBonus(game.state, 'brouwen'));
        observeChange(game, ext);
        if (!talking && evaluate(game, ext)) announceReady();
        announceAchievements(checkAchievements(game, ext));
        refresh();
      }),
      game.on('deal', (d) => {
        const s = game.state;
        const extra = Math.round(d.money * skillBonus(s, 'onderhandelen'));
        if (extra > 0) {
          game.addCash(extra);
          toast(`Onderhandelen: +€${extra}`);
        }
        const charm = skillBonus(s, 'charme');
        if (charm > 0) {
          const rec = record(s, d.customer);
          rec.loyalty = Math.min(100, (rec.loyalty ?? 0) + charm);
        }
        observeDeal(ext, d, { unseen: !guards.sees(player.pos) });
      }),
      game.on('collected', ({ items }) => observeCollected(ext, items)),
      game.on('frisked', () => observeFrisk(ext)),
      game.on('caught', () => observeCaught(ext)),
      game.on('heat', (level) => observeHeat(ext, level)),
      game.on('newday', () => {
        observeNewDay(game, ext);
        announceAchievements(checkAchievements(game, ext));
      }),
      game.on('klanten:refused', ({ boycott }) => boycott && observeBoycott(ext)),
      game.on('klanten:verklikt', () => observeVerklikt(ext)),
    );

    // ---- Uithoudingsvermogen (breath) and the walking, swimming and jumping counters. The base
    // method runs exactly once, so a failing counter never stops the Mii; the error is logged.
    // Walking, swimming and jumping are counted on foot only: a vehicle (player.external) drives the Mii.
    const baseUpdate = player.update;
    let stamina = BASE_RUN;
    let winded = false;
    player.update = (move, camYaw, dt, t) => {
      const onFoot = !player.external;
      let jump = false;
      try {
        const max = BASE_RUN + skillBonus(game.state, 'uithouding');
        stamina = Math.min(stamina, max);
        const moving = Math.hypot(move.x, move.y) > 0.3;
        if (move.run && moving && !winded) {
          stamina -= dt;
          if (stamina <= 0) {
            stamina = 0;
            winded = true;
            observeBreath(ext);
            toast('Buiten adem! Even wandelen, schat.');
          }
        } else {
          stamina = Math.min(max, stamina + dt * (moving ? 1.5 : 3));
          if (winded && stamina >= 4) winded = false;
        }
        if (winded) move.run = false;
        jump = !!move.jump && player.grounded && !player.swimming && onFoot;
      } catch (err) {
        reportError('Missies: breath', err);
      }
      const x0 = player.pos.x;
      const z0 = player.pos.z;
      baseUpdate.call(player, move, camYaw, dt, t);
      try {
        if (onFoot) observeMove(ext, Math.hypot(player.pos.x - x0, player.pos.z - z0), player.swimming);
        if (onFoot && player.swimming) observeDepth(ext, -heightAt(player.pos.x, player.pos.z));
        if (jump) observeJump(ext);
      } catch (err) {
        reportError('Missies: counters', err);
      }
    };

    // ---- Sluipen: the guards see you from less far (not while they chase you). If the bonus fails,
    // the guards see as without it (the base method), and the error is logged.
    const sneaks = (p) => {
      try {
        const bonus = skillBonus(game.state, 'sluipen');
        if (!bonus || guards.chasing) return false;
        const range = viewRange(heatLevel(game.state), viewFactor(game.state.day)) * (1 - bonus);
        return guards.list.every((g) => Math.hypot(g.x - p.x, g.z - p.z) > range);
      } catch (err) {
        reportError('Missies: Sluipen', err);
        return false;
      }
    };
    const baseSees = guards.sees;
    const baseGuards = guards.update;
    guards.sees = (p) => baseSees.call(guards, p) && !sneaks(p);
    guards.update = (dt, pl, hidden, on) => baseGuards.call(guards, dt, pl, (p) => hidden(p) || sneaks(p), on);

    // ---- the phone apps
    // Vaardigheden opens with a mission (its reward has unlock: 'vaardigheden').
    const apps = missionApps({ game, get: () => ensureExt(game) });
    const syncApps = () => {
      for (const a of apps) {
        const open = a.id !== 'vaardigheden' || ext.unlocks.includes('vaardigheden');
        if (open) registerApp(a);
        else unregisterApp(a.id);
      }
    };
    syncApps();

    // ---- the slower checks: tutorial, waypoint, visits
    const where = () => {
      const s = game.state;
      const st = ext.stats;
      const d = (p) => (p ? Math.hypot(p.x - player.pos.x, p.z - player.pos.z) : Infinity);
      return {
        moved: Math.hypot(player.pos.x - start.x, player.pos.z - start.z),
        swam: st.swim >= 3,
        nearOma: d(places.oma) < 6,
        nearMarkt: d(places.markt) < 16,
        citroen: s.inventory.citroen ?? 0,
        batches: st.batches,
        deals: st.deals,
      };
    };
    // The tutorial hint (only on day 1, see tutorial.js), the waypoint and the visits to places.
    // The tutorial hint points the way first; otherwise the mission does.
    let lastTip = null;
    const target = (tut) => {
      if (tut && !tut.hidden && tut.at && places[tut.at]) {
        const p = places[tut.at];
        return { x: p.x, z: p.z, label: PLACE_NAMES[tut.at], kind: 'tip' };
      }
      if (ext.ready) return { x: oma.x, z: oma.z, label: PLACE_NAMES.oma, kind: 'ready' };
      const m = current(ext);
      const p = m.at ? places[m.at] : null;
      if (p) return { x: p.x, z: p.z, label: PLACE_NAMES[m.at], kind: 'goal' };
      return null;
    };
    const slow = () => {
      const tut = tutorialStep(ext, where(), game.state.day);
      // A hint closes itself after a minute on screen (never nagging); the phone shows it again.
      if (tut && !tut.hidden && tickHint(ext, TICK)) tut.hidden = true;
      if (lastTip && !tut && ext.tutorial.done && ext.tutorial.step >= STEPS.length) {
        toast('Tutorial klaar! Oma Mies heeft nog veel meer voor je.');
      }
      lastTip = tut;
      hud.setTip(tut);
      for (const [key, p] of Object.entries(places)) {
        if (p && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < NEAR_PLACE) markVisit(ext, key, player.swimming);
      }
      waypoint.setTarget(target(tut));
      syncApps();
      refresh();
      hud.setBreath(stamina / (BASE_RUN + skillBonus(game.state, 'uithouding')), winded);
    };
    let acc = TICK;
    slow();

    return {
      update(t, dt, paused) {
        mentor.update(t);
        if (!paused && game.isNight) observeNight(ext, dt * MINUTES_PER_SECOND);
        waypoint.update(t, player);
        acc += dt;
        if (acc < TICK) return;
        acc = 0;
        slow();
      },
      dispose() {
        offs.forEach((off) => off());
        delete player.update;
        delete guards.sees;
        delete guards.update;
        apps.forEach((a) => unregisterApp(a.id));
        const it = interactions.items.indexOf(talkItem);
        if (it >= 0) interactions.items.splice(it, 1);
        const col = props.colliders.indexOf(mentorCollider);
        if (col >= 0) props.colliders.splice(col, 1);
        mentor.dispose();
        waypoint.dispose();
        hud.dispose();
      },
    };
  },
};
