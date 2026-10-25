// Achievements (prestaties): 46 of them, in groups. `key` names a number in the metrics that
// tracker.js metricsOf() computes (sold, earned, rank, maxEffects, ...); `goal` is the number to
// reach. Group 'stil' is secret: the name and text stay hidden until you have it.
import { CUSTOMERS } from '../data/customers.js';

export const GROUPS = {
  verkoop: 'Verkopen',
  geld: 'Geld',
  rang: 'Rang',
  maken: 'Maken',
  wereld: 'Het eiland',
  politie: 'De bewaking',
  grappig: 'Grappig',
  stil: 'Stil (geheim)',
};

export const ACHIEVEMENTS = [
  // verkopen
  { id: 'eerste-verkoop', name: 'Eerste verkoop', text: 'Verkoop je eerste drankje aan een klant.', group: 'verkoop', key: 'sold', goal: 1 },
  { id: 'tien-stuks', name: 'Tien aan de man', text: 'Verkoop 10 stuks aan klanten.', group: 'verkoop', key: 'sold', goal: 10 },
  { id: 'vijftig-glazen', name: 'Vijftig glazen', text: 'Verkoop 50 stuks aan klanten.', group: 'verkoop', key: 'sold', goal: 50 },
  { id: 'vaste-prik', name: 'Vaste prik', text: 'Doe 25 verkopen, groot of klein.', group: 'verkoop', key: 'deals', goal: 25 },
  { id: 'vriendenkring', name: 'Vriendenkring', text: 'Verkoop aan 3 verschillende klanten.', group: 'verkoop', key: 'customers', goal: 3 },
  { id: 'iedereen-kent-je', name: 'Iedereen kent je', text: 'Verkoop aan 10 verschillende klanten.', group: 'verkoop', key: 'customers', goal: 10 },
  { id: 'hele-eiland', name: 'Het hele eiland', text: 'Verkoop aan alle klanten van het eiland.', group: 'verkoop', key: 'customers', goal: CUSTOMERS.length },
  { id: 'fooienjager', name: 'Fooienjager', text: 'Krijg 10 keer een fooi.', group: 'verkoop', key: 'tips', goal: 10 },
  { id: 'dikke-vrienden', name: 'Dikke vrienden', text: 'Haal het vertrouwen van een klant op 100.', group: 'verkoop', key: 'maxLoyalty', goal: 100 },
  // geld
  { id: 'begin-van-iets', name: 'Het begin van iets', text: 'Verdien in totaal €100.', group: 'geld', key: 'earned', goal: 100 },
  { id: 'duizend-en-een', name: 'Duizend-en-een', text: 'Verdien in totaal €1000.', group: 'geld', key: 'earned', goal: 1000 },
  { id: 'tienduizend', name: 'Tienduizend pakjes', text: 'Verdien in totaal €10.000.', group: 'geld', key: 'earned', goal: 10000 },
  { id: 'spaarvarken', name: 'Spaarvarken', text: 'Zet €1000 op de bank.', group: 'geld', key: 'bank', goal: 1000 },
  { id: 'kluis', name: 'Kluisje', text: 'Zet €10.000 op de bank.', group: 'geld', key: 'bank', goal: 10000 },
  { id: 'belasting', name: 'Belasting? Welke belasting?', text: 'Verdien €1000 en stort nooit iets op de bank.', group: 'geld', key: 'belasting', goal: 1 },
  // rang
  { id: 'rang-1', name: 'Kraamhouder', text: 'Word Kraamhouder, rang 1.', group: 'rang', key: 'rank', goal: 1 },
  { id: 'rang-2', name: 'Zoetekauw', text: 'Word Zoetekauw, rang 2.', group: 'rang', key: 'rank', goal: 2 },
  { id: 'rang-3', name: 'Suikerbaron', text: 'Word Suikerbaron, rang 3.', group: 'rang', key: 'rank', goal: 3 },
  { id: 'rang-4', name: 'Limonadekoning', text: 'Word Limonadekoning, rang 4.', group: 'rang', key: 'rank', goal: 4 },
  { id: 'rang-5', name: 'Eilandlegende', text: 'Word Eilandlegende, de hoogste rang.', group: 'rang', key: 'rank', goal: 5 },
  { id: 'hard-werken', name: 'Hard werken, zoete wraak', text: 'Verzamel 1000 ervaring.', group: 'rang', key: 'xp', goal: 1000 },
  // maken
  { id: 'eerste-brouwsel', name: 'Eerste brouwsel', text: 'Start je eerste batch.', group: 'maken', key: 'batches', goal: 1 },
  { id: 'machinepark', name: 'Machinepark', text: 'Start 10 batches.', group: 'maken', key: 'batches', goal: 10 },
  { id: 'drie-in-een', name: 'Drie in één', text: 'Maak een product met drie effecten.', group: 'maken', key: 'maxEffects', goal: 3 },
  { id: 'regenboog', name: 'De hele regenboog', text: 'Maak een product met zes effecten.', group: 'maken', key: 'maxEffects', goal: 6 },
  { id: 'drie-sterren', name: 'Drie sterren', text: 'Maak een product van ★★★ kwaliteit.', group: 'maken', key: 'maxQuality', goal: 115 },
  { id: 'koud-hoofd', name: 'Koud hoofd', text: 'Maak je eerste ijs.', group: 'maken', key: 'ijs', goal: 1 },
  { id: 'zoet-van-tong', name: 'Zoet van tong', text: 'Maak je eerste snoep.', group: 'maken', key: 'snoep', goal: 1 },
  // het eiland
  { id: 'zeezeehond', name: 'Zeezeehond', text: 'Zwem 100 meter.', group: 'wereld', key: 'swim', goal: 100 },
  { id: 'diepzeeduiker', name: 'Diepzeeduiker', text: 'Duik tot 8 meter diep.', group: 'wereld', key: 'deepest', goal: 8 },
  { id: 'nachtuil', name: 'Nachtuil', text: 'Zes uur lang buiten in de nacht.', group: 'wereld', key: 'nightMin', goal: 360 },
  { id: 'slaapkop', name: 'Slaapkop', text: 'Slaap 5 nachten.', group: 'wereld', key: 'nights', goal: 5 },
  // de bewaking
  { id: 'pat-down', name: 'Pat-down', text: 'Word gefouilleerd.', group: 'politie', key: 'frisked', goal: 1 },
  { id: 'stamgast', name: 'Stamgast bij de bewaking', text: 'Word 5 keer gefouilleerd.', group: 'politie', key: 'frisked', goal: 5 },
  { id: 'oeps', name: 'Oeps', text: 'Word gepakt.', group: 'politie', key: 'caught', goal: 1 },
  { id: 'op-de-posters', name: 'Op de posters', text: 'Bereik het niveau Gezocht.', group: 'politie', key: 'maxHeat', goal: 3 },
  { id: 'niet-welkom', name: 'Niet welkom', text: 'Een klant wil je even niet zien.', group: 'politie', key: 'boycotts', goal: 1 },
  // grappig
  { id: 'springkampioen', name: 'Springkampioen', text: 'Spring 25 keer.', group: 'grappig', key: 'jumps', goal: 25 },
  { id: 'oma-trots', name: 'Oma is trots', text: 'Praat 5 keer met Oma Mies.', group: 'grappig', key: 'talks', goal: 5 },
  { id: 'goede-leerling', name: 'Goede leerling', text: 'Maak 5 opdrachten af.', group: 'grappig', key: 'missionsDone', goal: 5 },
  { id: 'getalenteerd', name: 'Getalenteerd', text: 'Koop 6 niveaus van vaardigheden.', group: 'grappig', key: 'skillLevels', goal: 6 },
  // stil (geheim)
  { id: 'stille-kracht', name: 'Stille kracht', text: 'Vijf dagen op rij zonder meter.', group: 'stil', key: 'calm', goal: 5, hidden: true },
  { id: 'geen-woord', name: 'Geen woord gezegd', text: 'Verkoop 10 stuks zonder ooit Oma Mies te spreken.', group: 'stil', key: 'stilSold', goal: 10, hidden: true },
  { id: 'schaduwhandel', name: 'Schaduwhandel', text: 'Verkoop 5 keer waar geen bewaker kijkt.', group: 'stil', key: 'unseen', goal: 5, hidden: true },
  { id: 'verraden', name: 'Verraden door een vriend', text: 'Een klant verklikt je bij de bewaking.', group: 'stil', key: 'verklikt', goal: 1, hidden: true },
];
