# Spelontwerp (werktitel: Wii Sports Extreme)

## Pitch
Een vrolijk, zonnig resort-eiland in Wii Sports Resort-stijl, met een streng **Resort-reglement**:
zelfgemaakte drankjes en snoep zijn verboden. Jij begint als Mii met €250 en een oude strandhut,
en bouwt een smokkelimperium op in **illegale limonade, snoep en ijs**. Het is een parodie op
Schedule I: dezelfde opzet (maken, mengen, verkopen, uitbreiden, uit handen van de bewaking
blijven), maar de "verboden waar" is suikerwerk. Er komen geen echte drugs, wapens of geweld in.

Toon: vrolijk en droog. De Wii-wereld blijft netjes, de grap zit in hoe serieus iedereen het neemt.

## Kernlus
1. **Maken:** een basisproduct maken met een minigame (groeien, koken, schenken).
2. **Mengen:** ingrediënten toevoegen. Die geven effecten en verhogen de prijs.
3. **Verpakken:** in zakjes, flesjes of bekertjes (minigame, timing).
4. **Verkopen:** aan Mii-klanten via berichtjes op je telefoon, en later via verkopers.
5. **Investeren:** in panden, apparatuur, personeel en nieuwe recepten.
De bewaking (Reglement-meter) remt je als je te opvallend werkt.

## Wereld: Wahoe-eiland (eigen eiland, Resort-sfeer)
| Zone | Wat er is | Vrij vanaf |
|------|-----------|-----------|
| Strand-Zuid | startershut, eerste klanten, strandtent | start |
| Havenstad | winkels (ingrediënten), bank, kantoor van de bewaking | start |
| Vuurtorenkaap | rustige dealplek, opslagloods te koop | rang 2 |
| Resort-heuvels | hotels, rijke klanten, villa te koop | rang 3 |
| Vulkaanberg | geheime grot-keuken, zeldzame ingrediënten | rang 4 |
| Vliegveld-eiland | export, eindspel | rang 5 |
Vervoer: lopen, later fiets, scooter en waterscooter.

## Producten (basis)
| Product | Hoe | Inkoop/zet | Basisprijs | Vrij vanaf |
|---------|-----|-----------|-----------|-----------|
| Limonade | citroenboompjes kweken, persen, schenken | zaadje €10 | €20 | start |
| Snoep | suiker koken in een pan (temperatuur-minigame) | €25 | €45 | rang 2 |
| IJs | mixer en vriezer (schud-minigame) | €40 | €80 | rang 3 |
| Bruisdrank "Turbo" | koken, bubbels en vullen in drie stappen | €70 | €150 | rang 4 |

## Mengen en effecten (zoals Schedule I)
- Een product heeft maximaal **6 effecten**. Elk ingrediënt voegt zijn eigen effect toe **en**
  kan bestaande effecten omzetten (bijvoorbeeld *Bruisend* plus chili wordt *Vurig*).
- Prijs = basisprijs × (1 + som van de effectfactoren). Recepten worden opgeslagen en hernoemd.
- Ongeveer 16 ingrediënten (citroen, kokos, munt, chili, honing, bubbels, ananas, zeezout,
  kaneel, bosbes, ...) en 24 effecten (*Zoet* ×0,1 ... *Glinsterend* ×0,6), met grappige
  bijwerkingen op Miis: giechelen, stuiteren, gloeien of grote ogen. Het is visueel en
  onschuldig, en de Mii-maker kan het tonen.
- De effecttabel en de omzettingsregels staan als data in `src/game/data/`. Dat is stap 3.1 (Haiku).

## Klanten
- Elke klant is een Mii met een **budget**, **3 favoriete effecten**, een **dagschema**
  (plekken en tijden) en **trouw** (0 tot 100).
- Tevreden klanten kopen vaker, betalen meer en stellen nieuwe klanten voor. Zo ontgrendel je
  er meer.
- Een deal gaat zo: de klant stuurt een bericht, jullie spreken een tijd en plek af, je geeft
  het af en hij betaalt. Is de prijs te hoog, dan weigert hij of loopt de trouw terug.

## Bewaking: de Reglement-meter
- Vijf niveaus (0 tot 4). De meter stijgt door deals in het zicht, door 's nachts rond te lopen
  met voorraad, en door tips van klanten met een lage trouw. Hij zakt met de tijd.
- Hogere niveaus brengen meer bewakers met kijkkegels, fouilleren, boetes en in beslag genomen
  voorraad. Op niveau 4 volgt een achtervolging: wie gepakt wordt, verliest zijn voorraad en 30% cash.
