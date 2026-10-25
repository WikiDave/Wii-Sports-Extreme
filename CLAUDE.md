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
Fase 5 (professionele look): 5.1 licht + schaduwen + kleurbewerking (O/medium) - 5.2 water (O/medium)
- 5.3 terrein: variatie, paden, kliffen, gras en bloemen (O/hoog) - 5.4 gebouwen: Havenstad, steiger,
boten, hotel (S/medium) - 5.5 leven: palmen wuiven, meeuwen, figuranten, boten (S/medium) - 5.6 UI:
HUD-iconen, titelscherm, menu's (S/medium) - 5.7 gevoel: camera, springen, stof, voetstappen (S/laag)
- 5.8 snelheid op telefoon (O/medium)

## Fase 6: Schedule I x Wii Sports Resort (doorlopend, zonder eind tot het af is)
Doel: evenwaardig aan Schedule I in spelmechanica en aan Wii Sports Resort in uiterlijk en gevoel
(geen sporten, geen echte drugs). Werkwijze: elke stap bouwen, in de testbrowser spelen, screenshots
bekijken, fouten fixen, committen, pushen, artifact publiceren, `Status` bijwerken. Doorgaan tot de
gebruiker stopt zegt.
6.1 (KLAAR: player.js zwemmen -1 m drijven/stopt op -9 m diepte, springen op spatie/Spring-knop, voetstappen+stof+spetters via world/effects.js) beweging: zwemmen, springen, voetstappen, stof, spetters, camera botst niet met bomen/huizen
6.2 (KLAAR: `phone.js` berichten dailyMessages/accept/decline/activeRequest/completeRequest + bank deposit/withdraw (bank veilig bij gepakt worden), `ui/phoneUi.js` apps Berichten/Contacten/Bank/Kaart, Tab of knop in HUD met badge; dealMenu geeft +30% bij een geaccepteerde afspraak; test `node tests/phone.test.mjs`) telefoon in beeld (berichten van klanten, kaart, contacten, bank, apps) zoals Schedule I
6.3 (KLAAR: `stations.js` startJob/collect/ready/progress/stationLimit, `state.jobs`, PRODUCTS.time (25/45/70 min), PROPERTIES.stations (1/2/3/4), `ui/stationMenu.js`, machines naast de hut met rood/groen lampje, mix-menu start nu een job; kok-personeel maakt nog direct; test `node tests/stations.test.mjs`. Nog open: kweektent/droogrek/pers als aparte stations, kwaliteit door apparatuur) productiestations: mengtafel, droogrek, pot/kweektent, pers, vulbank, met kwaliteit en tijd
6.4 klanten: eigen dagritme door het eiland, afspraken via sms, aanbiedingen, verslaving-loos (voorkeur,
vertrouwen, kopen thuis of op straat), meer dan 5 klanten (20+)
6.5 dealers en leveranciers: dealers inhuren met route en voorraad, leverancier belt, bezorging
6.6 geld witwassen: bedrijven kopen (ijskraam, surfschool, restaurant), bank/ATM, belastingdienst-grap
6.7 politie op niveau: bewakers met zaklamp, agent-auto's, huiszoeking van panden, borg
6.8 panden: inrichten, upgrades, camera's, sloten, opslagkasten, bed
6.9 voertuigen: fiets, scooter, golfkar, boot; benzine/laden
6.10 vaardigheden/rangen/missies (verhaalopdrachten), prestaties
6.11 wereld: groter eiland, binnenruimtes, meer zones met eigen sfeer, dag/nacht-leven in de stad
6.12 uiterlijk: eigen modellen voor bomen/props, betere animaties, UI in Wii-stijl, titelscherm
6.13 prestaties op telefoon en opslaan/laden robuust


