// Guard personalities: who is lazy, who is alert, and who walks with a buddy. Pure logic.
//
//   normaal  the ordinary guard
//   alert    sees more, reacts faster, hears better
//   lui      stands around a long time, sees and hears less
//   maat     always walks next to the guard just before him (his buddy)

export const PERSONAS = {
  normaal: { name: 'Gewone bewaker', view: 1, speed: 2.2, wait: [1, 2.5], suspect: 1, hear: 1 },
  alert: { name: 'Alerte bewaker', view: 1.15, speed: 2.8, wait: [0.3, 1], suspect: 1.4, hear: 1.4 },
  lui: { name: 'Luie bewaker', view: 0.85, speed: 1.5, wait: [4, 8], suspect: 0.6, hear: 0.6 },
  maat: { name: 'Maatje', view: 1, speed: 2.2, wait: [1, 2], suspect: 1, hear: 1, buddy: true },
};

const ORDER = ['normaal', 'alert', 'lui', 'maat'];

/** Personality key of guard number i. */
export const personaOf = (i) => ORDER[i % ORDER.length];

/** The index of the guard this one walks with (the one before him), or null. */
export const partnerOf = (i, key) => (PERSONAS[key].buddy && i > 0 ? i - 1 : null);

/** How far (metres) a guard hears a noise of each kind, before the personality factor. */
export const HEAR = { run: 13, deal: 10 };

export const hearRadius = (persona, kind) => (HEAR[kind] ?? 0) * persona.hear;

/** The guards that get a radio call from `from`: within range, not already helping. */
export function radioRecipients(guards, from, range) {
  return guards.filter((g) => g !== from && g.alert <= 0 && Math.hypot(g.x - from.x, g.z - from.z) < range);
}
