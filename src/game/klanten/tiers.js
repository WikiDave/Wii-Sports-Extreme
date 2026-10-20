// Levels of trust (loyalty 0..100) and what a regular is worth. Pure logic.

export const TIERS = [
  { id: 'nieuw', name: 'Nieuwe klant', min: 0, icon: '🙂' },
  { id: 'bekende', name: 'Bekende', min: 15, icon: '😊' },
  { id: 'stam', name: 'Stamklant', min: 35, icon: '😄' },
  { id: 'vast', name: 'Vaste klant', min: 60, icon: '🥰' },
  { id: 'vriend', name: 'Beste vriend', min: 85, icon: '💖' },
];

export function tierIndex(loyalty) {
  let t = 0;
  TIERS.forEach((tier, i) => loyalty >= tier.min && (t = i));
  return t;
}

export const tierOf = (loyalty) => TIERS[tierIndex(loyalty)];

/** Regulars spend more: +8% budget per level. */
export const budgetFactor = (loyalty) => 1 + 0.08 * tierIndex(loyalty);

/** Regulars buy more: +1 unit from Stamklant, +2 from Beste vriend. */
export const extraQty = (loyalty) => (tierIndex(loyalty) >= 4 ? 2 : tierIndex(loyalty) >= 2 ? 1 : 0);

/** Chance of a tip after a deal (10% of the money): none for newcomers, up to 30% for best friends. */
export const tipChance = (loyalty) => [0, 0, 0.1, 0.2, 0.3][tierIndex(loyalty)];

/** Points to the next level, or null at the top. */
export function toNextTier(loyalty) {
  const next = TIERS[tierIndex(loyalty) + 1];
  return next ? { tier: next, points: next.min - loyalty } : null;
}
