# Wii Sports Extreme (werktitel)

Fan-game in de browser: Wii Sports Resort-stijl, Mii-maker, open eiland, parodie-handelsspel
in verboden limonade/snoep/ijs (geen echte drugs). Ontwerp: `docs/ONTWERP.md`. Statische web-app, three.js 0.180 in `lib/`, geen
build-stap, Nederlandse UI. Start met `npm start` of `python3 -m http.server 8080`.

## Regels
- Eén stap per sessie; eindig met commit, push en een update van "Status" hieronder.
- Kleine bestanden. Laat `src/mii/*` met rust (gemeten uit Mii Studio, is klaar).
- Geen Nintendo-bestanden; alles met code of eigen data. Eigen namen voor spelonderdelen.
- Korte antwoorden; geen agent-groepen tenzij gevraagd.
- Branch: `claude/mii-maker`. Artifact wordt gepubliceerd via index.html + files-map
  (`assets/hair.bin` gaat als base64-js omdat .bin niet geserveerd wordt).

## Stappen (model / inspanning)
0.1 opruimen + CLAUDE.md (S/laag) - 0.2 spelontwerp (O/hoog)
1.1 eilandvorm, zee, licht (O/medium) - 1.2 props (S/laag) - 1.3 Mii lopen, camera, botsing
(O/hoog) - 1.4 kaart (S/laag)
2.1 spelstatus + opslag (S/medium) - 2.2 thuisbasis + menu's (S/laag) - 2.3 eerste product +
minigame (O/medium) - 2.4 klanten (S/medium)
3.1 meer producten (H/laag) - 3.2 panden + medewerkers (S/medium) - 3.3 politie + rivalen
(O/hoog) - 3.4 dag/nacht/weer (S/medium)
4.1 geluid + UI (S/laag) - 4.2 balans + bugs (O/hoog) - 4.3 Mii-neus/baarden/make-up
(O/hoog) - 4.4 publiceren (H/laag)

## Status
- Mii-maker: klaar (hoofden, 72 kapsels, ogen/brauwen/monden, brillen, lichamen, 27 officiele
  Miis). Nog niet 1:1: neus, baarden, make-up/rimpels.
- Stap 0.1, 0.2, 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1 klaar. Ontwerp: `docs/ONTWERP.md` (lees dit eerst). Eiland: `src/game/world/` (zones.js, island.js heightAt/zoneAt, sky.js setTime), scherm `src/screens/island.js` (#eiland, orbit-camera + tijdschuif). Props: `src/game/world/props.js` (palmen, huizen, vuurtoren met lamp, rotsen; seeded). Speler: `src/game/player.js` (lopen/rennen, botsing met zee en props-colliders, loopanimatie), `camera.js` (derde persoon), `input.js` (WASD/pijlen, Shift; touch-stick + Ren-knop). Mii-lichaam heeft nu skinning-botten `parts.legL/legR/armL/armR` (body.js, MiiMaterial ondersteunt skinning). Tests: `window.__game`. Kaart: `src/game/ui/minimap.js` (minikaart rechtsboven, M of tik = grote kaart). Staat: `src/game/state.js` (Game: cash/xp/rang/dag/klok/inventory, events change/time/newday/rank, save `wse.game.v1`, 1 s = 1 spelminuut, dag 06:00-04:00; test `node tests/state.test.mjs`). HUD in island.js (dag, klok, geld, rang). Thuisbasis: `world/hut.js` + `ui/hutMenu.js` (slapen, voorraad, opslaan); `interact.js` (Interactions: E of tik bij een object, items {x,z,r,label,run}). Product: data in `src/game/data/` (effects, ingredients, products), logica `economy.js` (mix/recipeEffects/unitPrice/itemKey `p:<product>:<fx+fx>:<q%>`/makeBatch/buy/sell; test `node tests/economy.test.mjs`), minigame `minigames/pour.js` (playPour -> kwaliteit 0.8-1.2), menu's `ui/tradeMenus.js` (mengen in hut, Markt in Havenstad, Strandtent koopt voor 60%). Klanten: data `data/customers.js` (5 Miis: budget, 3 effecten, rooster, unlock), logica `customers.js` (isPresent/available/valueFor/maxPrice/deal; aanbod laag 0.8/eerlijk 1/hoog 1.4, vertrouwen 0-100, 1 deal per dag; test `node tests/customers.test.mjs`), wereld `world/customerView.js`, gesprek `ui/dealMenu.js`. Interactions-items hebben optioneel `enabled()`. Producten: `data/products.js` (limonade rang 0, snoep rang 2, ijs rang 3), extra ingrediënten bosbes/chili/vanille. Panden en personeel: data `data/properties.js` + `data/staff.js`, logica `empire.js` (stockLimit/staffLimit, buyProperty, hire/fire, dailyWork bij newday; test `node tests/empire.test.mjs`), menu `ui/officeMenu.js` (Kantoor in Havenstad). Voorraad is begrensd door je panden (buy/makeBatch weigeren bij vol). Bewaking: `police.js` (heat 0..5, niveau 0-4, onDeal/onRefused/tickHeat/frisk/caught/escaped/disguise, inCone; test `node tests/police.test.mjs`), wereld `world/guards.js` (patrouille, kijkkegels, fouilleren, achtervolging op niveau 4, verstoppen bij de hut), HUD-meter. Rivalen: `data/rivals.js` + `rivals.js` (rollRival bij newday vanaf rang 1, spotFactor 0.8, bribe/tipOff), `world/rivalView.js`. Hut: Omkleden (-1 niveau, 1x per dag). Weer + gebeurtenissen: `weather.js` (dayInfo(day) uit het dagnummer: zon/bewolkt/regen/storm + rustig/feest/inspectie/hittegolf, priceFactor, staysHome, viewFactor; tests in police.test.mjs), beeld `world/weatherFx.js` (wolken, regen, licht/mist). HUD toont weer-icoon bij de dag. Geluid: `audio.js` (Web Audio, geen bestanden: tone/play(click,cash,spend,bad,alarm,alert,rank,newday,pour,perfect), zee + regen via setAmbience, marimba-melodie; mute in `wse.sound.v1`, knop in de HUD). HUD is compact op telefoon (<=560px). Volgende: 4.2 balans + bugs.
