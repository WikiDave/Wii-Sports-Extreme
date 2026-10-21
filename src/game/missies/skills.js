// Skills (vaardigheden): six perks with three levels each. A level costs one skill point.
// Points come from your rank (1 at the start, plus 2 per rank) and from some missions (ext.points).
// Pure functions, no DOM or three.js. Other systems read the effects with skillBonus(state, id):
//   onderhandelen  extra money per sale, a fraction (0.04 per level)
//   uithouding     seconds of running in reserve, on top of the base 15 (+5 per level)
//   sluipen        fraction less view range for the guards (0.15 per level)
//   brouwen        quality points added to a batch (0.05 per level: 1.00 becomes 1.05, 1.10, 1.15)
//   zware-zak      extra storage units (+20 per level; economy.js and empire.js add bagBonus)
//   charme         extra trust per sale (+2 per level)

export const MAX_LEVEL = 3;
export const BASE_RUN = 15;

/** Effect per level (see the header). */
const PER = {
  onderhandelen: 0.04,
  uithouding: 5,
  sluipen: 0.15,
  brouwen: 0.05,
  'zware-zak': 20,
  charme: 2,
};

export const SKILLS = [
  { id: 'onderhandelen', name: 'Onderhandelen', icon: '🤝', text: 'Klanten betalen per verkoop meer.', unit: (v) => `+${Math.round(v * 100)}% per verkoop` },
  { id: 'uithouding', name: 'Uithoudingsvermogen', icon: '💨', text: 'Langer rennen voordat je buiten adem bent.', unit: (v) => `${BASE_RUN + v} s rennen` },
  { id: 'sluipen', name: 'Sluipen', icon: '🐾', text: 'Bewakers zien je pas van dichterbij.', unit: (v) => `${Math.round(v * 100)}% minder zicht` },
  { id: 'brouwen', name: 'Brouwen', icon: '🧪', text: 'Betere kwaliteit uit de machines.', unit: (v) => `+${Math.round(v * 100)} kwaliteit` },
  { id: 'zware-zak', name: 'Zware zak', icon: '🎒', text: 'Meer plek voor je voorraad.', unit: (v) => `+${v} stuks opslag` },
  { id: 'charme', name: 'Charme', icon: '😊', text: 'Klanten raken sneller vertrouwd met je.', unit: (v) => `+${v} vertrouwen per verkoop` },
];

export const SKILL_IDS = SKILLS.map((s) => s.id);

/** Level of a skill (0..3) from the save: state.ext.missies.skills[id]. */
export function skillLevel(state, id) {
  const lv = state?.ext?.missies?.skills?.[id] ?? 0;
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor(lv) || 0));
}

/** The effect of a skill at its current level (0 when not bought). See the header for the units. */
export function skillBonus(state, id) {
  return skillLevel(state, id) * (PER[id] ?? 0);
}

/** Extra storage from the skill Zware zak (economy.js and empire.js add this to the stock limit). */
export const bagBonus = (state) => skillBonus(state, 'zware-zak');

/** Total skill points from the rank and from missions. */
export function pointsEarned(state, rank) {
  return 1 + 2 * Math.max(0, rank | 0) + Math.max(0, Math.floor(state?.ext?.missies?.points ?? 0));
}

/** Levels bought so far (each costs one point). */
export const levelsBought = (state) => SKILL_IDS.reduce((n, id) => n + skillLevel(state, id), 0);

/** Points you can still spend. */
export const pointsFree = (state, rank) => pointsEarned(state, rank) - levelsBought(state);

/**
 * Buys the next level of a skill: one point, at most MAX_LEVEL. Returns true when it worked.
 * Writes into state.ext.missies.skills (created when missing).
 */
export function buySkill(state, id, rank) {
  if (!SKILL_IDS.includes(id) || skillLevel(state, id) >= MAX_LEVEL || pointsFree(state, rank) < 1) return false;
  const ext = (state.ext ??= {});
  const mine = (ext.missies ??= {});
  const skills = (mine.skills ??= {});
  skills[id] = skillLevel(state, id) + 1;
  return true;
}

/** Plain words for the effect at a level, for the skill card ('' at level 0). */
export function effectText(id, level) {
  const s = SKILLS.find((x) => x.id === id);
  if (!s || level < 1) return '';
  return s.unit(PER[id] * level);
}

/**
 * Raises a batch key's quality by a bonus (0.05 = 5 points). Keys look like "p:limonade:fris:100"
 * (quality in %). Returns the new key, at most 150 %. Pure string work: no import of economy.js,
 * which imports this file.
 */
export function boostKey(key, bonus) {
  const m = /^(p:[a-z]+:[a-z+]*:)(\d+)$/.exec(key);
  if (!m || !bonus) return key;
  return `${m[1]}${Math.min(150, +m[2] + Math.round(bonus * 100))}`;
}
