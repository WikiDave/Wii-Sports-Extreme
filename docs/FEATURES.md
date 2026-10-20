# Features: how an add-on plugs into the island game

A feature is one file in `src/game/features/<id>.js` (plus its own helper files and data files, named
after the feature) with:

```js
export default {
  id: 'handel',
  install(ctx) {
    // build things, register phone apps, add interactions, listen to game events
    return {
      update(t, dt, paused) {},   // every frame; paused is true while a menu/minigame is open
      dispose() {},               // undo what install did (remove meshes, listeners, styles)
    };
  },
};
```

`src/game/features/index.js` imports every feature already; do not edit it (add files only).
A feature that throws is switched off and logged, the game goes on.

## Save data
Store everything of your own under `ctx.game.state.ext[id]` (a plain JSON object; create it on first
use). It is saved with the game automatically. Do not add fields to `state.js` for your feature.

## The ctx object (built in `src/screens/island.js`)
| field | what |
|---|---|
| `THREE` | the three.js module |
| `scene, camera, renderer` | the 3D scene |
| `game` | `Game` (state.js): `state`, `rank`, `hour`, `isNight`, `on(event, fn)` returns an off-function, `emit`, `addCash`, `addXp`, `addItem`, `save()` |
| `player` | `Player` (player.js): `pos`, `group`, `speed`, `swimming`, `heading`, `mii` |
| `follow` | `FollowCamera` |
| `interactions` | `Interactions` (interact.js): `add({ x, z, r, label, run, enabled? })` returns the item; remove with `interactions.items.splice(...)` |
| `props` | `{ colliders: [{x,z,r}], group, boats, swayPalms }`; push to `colliders` to block the player |
| `island` | `{ group, ground }`; `heightAt(x,z)`, `zoneAt(x,z)` are exported from `world/island.js` |
| `guards, customers, rival, life, grass, fx, weatherFx, sky, audio, minimap` | the existing systems (`audio.play(name)`, `fx.dust/splash/burst/ripple`) |
| `hutPos, spots` | the hut position and the customer spots `{ strand, haven }` |
| `h, modal, toast, icon` | DOM helpers from `ui/dom.js` |
| `hudBar` | the HUD bar element (`ctx.hudBar.append(el)`) for small HUD widgets |
| `screen` | the island screen root (position: fixed; append overlays here) |
| `addStyle(cssText)` | injects a `<style>`; removed when the island screen closes |
| `registerApp(app)` | adds a phone app, see `src/game/phoneApps.js` |
| `isPaused()` | true while a modal, minigame or the big map is open |
| `shadowsOn(obj, receive)` | turn on shadow casting for a mesh tree |

## Game events (`game.on(name, fn)`)
`change`, `time` (every frame), `newday(day)`, `rank(rank)`, `heat(level)`, `messages(list)`,
`deal({customer,key,sold,money,offer})`, `collected({items})`, `frisked({fine,taken})`,
`caught({lost})`. Emit your own with `game.emit('name', data)` (document it in your file header).

## Rules for working on a feature
- Write only your own files, plus the shared files your assignment explicitly names. Everything else
  is read-only, so features do not collide. If you need a hook in a shared file, make the smallest
  possible edit and say so in your report.
- Dutch UI text, same cheerful Wii tone, no real drugs: the goods are lemonade, candy and ice cream.
- Pure game logic goes in files without DOM or three.js and gets a test: `tests/<id>.test.mjs`
  (run with `node tests/<id>.test.mjs`, `assert` from `node:assert/strict`).
- Look at it: serve the project root with `python3 -m http.server <your port>` and drive it with
  Playwright (`/opt/node22/lib/node_modules/playwright/index.mjs`, launch args
  `['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']`). `window.__game`
  exposes `{ player, follow, game, ctx, heightAt, props, interactions, ... }` for tests. Set a save
  by writing `localStorage['wse.game.v1']` before opening `index.html#eiland`. Take screenshots
  and Read them; fix what looks wrong. The headless browser is slow (low fps), so wait generously.
- All tests in `tests/` must still pass: `for t in tests/*.test.mjs; do node "$t" || echo FAIL $t; done`.
- Commit on your own branch with a clear message. Do not push.
