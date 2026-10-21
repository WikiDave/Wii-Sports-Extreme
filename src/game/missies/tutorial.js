// The first-day tutorial: six hints in order. Each hint shows when the previous one is done, and
// disappears when its own step is done (the player walked, swam, ...). A hint can be hidden (x) or
// the whole tutorial skipped; both are remembered in ext.tutorial. Only on day 1. Pure logic.

/** A hint closes itself after this many seconds on screen (it is never shown twice unasked). */
export const HINT_SECONDS = 60;

export const STEPS = [
  {
    id: 'loop',
    text: 'Loop met WASD, de pijltjes of de stick. Sleep de camera met je muis of vinger.',
    at: null,
    done: (w) => w.moved >= 8,
  },
  {
    id: 'water',
    text: 'Loop het water in en je gaat vanzelf zwemmen. Spatie, of de knop Spring, springt.',
    at: 'zee',
    done: (w) => w.swam,
  },
  {
    id: 'oma',
    text: 'Oma Mies staat naast de strandhut. Loop naar haar toe en tik op E.',
    at: 'oma',
    done: (w) => w.nearOma,
  },
  {
    id: 'markt',
    text: 'Citroenen koop je op de Markt in Havenstad. Daarna maak je limonade.',
    at: 'markt',
    done: (w) => w.nearMarkt || w.citroen > 0,
  },
  {
    id: 'machines',
    text: 'Zet je spullen in een machine naast de hut (Stations). Dan maakt hij het zelf af.',
    at: 'stations',
    done: (w) => w.batches > 0,
  },
  {
    id: 'verkoop',
    text: 'Klanten wachten op het strand. Praat ze aan met E. Berichten vind je op je telefoon (Tab).',
    at: 'strand',
    done: (w) => w.deals > 0,
  },
];

/**
 * The hint to show now, or null. `where` says what the player has done (see STEPS): moved (metres
 * from the start), swam, nearOma, nearMarkt, citroen (units in stock), batches, deals.
 * Returns { index, total, id, text, at, hidden } ('hidden' when the player closed this hint).
 */
export function tutorialStep(ext, where, day) {
  const t = ext.tutorial;
  if (t.done) return null;
  if (day > 1) {
    t.done = true;
    return null;
  }
  while (t.step < STEPS.length && STEPS[t.step].done(where)) {
    t.step++;
    t.hidden = -1;
    t.seen = 0;
  }
  if (t.step >= STEPS.length) {
    t.done = true;
    return null;
  }
  const s = STEPS[t.step];
  return { index: t.step, total: STEPS.length, id: s.id, text: s.text, at: s.at, hidden: t.hidden === t.step };
}

/** Closes the hint now showing (it stays closed until the next step). */
export function hideHint(ext) {
  ext.tutorial.hidden = ext.tutorial.step;
}

/** Skips the whole tutorial, for good. */
export function skipTutorial(ext) {
  ext.tutorial.done = true;
}

/** Shows the closed hint again (from the phone, app Opdrachten). */
export function showHints(ext) {
  ext.tutorial.hidden = -1;
  ext.tutorial.seen = 0;
}

/**
 * Counts the seconds the open hint has been on screen; it closes itself after HINT_SECONDS.
 * Returns true when it just closed.
 */
export function tickHint(ext, seconds) {
  const t = ext.tutorial;
  t.seen = (t.seen ?? 0) + seconds;
  if (t.seen < HINT_SECONDS) return false;
  t.hidden = t.step;
  t.seen = 0;
  return true;
}
