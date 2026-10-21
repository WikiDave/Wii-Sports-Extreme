// What the people of the island talk about: tomorrow's weather (from weather.js, so the
// talk is true) and a few rumours. The same day gives the same talk. Pure logic.

import { dayInfo, WEATHER } from '../weather.js';

const RUMOURS = [
  'Ik hoorde dat de bewaking vanavond bij de haven rondloopt. Kijk uit.',
  'De ijskraam is sinds gisteren de drukste plek van het eiland.',
  'Het hotel zoekt een nieuwe piccolo. Het werk is niet zwaar, zeggen ze.',
  'Op de vuurtorenkaap ligt een schelp die bijna gloeit, dat zegt mijn oom.',
  'Wie vroeg opstaat, vindt de mooiste schelpen op het strand.',
  'De surfschool wil een tweede steiger. De gemeente heeft nog geen besluit.',
  'Het vuur op het strand brandt vanavond, als je zin hebt in gezelligheid.',
  'Bij de markt verkopen ze nu gele shirts. Iedereen loopt er al mee rond.',
  'De vulkaan rookt wat meer dan gewoonlijk. Niets om je zorgen over te maken.',
  'Een zwerver op de klif heeft gisteren vier schelpen gevonden. Vier!',
];

/** One line of talk for a day: every third line is the weather of tomorrow, the others rumours. */
export function gossip(day, k = 0) {
  if (k % 3 === 0) {
    const tomorrow = WEATHER[dayInfo(day + 1).weather].name.toLowerCase();
    return `Het weer van morgen: ${tomorrow}.`;
  }
  return RUMOURS[(day * 3 + k) % RUMOURS.length];
}
