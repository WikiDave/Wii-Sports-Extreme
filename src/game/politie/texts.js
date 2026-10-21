// The Dutch texts of the police feature: the arrest cutscene, the level descriptions, raids,
// the checkpoint and the radio. Plain strings and small functions, no DOM.

import { LEVEL_NAMES } from '../police.js';

/** What each heat level means for you (shown in the Politie app). */
export const LEVEL_TEXT = [
  'Niemand let op je. Lekker zoet, lekker stil.',
  'Een bewaker kijkt vaker jouw kant op. Fouilleren kan nu.',
  'Bewakers lopen je achterna en willen je tas zien. Je waar kan in beslag worden genomen.',
  'Politieauto\'s rijden rond, er zijn controles bij de brug, en je hut kan worden doorzocht als je slaapt.',
  'Bewakers zitten achter je aan! Ren, spring in het water, of verstop je in een struik of de hotellobby.',
];

/** The level line: name and description. */
export const levelLine = (lvl) => `${LEVEL_NAMES[lvl]}: ${LEVEL_TEXT[lvl]}`;

/** How the police open the arrest scene (the day picks one). */
export const OPENERS = [
  'Een bewaker tikt je op je schouder. "Mag ik even in die tas kijken, meneer Mii?"',
  'Twee bewakers duwen je tegen de muur van de hut. "Ruik jij dat? Dat is zoete limonade!"',
  'Een agent op een fiets roept je na: "Blijf staan, je hebt een opvallend drankje bij je!"',
];

/** Extra line for repeat catches (0 = first time). */
export const REPEATS = [
  '',
  'Dit is al de tweede keer deze week, vriend. We maken het zwaarder.',
  'Dit is de derde keer deze week. Je krijgt een extra nacht, en de koekjes zijn op.',
];

export const opener = (day) => OPENERS[Math.abs(day) % OPENERS.length];

export const nightsText = (n) => (n > 1 ? `${n} nachten` : '1 nacht');

export const CELL_TEXT = 'Op het politiebureau in Havenstad zet agent Bram een kopje cacao voor je neer. "Eén nachtje in de cel. Daar word je vanzelf rustig van."';

export const BAIL_TEXT = (bail) => `Agent Bram knikt naar de borg van €${bail}. "Verstandig. Je mag over een uurtje weer naar buiten."`;

export const NO_BAIL_TEXT = (bail) => `Je hebt niet genoeg voor de borg (€${bail}). Agent Bram: "Dan niet, dan maar lekker slapen."`;

/** The result after a bail release. */
export const bailResult = ({ lost, keep }) =>
  `Je houdt ${keep} stuks over. ${lost} stuks zijn in beslag genomen. "Zoete dromen en niet meer met limonade lopen zwaaien!"`;

/** The result after a night in the cell. */
export const cellResult = ({ lost, cashLost }) =>
  `De matras is hard en de cel is klein. Je verliest ${lost} stuks${cashLost ? ` en €${cashLost}` : ''}. "Goedemorgen! Zoete dromen gehad?"`;

export const MORNING = 'Goedemorgen. Je mag weer naar buiten, met je tas leeg.';
export const BAIL_OUT = 'Na een uurtje ben je weer buiten. Dat was duur, maar je hebt wel iets over.';

export const RADIO = (name) => `📻 ${name} roept de collega's op: "Kijk eens naar die gast met de limonade!"`;

export const CHECKPOINT_CLEAN = 'De agent bij de brug wuift je door. "Fijne dag, en niet te veel zon."';
export const CHECKPOINT_SEARCHED = 'De agent bij de brug kijkt in je tas. "Hm. Dat ruikt zoet." Je meter gaat omhoog.';

export const ROADBLOCK = 'Een wegversperring! Twee politieauto\'s staan dwars over het pad.';

export const HIDE_IN = (kind) => (kind === 'hotel' ? 'Je verstopt je in de hotellobby. Ze kijken niet goed.' : 'Je verstopt je in de struik. Shh.');

export const BRIBE_OK = 'Agent Bram stopt de envelop weg. "Ik heb u niet gezien."';
export const DISGUISE_OK = 'Pet en zonnebril op. Vandaag let de bewaking minder goed op.';