## Fase 7: wereld-uitbreiding (na de features-workflow)
Volgorde is belangrijk: eerst de fundering, dan wat erop rust. Elke feature volgt docs/FEATURES.md.
Fundering (eerst, achter elkaar):
- 7.0a grotere map: meer eilandjes (ZONES), grotere ISLAND_SIZE, dieptekaart, grasrasters, performance
- 7.0b plaatsingsregister (`world/placement.js`): footprints reserveren zodat bruggen, huizen,
  infrastructuur en grotten elkaar niet overlappen en botsingen centraal staan
- 7.0c rivieren en beekjes in de hoogtekaart (carve), waterval aan de bergrand
- 7.0d interieur-systeem: betreden met laadscherm (fade + loading), eigen scène ver weg (y=-1000),
  deur terug naar buiten. Gebruikt door huizen, winkels, hut, hotel, grotten
Bouwen (daarna, parallel per onderdeel):
- 7.1 huizen meer detail en varianten, betreedbaar, huizen met garage (auto erin)
- 7.2 bruggen: bruggetjes over beekjes, Golden Gate-achtige hangbrug tussen eilanden, touwbrug over
  steile paden (kloof)
- 7.3 infrastructuur: riolen (putdeksels, tunnels), banken, vuilbakken, vuilnis, drankautomaten
  (verkopen limonade), bushalte, brievenbussen, fonteinen, straatmeubilair, parkeerplekken
- 7.4 piratenschip (boardbaar, bemanning, schatten), vissen (vangen met minigame), schatkisten in
  het water, avontuur-route (kaart met aanwijzingen)
- 7.5 waterval (water-shader + deeltjes) en geheime grotten (ingangen, kristallen, schat)
- 7.6 vliegveld: landingsbaan, verkeerstoren, vliegtuigen die echt opstijgen en landen op
  dienstregeling; vliegen naar andere eilanden kost geld en tijd (geen teleport)
- 7.7 auto's: werkende auto's (rijden, botsen), garage bij huizen, garage om auto aan te passen
  (verf, velgen, spoiler, stickers)
- 7.8 havendok: boten aanpasbaar in de dock (verf, motor), vaarbaar tussen eilanden

## Fase 8: wensenlijst (volgorde van bouwen, grootste eerst waar het fundament voor is)
Wat erbij komt, gegroepeerd. Elke groep bouwt op de fase-7-fundering (map, plaatsingsregister,
interieur-systeem). Alles volgt docs/FEATURES.md.
A. Wereld en bouw
- A1 bouwen op een gekozen plek: huis, winkel of gebouw neerzetten (bouwmodus met plaatsingsregister)
- A2 huizen met meer detail, verschillende baksteen, betreedbaar; huizen te koop, te huur of van een NPC
- A3 woning kopen: beginnen in een klein appartement (bed, bureau, badkamer met bad en wc), later een huis
- A4 meer eilandjes, autowegen, bruggen (zie fase 7 7.2), stadhuis met burgemeester, monumenten
- A5 kerken, moskeeën, synagogen en tempels als gewone plekken in de stad, met respect, geen spot
  met geloof of gelovigen
B. Economie en bedrijven
- B1 nachtwinkels, wasserijen, hotels en andere zaken als witwaspraktijk (uitbreiding van witwassen)
- B2 apotheek: verkoopt alleen fictieve middelen (vitamine- en kruidenpillen, energiedrankjes), geen
  echte drugs
- B3 fictieve bedrijven die door NPC's worden gerund; solliciteren bij die bedrijven
- B4 plantages: kweek op eigen grond of in een hangaar (koppelen aan stations, 6.3)
- B5 handlangers die opdrachten uitvoeren; kunnen door rivalen of politie worden opgepakt en melden
  zich via de telefoon (uitbreiding van verkopers, 6.5)
