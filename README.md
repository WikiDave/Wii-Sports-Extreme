# Wii Sports Extreme

Een fan-remake van Wii Sports in de browser, stap voor stap gebouwd met
JavaScript en [three.js](https://threejs.org/). Geen build-stap nodig.

## Stappenplan

| Stap | Onderdeel | Status |
| ---- | --------- | ------ |
| 1 | Mii-kanaal (Mii's maken en bewaren) | klaar |
| 2 | Tennis | gepland |
| 3 | Bowling | gepland |
| 4 | Honkbal | gepland |
| 5 | Golf | gepland |
| 6 | Boksen | gepland |

## Stap 1: het Mii-kanaal

- **Mii-plein** met al je Mii's: maken, bewerken, kopiëren en verwijderen.
- **Nieuwe Mii**: begin met een leeg gezicht (man of vrouw) of kies een lookalike.
- **Editor** met een live 3D-voorbeeld (sleep om de Mii te draaien) en dezelfde negen
  tabbladen als op de Wii. Alle onderdelen van het Wii Mii-kanaal zitten erin, in dezelfde
  volgorde: 8 gezichtsvormen, 12 soorten make-up en rimpels, 72 kapsels, 24 wenkbrauwen,
  48 ogen, 12 neuzen, 24 monden, 9 brillen, 3 snorren, 3 baarden en een moedervlek.
  Ogen, wenkbrauwen, mond, snor en bril kun je groter, kleiner, hoger, lager,
  verder uit elkaar en schuiner zetten, net als op de Wii.
- Mii's worden bewaard in de browser (`localStorage`), zodat de sporten ze straks
  kunnen gebruiken.

## Spelen

ES-modules werken niet via `file://`, dus start een kleine webserver in deze map:

```sh
npm start              # of: python3 -m http.server 8080
```

Open daarna <http://localhost:8080>. Met `#mii` achter de URL ga je direct naar het Mii-kanaal.

## Projectstructuur

```
index.html            startpagina
css/style.css         alle opmaak (Wii-menu stijl)
lib/                  three.js 0.180.0 (MIT-licentie)
src/main.js           start de app en wisselt tussen schermen
src/screens/          menu, Mii-plein en Mii-editor
src/mii/data.js       Mii-gegevens: standaardwaarden, controle, willekeurige Mii's
src/mii/storage.js    opslaan in localStorage
src/mii/parts.js      de Wii-gezichtsonderdelen (ogen, wenkbrauwen, neuzen, monden, snorren)
src/mii/face.js       tekent het gezicht: onderdelen, baard, bril en make-up
src/mii/head.js       3D-hoofd (eivorm), gezichtsvormen, neusbultje en oren
src/mii/hair.js       de 72 kapsels (plus pet en muts)
src/mii/body.js       het lichaam (met gewrichten voor animaties in de sporten)
src/mii/model.js      zet alles samen tot één 3D-Mii
src/mii/thumbs.js     portretten en 3D-icoontjes
src/three/            3D-hulpmiddelen en de draaibare voorbeeldweergave
```

Een Mii is gewoon JSON (zie bovenaan `src/mii/data.js`). In een sport maak je er
zo een 3D-figuur van:

```js
import { MiiModel } from './src/mii/model.js';
import { miiStore } from './src/mii/storage.js';

const mii = new MiiModel(miiStore.all()[0]);
scene.add(mii.group); // voeten op y = 0; mii.parts.armR enz. kun je animeren
```

## Let op

Dit is een fanproject zonder banden met Nintendo. Wii, Mii en Wii Sports zijn
handelsmerken van Nintendo. Alle graphics worden met code gemaakt; er zitten geen
bestanden van Nintendo in dit project.
