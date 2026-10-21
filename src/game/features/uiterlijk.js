// Feature "uiterlijk" (6.12): the Mii's own gestures, so the island feels alive.
//   G (or the Zwaai button on a phone) waves: the right arm goes up and swings, with a bubble.
//   Standing still while a menu is open next to the island, the Mii talks: a small nod and the
//   right hand comes up to the chest.
//   Standing still for a while, the head glances left and right now and then.
// Everything is a pose on top of player.js (it runs after the player's own animation), so the
// walking and swimming animation stays as it is. Emits nothing and saves nothing.

import { h, icon } from '../../ui/dom.js';

const WAVE_TIME = 2.6;
const WAVE_ARM = -2.55; // the upper arm points up
const LOOK_MAX = 0.7; // radians the head turns when it glances

const CSS = `
.emote-btn{position:absolute;right:max(30px,calc(env(safe-area-inset-right) + 24px));bottom:146px;width:62px;height:62px;border-radius:50%;border:3px solid rgba(255,255,255,.9);background:rgba(255,255,255,.6);color:#2a6fb0;display:none;place-items:center;padding:0;touch-action:manipulation}
.emote-btn .icon{width:28px;height:28px}
.emote-btn:active{transform:scale(.94)}
@media (pointer:coarse){.emote-btn{display:grid}}
.emote-anchor{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.emote-bubble{position:absolute;left:-22px;top:-44px;width:44px;height:44px;border-radius:50%;background:#ffffff;color:#2a6fb0;box-shadow:0 3px 10px rgba(0,0,0,.25);display:grid;place-items:center;transform-origin:50% 100%;animation:emote-pop .35s ease-out both}
.emote-bubble .icon{width:26px;height:26px}
.emote-bubble::after{content:'';position:absolute;left:50%;bottom:-7px;margin-left:-7px;border:7px solid transparent;border-bottom:0;border-top-color:#ffffff}
@keyframes emote-pop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
`;

/** Wave, talk and glance state; pure numbers, so the blends are easy to follow. */
export function approachAngle(cur, target, dt, rate = 8) {
  return cur + (target - cur) * Math.min(1, dt * rate);
}

export default {
  id: 'uiterlijk',
  install(ctx) {
    const { player, camera, screen, isPaused } = ctx;
    const parts = player.mii?.parts ?? null;
    const head = player.mii?.headPivot ?? null;
    ctx.addStyle(CSS);

    let wave = 0; // seconds of wave left
    let waveBlend = 0; // how much the wave takes over the arm (0..1)
    let talkBlend = 0; // the talk pose (0..1)
    let glance = 0; // head yaw target
    let glanceCountdown = 2 + Math.random() * 3;
    let bubble = null;

    const startWave = () => {
      if (player.swimming || !player.grounded) return;
      wave = WAVE_TIME;
      if (!bubble && screen) {
        // The anchor is moved over the head; the bubble inside animates its own pop-in.
        bubble = h('div', { class: 'emote-anchor', 'aria-hidden': 'true' }, h('div', { class: 'emote-bubble' }, icon('wave', 'emote-glyph')));
        screen.append(bubble);
      }
    };

    const onKey = (e) => {
      if (e.repeat || e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'g' && !isPaused()) startWave();
    };
    window.addEventListener('keydown', onKey);

    const waveBtn = h('button', { class: 'emote-btn', type: 'button', 'aria-label': 'Zwaaien', onClick: () => !isPaused() && startWave() }, icon('wave'));
    screen?.append(waveBtn);

    // World point -> screen pixels (z > 1 means it is beyond the far end, i.e. not usable).
    const V = new ctx.THREE.Vector3();
    const screenPos = { x: 0, y: 0, z: 0 };
    const project = (wx, wy, wz) => {
      V.set(wx, wy, wz).project(camera);
      screenPos.x = ((V.x + 1) / 2) * (screen.clientWidth || 1);
      screenPos.y = ((1 - V.y) / 2) * (screen.clientHeight || 1);
      screenPos.z = V.z;
      return screenPos;
    };

    return {
      update(t, dt, paused) {
        if (!parts || !head) return;
        const still = player.speed < 0.25 && player.grounded && !player.swimming;

        // The wave runs for a short time, and stops at once when the Mii starts to walk.
        if (wave > 0) {
          wave = still ? wave - dt : 0;
        }
        const waving = wave > 0;
        // The talk pose: a menu is open and the Mii stands still.
        const talking = paused && still && !waving && isPaused();

        waveBlend = approachAngle(waveBlend, waving ? 1 : 0, dt, 10);
        talkBlend = approachAngle(talkBlend, talking ? 1 : 0, dt, 6);

        if (waveBlend > 0.001) {
          const swing = Math.sin(t * 11) * 0.42;
          parts.armR.rotation.x = parts.armR.rotation.x + (WAVE_ARM - parts.armR.rotation.x) * waveBlend;
          parts.armR.rotation.z = parts.armR.rotation.z + (-0.55 + swing - parts.armR.rotation.z) * waveBlend;
        }
        if (talkBlend > 0.001) {
          const bob = Math.sin(t * 4.6) * 0.07;
          parts.armR.rotation.x = parts.armR.rotation.x + (-1.25 + bob - parts.armR.rotation.x) * talkBlend;
          parts.armR.rotation.z = parts.armR.rotation.z + (-0.25 - parts.armR.rotation.z) * talkBlend;
          head.rotation.x = head.rotation.x + Math.sin(t * 2.4) * 0.035 * talkBlend;
        }

        // Head glances: only while standing still and not gesturing.
        if (still && !waving && !talking) {
          glanceCountdown -= dt;
          if (glanceCountdown <= 0) {
            glance = (Math.random() * 2 - 1) * LOOK_MAX;
            glanceCountdown = 3 + Math.random() * 4;
          }
          head.rotation.y = approachAngle(head.rotation.y, glance, dt, 2.5);
        } else {
          head.rotation.y = approachAngle(head.rotation.y, 0, dt, 6);
          glance = 0;
          glanceCountdown = 2 + Math.random() * 2;
        }

        // The speech bubble follows the head while the wave lasts, then fades away.
        if (bubble) {
          if (waving) {
            const hy = player.group.position.y + 2.1;
            project(player.group.position.x, hy, player.group.position.z);
            bubble.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px)`;
            bubble.hidden = screenPos.z > 1;
          } else {
            bubble.remove();
            bubble = null;
          }
        }
      },
      dispose() {
        window.removeEventListener('keydown', onKey);
        waveBtn.remove();
        bubble?.remove();
      },
    };
  },
};
