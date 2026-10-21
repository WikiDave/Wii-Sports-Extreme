// Dutch texts of the laundering layer: letters from the taxman, what he says afterwards, tips.

export const pickLine = (list, seed = 0) => list[Math.abs(Math.floor(seed)) % list.length];

export const LETTER = [
  'Geachte ondernemer, wij hebben uw ijsjes geteld en komen er niet helemaal uit.',
  'Geachte ondernemer, de Fiscus wil graag eens zien hoe zo’n druk kasboek eruitziet.',
  'Beste ondernemer, een routinecontrole. Wij nemen zelf de koffie mee.',
  'Geachte ondernemer, uw omzet was gisteren het gesprek van de dag bij onze koffieautomaat.',
];

export const RESULT = {
  goed: [
    'Alles klopt tot op de laatste hoorn. Mooi kasboek!',
    'Netjes bijgehouden. Ik ruik alleen ijs en zonnebrand.',
    'Hier valt niets op aan te merken. Mag ik een bol voor onderweg?',
  ],
  waarschuwing: [
    'Het is wat veel voor zo’n zaak. Dit keer laat ik het bij een waarschuwing.',
    'Hm, ongewoon druk. Ik houd u in de gaten, ondernemer.',
  ],
  boete: [
    'Dit klopt voor geen meter. Ik heb een rekenmachine en ik ben niet bang om hem te gebruiken.',
    'Zoveel klanten op één dag? Dat is een boete waard.',
    'Het kasboek en de werkelijkheid zijn goede vrienden, maar niet van elkaar.',
  ],
  omgekocht: [
    'Wat een lekker koffietje. Ik heb niets gezien.',
    'Dit envelopje is… erg goed gevuld. Laten we het hierbij laten.',
  ],
  betrapt: [
    'Een envelopje? Dit is een scandaal! Dat kost u extra.',
    'Poging tot koffiegeld! Daar staat een flinke boete op.',
  ],
};

export const WASH_TIPS = [
  'Blijf onder de dekking (de groene streep) dan blijft de Fiscus vriendelijk.',
  'Een zaak die goed draait krijgt een betere naam: meer capaciteit en meer dekking.',
  'Contant geld in je zak valt op als de bewakers meekijken. Was het weg of zet het op de bank.',
  'De pinautomaat in de haven neemt meer ongewassen geld aan dan je telefoon.',
  'Een betere boekhouding vergroot de dekking: je mag dan veilig meer wassen.',
];

export const BANK_LIMIT_TEXT = (left, via) =>
  via === 'atm'
    ? `De pinautomaat neemt vandaag nog €${left.toLocaleString('nl-NL')} aan ongewassen geld aan.`
    : `Je bank neemt vandaag nog €${left.toLocaleString('nl-NL')} aan ongewassen geld aan via de telefoon.`;
