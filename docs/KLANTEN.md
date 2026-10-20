# Klanten met een leven (stap 6.4, feature `klanten`)

28 klanten in `src/game/data/customers.js`. Elke klant heeft een **type** (`klanten/types.js`: patience, discretion,
standard, speed, maxQty, rainproof), een **stem** (`klanten/lines.js`), drie favoriete effecten en één effect waar
ze niets van moeten hebben, een favoriet product, een dagroute en een regel waarmee ze bekend worden.

## Dagroute: positie = f(spelklok)
- `routine: [[uur, plaats], ...]` vanaf 06:00 (uren lopen door tot 28 = 04:00). Plaatsen: `thuis` (voordeur van hun huis),
  `strand`, `surf`, `markt`, `terras`, `steiger`, `hotel`, `uitzicht`, `weide`, `kaap`, `vulkaan` (`klanten/places.js`).
- `klanten/timeline.js` maakt er per dag stukken van: blijven of lopen. Ze vertrekken zo dat ze op tijd aankomen (of te
  laat als de route te lang is) en lopen langs de voetpaden (`PATHS` + een paar eigen schakels, Dijkstra, stappen die door
  water gaan vallen weg: dan gaan ze om over de heuvels). `locate(world, c, tl, minuten)` geeft x, z, richting en of ze lopen.
  Er wordt niets per frame gesimuleerd.
- Per dag een beetje variatie (tijden schuiven, soms een alternatieve plaats). Regen: wie niet `rainproof` is blijft binnen
  (`shelter`: meestal thuis), storm: iedereen. Strandfeest: sociale types gaan 's avonds naar het strand.
- `world/customerView.js` toont alleen de dichtstbijzijnde 8 (6 op telefoon) als Mii, modellen blijven in een cache van 12,
  er wordt hooguit één Mii per frame gebouwd. Ze draaien naar je toe, zwaaien en roepen iets als je dichtbij komt.
- "Praat met X" waar ze lopen. Thuis (en wakker, 07:00-23:00) kun je aanbellen: "Klop aan bij X" (vanaf vertrouwen 10, of
  altijd als ze de hele dag binnen blijven). Aan de deur ziet de bewaking niets en betaalt de klant 10% extra.
- De echte eilandplekken (huizen -> voordeuren, de hotelterras, obstakels) zet `features/klanten.js` via
  `klanten/layout.js` in de `CustomerView.configure()`.

## Handel
- `customers.js`: `valueFor` = prijs x 1,15 per gewild effect, x 0,7 bij het gehate effect, x 1,05 favoriet product, korting
  onder hun kwaliteitsverwachting. `deal()` geeft ook reactie, tekst, fooi, tier-up en gevolgen terug.
- Vertrouwen 0-100, niveaus (`klanten/tiers.js`): Nieuwe klant, Bekende (15), Stamklant (35), Vaste klant (60), Beste vriend (85).
  Hogere niveaus: groter budget (+8% per niveau), meer stuks, fooi (10-30% kans), "Stamkorting" als naam van het lage bod.
- Te duur: vertrouwen zakt (minder bij geduldige klanten), geduldige klanten (>= 0,6) geven één tweede kans per dag, drie
  keer te duur achter elkaar = twee dagen boycot, en wie weinig discretie heeft vertelt het door aan de bewaking.
- Bekend worden (`klanten/unlock.js`): `{ rank, loyalty: [vriend, n], deals, earned, day }` of `{ any: [...] }`. Een
  vriend stelt je voor met een bericht van de nieuweling. Vertrouwen vervaagt na 7 dagen zonder deal (-1 per dag).
- Berichten (`phone.js`): vraag om een bepaald product (alleen als je dat kunt maken), waar je ze vindt en hoe laat, of dat ze
  thuisblijven. Een favoriet product dat je nog niet kunt maken staat in de contacten en in het gesprek.

## Telefoon
Contacten (`klanten/contactsPage.js`): zoeken (naam, soort, plek), filter (alle / bekend / onbekend / vast), sorteren
(vertrouwen / naam / nu buiten), per contact "meestal bij het strand 's ochtends ...", "Nu: ..." vanaf Stamklant.

## Testen
`node tests/customers.test.mjs`, `tests/phone.test.mjs`, `tests/klanten.test.mjs`. `node tests/klanten.sim.mjs` laat zien wat
de klanten met de economie doen (`VISITS=3` voor een luie speler).
