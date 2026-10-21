// What the rivals say when you walk past them: funny, never violent. Now and then a taunt is a
// threat to call the guards; that only matters when you carry product (the heat goes up a little).
// Pure logic.

export const TAUNTS = {
  lex: {
    lines: [
      'Jouw limonade is zuur, hoor! Mijn spul is zoet!',
      'Ga maar naar het strand. Hier is mijn plek.',
      'Zeg, ik ben de baas van de markt. Dat weet je toch?',
      'Mijn citroenen zijn groter dan die van jou. Kijk maar.',
    ],
    threats: ['Ik heb net gehoord dat de bewaking vanmiddag langskomt. Haha!', 'Nog één keer hier rondhangen en ik bel de bewaking!'],
  },
  gina: {
    lines: [
      'Mijn ijs smelt nooit, anders dan jouw klanten bij mij!',
      'Die bewaker met de zaklamp, dat is mijn oom. Even tussen ons.',
      'Kom eens langs, dan leer ik je hoe het hoort.',
      'Ik heb een nieuwe smaak. Vraag maar niet welke.',
    ],
    threats: ['Ik zeg het tegen de bewaking als je hier blijft hangen.', 'Zie je die bewaker daar? Die is van mij.'],
  },
};

/** Chance that a taunt is a threat. */
export const THREAT_CHANCE = 0.25;
/** Seconds between two taunts (the range is picked at random). */
export const TAUNT_GAP = [25, 40];

/** One taunt for a rival (by id). threat: pick from the threats instead. */
export function tauntFor(id, rand = Math.random, threat = false) {
  const t = TAUNTS[id] ?? TAUNTS.lex;
  const list = threat ? t.threats : t.lines;
  return list[Math.floor(rand() * list.length) % list.length];
}

/** Whether the next taunt is a threat. */
export const isThreat = (rand = Math.random) => rand() < THREAT_CHANCE;