- Er is geen geweld: je ontsnapt door te rennen, je te verstoppen of je outfit te wisselen.

## Geld
- **Cash** (zakgeld) en **bank**. Cash boven €5.000 valt op. Je wast geld wit via legale
  kraampjes (een ijskraam, een surfschool) die per dag een vast bedrag "verklaren".
- Uitgaven: ingrediënten, huur, apparatuur, personeelsloon (per dag) en boetes.

## Personeel en panden
- **Tuinier** (kweekt en oogst), **kok** (maakt en mengt volgens recept), **inpakker**,
  **verkoper** (heeft zijn eigen klantenkring, krijgt 20% commissie, cash ophalen).
- Panden: strandhut (start), loods (€2.500), villa (€12.000), grot (€40.000). Elk pand heeft
  een aantal plekken voor apparaten en een opslaglimiet.

## Rang (voortgang)
XP verdien je met verkopen. Er zijn zes rangen: *Strandjutter, Kraamhouder, Zoetekauw,
Suikerbaron, Limonadekoning, Eilandlegende*. Een hogere rang geeft nieuwe zones, producten,
ingrediënten en panden.

## Tijd
- Eén speldag duurt 24 minuten (1 seconde is 1 spelminuut), van 06:00 tot 04:00. Daarna slaap je
  verplicht en wordt de dag afgerekend (loon, huur, witwassen).
- Dag en nacht veranderen het licht, de klantschema's en de bewaking (nachts is er meer
  controle maar zijn er minder getuigen).

## Besturing
- **Camera:** derde persoon achter de Mii, zoals in de Resort-eilandvluchten. Slepen of de muis
  draait de camera.
- **Desktop:** WASD lopen, Shift rennen, E gebruiken, Tab telefoon, muis voor minigames.
- **Telefoon:** virtuele stick links, knoppen rechts (Gebruik, Rennen, Telefoon), en
  minigames met vegen en vasthouden. Elke minigame moet met één vinger te spelen zijn.

## Minigames (het Wii-gevoel)
| Minigame | Beweging | Gebruikt voor |
|----------|----------|---------------|
| Schenken | vasthouden en kantelen, stoppen op de lijn | limonade, Turbo |
| Persen | snel vegen | citroenen |
| Koken | temperatuurwijzer in de groene zone houden | snoep |
| Schudden | heen en weer vegen op het ritme | ijs |
| Inpakken | tikken op het juiste moment | alles |
| Kweken | water geven, timing | planten |
Een goede score geeft meer of betere kwaliteit (×0,8 tot ×1,2 op de prijs). Personeel speelt
de minigame niet en levert altijd ×1,0.

## Opslag
- Eén JSON-object in `localStorage` onder `wse.game.v1`, met `version` voor migraties.
- Het bevat de speler (mii-id, positie, cash, bank, xp), de dag en tijd, de voorraad, de
  recepten, de panden en apparaten, het personeel, de klanten (trouw, ontgrendeld) en de meter.
- Automatisch opslaan bij het slapen en elke 2 spelminuten. Miis komen uit de bestaande `miiStore`.

## Techniek
```
src/game/
  main.js          start, gamelus (vaste tick van 10/s voor logica, render per frame)
  state.js         spelstatus, opslaan en laden, events (on/emit)
  time.js          klok, dag en nacht
  world/island.js  hoogtekaart, zee, zones, bouwplekken
  world/props.js   palmen, huizen, vuurtoren
  player.js        Mii lopen, camera, botsing
  input.js         toetsenbord, muis, aanraakstick
  economy.js       prijzen, mengen, effecten
  customers.js     klant-AI, schema's, deals
  police.js        meter, bewakers, kijkkegels
  minigames/*.js   één bestand per minigame
  ui/*.js          HUD, telefoon, menu's
  data/*.js        producten, ingrediënten, effecten, panden (pure data)
```
- Logica (economie, mengen, klanten) staat los van three.js, zodat je die snel met Node kunt testen.
- Lowpoly-geometrie wordt met code gemaakt, met platte kleuren en de bestaande `MiiMaterial`-
  verlichting voor de Wii-look.
- Miis zonder losse armen kunnen nu alleen lopen met wiebelen en stuiteren. Losse ledematen
  voor de animaties komen in stap 1.3.

## Eerste speelbare versie (einde fase 2)
Strand-Zuid en Havenstad, de strandhut, limonade met 4 ingrediënten, 5 klanten, de
schenk-minigame, de dag en nacht, opslaan, en de meter zonder bewakers.

## Bewust niet
Echte drugsnamen, wapens of geweld, multiplayer (eventueel later), en Nintendo-assets.
