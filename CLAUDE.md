# Wii Sports Extreme (werktitel)

Fan-game in de browser: Wii Sports Resort-stijl, Mii-maker, open eiland, parodie-handelsspel
(duidelijk nepproducten, geen echte drugs). Statische web-app, three.js 0.180 in `lib/`, geen
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
- Stap 0.1 klaar. Volgende: 0.2 spelontwerp.