C. Tijd, natuur en weer
- C1 slapen met gekozen wakker-uur; energie beïnvloedt werken en verkopen
- C2 planten groeien over de tijd (plantages en tuin)
- C3 eb en vloed: strand verandert, sommige paden onder water
- C4 vulkaan: lava en een uitbarsting om het jaar
- C5 tornado's als weerevent (schade aan plaatsingen wordt hersteld, geen doden)
D. Mensen
- D1 NPC's met eigen dagritme (uitbreiding klanten), elk met een uniek dialoog
- D2 lastige buren en snitches: buren die klagen en de politie verwittigen, te sussen met geld
- D3 NPC-bedrijven en -bewoners krijgen eigen routines en levenscyclus
E. Vervoer
- E1 treinen, bussen, metro (stations en lijnen), taxi (bestel een taxi op de telefoon)
- E2 vliegveld (fase 7 7.6), auto's en garages (fase 7 7.7)
F. Vermaak en reclame
- F1 jukebox: kopen voor eigen domein, platen kopen in de platenwinkel, ook in restaurants
- F2 reclame met Mii's erop, met een editor om eigen reclame te maken
- F3 raves en festivals (evenementen met muziek, programma en publiek)
- F4 fun house: een kermisattractie (spiegels, rare gangen, schrikhuis), voor het hele gezin
G. Kaart en gevoel
- G1 markers op de kaart en in de wereld: jezelf, je handelaren, je doelen (objectives)
- G2 spreekbubbel-waarschuwing als je het gebied van een rivaal binnenloopt
- G3 meer detail in bomen en meeuwen (fase 5 uitbreiding)
Niet opgenomen zonder verdere afspraak: sectes als organisatie (kan geloof belachelijk maken),
en een bordeel of stripclub (valt buiten het spel). Zie de vraag in het antwoord van de sessie.

## Status
- Mii-maker: klaar (hoofden, 72 kapsels, ogen/brauwen/monden, brillen, lichamen, 27 officiele
  Miis), en sinds 4.3 ook neus (lijn + 3D-neus, `nose.js`/`nose-data.js`), baarden (3D-meshes per
  type, verschoven per gezichtsvorm, `beard.js`/`beard-data.js`) en make-up/rimpels (rasters per
  gezichtsvorm, `facetex.js` + `assets/facetex.png`, laden vóór het eerste scherm). Bronnen in de
  scratchpad (cal/gen_face3d.py).
- Stap 0.1, 0.2, 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4 klaar. Ontwerp: `docs/ONTWERP.md` (lees dit eerst). Eiland: `src/game/world/` (zones.js, island.js heightAt/zoneAt, sky.js setTime), scherm `src/screens/island.js` (#eiland; menu's en minigames pauzeren de wereld). Props: `src/game/world/props.js` (palmen, huizen, vuurtoren met lamp, rotsen; seeded). Speler: `src/game/player.js` (lopen/rennen, botsing met zee en props-colliders, loopanimatie), `camera.js` (derde persoon), `input.js` (WASD/pijlen, Shift; touch-stick + Ren-knop). Mii-lichaam heeft nu skinning-botten `parts.legL/legR/armL/armR` (body.js, MiiMaterial ondersteunt skinning). Tests: `window.__game`. Kaart: `src/game/ui/minimap.js` (minikaart rechtsboven, M of tik = grote kaart). Staat: `src/game/state.js` (Game: cash/xp/rang/dag/klok/inventory, events change/time/newday/rank, save `wse.game.v1`, 1 s = 1 spelminuut, dag 06:00-04:00; test `node tests/state.test.mjs`). HUD in island.js (dag, klok, geld, rang). Thuisbasis: `world/hut.js` + `ui/hutMenu.js` (slapen, voorraad, opslaan); `interact.js` (Interactions: E of tik bij een object, items {x,z,r,label,run}). Product: data in `src/game/data/` (effects, ingredients, products), logica `economy.js` (mix/recipeEffects/unitPrice/itemKey `p:<product>:<fx+fx>:<q%>`/makeBatch/buy/sell; test `node tests/economy.test.mjs`), minigame `minigames/pour.js` (playPour -> kwaliteit 0.8-1.2), menu's `ui/tradeMenus.js` (mengen in hut, Markt in Havenstad, Strandtent koopt voor 60%). Klanten: data `data/customers.js` (5 Miis: budget, 3 effecten, rooster, unlock), logica `customers.js` (isPresent/available/valueFor/maxPrice/deal; aanbod laag 0.8/eerlijk 1/hoog 1.4, vertrouwen 0-100, 1 deal per dag; test `node tests/customers.test.mjs`), wereld `world/customerView.js`, gesprek `ui/dealMenu.js`. Interactions-items hebben optioneel `enabled()`. Producten: `data/products.js` (limonade rang 0, snoep rang 2, ijs rang 3), extra ingrediënten bosbes/chili/vanille. Panden en personeel: data `data/properties.js` + `data/staff.js`, logica `empire.js` (stockLimit/staffLimit, buyProperty, hire/fire, dailyWork bij newday; test `node tests/empire.test.mjs`), menu `ui/officeMenu.js` (Kantoor in Havenstad). Voorraad is begrensd door je panden (buy/makeBatch weigeren bij vol). Bewaking: `police.js` (heat 0..5, niveau 0-4, onDeal/onRefused/tickHeat/frisk/caught/escaped/disguise, inCone; test `node tests/police.test.mjs`), wereld `world/guards.js` (patrouille, kijkkegels, fouilleren, achtervolging op niveau 4, verstoppen bij de hut), HUD-meter. Rivalen: `data/rivals.js` + `rivals.js` (rollRival bij newday vanaf rang 1, spotFactor 0.8, bribe/tipOff), `world/rivalView.js`. Hut: Omkleden (-1 niveau, 1x per dag). Weer + gebeurtenissen: `weather.js` (dayInfo(day) uit het dagnummer: zon/bewolkt/regen/storm + rustig/feest/inspectie/hittegolf, priceFactor, staysHome, viewFactor; tests in police.test.mjs), beeld `world/weatherFx.js` (wolken, regen, licht/mist). HUD toont weer-icoon bij de dag. Geluid: `audio.js` (Web Audio, geen bestanden: tone/play(click,cash,spend,bad,alarm,alert,rank,newday,pour,perfect), zee + regen via setAmbience, marimba-melodie; mute in `wse.sound.v1`, knop in de HUD). HUD is compact op telefoon (<=560px). Balans (4.2): rangen 0/60/250/800/2500/7000 xp; strandtent 50%, max 8 per dag; tuinier 8 citroenen, kok 3 batches, verkoper 12 stuks; bewakers fouilleren pas vanaf niveau 1. Simulatie: `node tests/balance.sim.mjs`. README bijgewerkt met het spel. Fase 1-4 klaar. 5.1 klaar: `world/render.js` (IslandRenderer: schaduwkaart rond de speler, sRGB-rendertarget met MSAA + kleurbewerkingspass; shadowsOn(obj)); MiiMaterial geeft nu lineair uit + colorspace_fragment (Mii-kleuren elders ongewijzigd, getest); sky.js: sterren, zonnehalo, horizonwaas, meer contrast zon/omgevingslicht. 5.2 klaar: `world/water.js` (buildWater(ground, sky): shader met golfjes per octaaf gedempt op afstand, Fresnel-luchtreflectie, zonneglinstering, kleur op diepte uit een hoogte-textuur van het terrein, schuim aan de waterlijn; deelt de lucht-uniforms met sky.js; update(t, light, rough) per frame). Zand iets donkerder. 5.3 klaar: `world/terrainMaterial.js` (Lambert + shader-detail: grasvlekken, zandribbels, rotslagen op hellingen, paden), PATHS/pathDistance/PATH_SEGMENTS in zones.js (ook op de minikaart), Vuurtorenkaap is een 'cliff'-profiel, `world/grass.js` (Grass: ~40k instanced graspollen + bloemen in chunks van 60 m, alleen dichtbij zichtbaar, wind in de vertex-shader; minder op telefoon). Laadscherm: `src/ui/loading.js` (createLoader: logo, draaiende ring, balk, stap, wisselende tips; nextFrame). main.js toont het bij het laden van de Mii-onderdelen; het eiland bouwt zich in stappen op (`buildIsland3d` in island.js, compileert shaders en rendert één keer achter het laadscherm; FollowCamera.snap). 5.4 klaar: `world/buildings.js` (house(rand): ramen, luiken, deur, luifel, schoorsteen, 1-2 verdiepingen, tentdak of puntdak; hotel(); pier() met boten + bobBoats; streetLamp(); windowGlass/lampLight lichten 's nachts op), props.js plaatst ze (huizen niet op paden, hotel in de heuvels, steiger oost van Havenstad, lantaarns langs paden bij de steden). 5.5 klaar: `world/life.js` (Life: 14 meeuwen die cirkelen en klapwieken, 3 zeilboten op een ellips om het eiland, 5-9 dorpelingen-Miis die over de paden heen en weer lopen, alleen zichtbaar binnen 220 m; props.swayPalms laat palmen binnen 160 m wuiven; allemaal decor, geen botsing). QA-ronde (artifact v31): fixes van de vier QA-takken samengevoegd. Economie: voorraad vol met ingrediënten geeft geen vastloop meer, tuinier plukt max. 2 batches, kok werkt via stations, marktverkoop terug 50%, verkoper 8 stuks op 70%. Witwassen: zwart geld wordt niet meer schoon op de bank/ATM/telefoon, politie neemt voorraad uit de kist mee, bedrijven ~0.57× omzet. Motor: licht blijft goed bij menu's (absolute weather-waarden), foutgrenzen per listener en per frame, features in omgekeerde volgorde opruimen, springen/afstand alleen te voet. Telefoon: rangnaam leesbaar op 390 px, minikaart-label en politie-notitie. Tests: 16 unit-tests groen; `tests/klanten.sim.mjs` roept nu eerst `collect` aan. Huizen betreedbaar (A2 / 7.1, deels): alle 44 dorpshuizen hebben een binnenruimte (`wereld/houses.js` houseDoor: deur en punt buiten uit anker en rotatie; `wereld/interior/house.js` buildHouse: eigen muur- en stoffenkleur per huis, boekenkast, bank, plant, lamp). Geregistreerd in `features/wereld.js` als `house-<n>`; het hotel houdt zijn lobby. Test `node tests/huizen.test.mjs`; in de browser zijn alle 44 betreden en weer verlaten. Nog open: huizen met meer detail en garage, te koop/te huur, eigen baksteen per huis (A2). Controle (ronde 2): in de browser getest: titel, Mii-maker (Nieuwe Mii, Man, editor met 3D), klok, 12 telefoon-apps op 390 px, slapen naar dag 2, verkoop aan Saburo (zwart geld erbij), kantoor (loods, stations, personeel), bank, hitte-meter, bewaker, bestelling bij de leverancier, Oma Mies, 4 huizen, opslaan en herladen; alles werkt. Fix: naamveld in de editor was 2 px te breed (`css/style.css` .field > .text). Niet getest: voertuig huren (pas bij rang), politie-arrestatie, bewakers-achtervolging, panden met upgrades, schelpen oppakken, nacht. Puf- en adem-meter verwijderd op verzoek: rennen is onbeperkt (`politie/stamina.js` weg, adem-logica en balk in missies weg, vaardigheid Uithoudingsvermogen en prestatie Buiten adem weg, dus 5 vaardigheden; punten van een gekochte Uithouding komen vanzelf terug). Volgende: 5.6 interface.
- Samengevoegd op 2026-10-21 (commit 91aa01d): klanten, handel, witwassen, politie, panden, voertuigen, missies, wereld, uiterlijk. Alle 16 tests slaan, het spel start zonder fouten. Eerste QA-ronde loopt (zie workflow merged-game-qa).
