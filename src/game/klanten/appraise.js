// How a customer judges a product: liked and disliked effects, quality, preferred product.
// Pure logic; customers.js uses it for value, satisfaction and reactions.

import { parseItem, unitPrice } from '../economy.js';
import { EFFECTS } from '../data/effects.js';

/** Value factors. */
export const LIKE_BONUS = 0.15; // per liked effect
export const DISLIKE_FACTOR = 0.7; // when the product has the effect they cannot stand
export const PREFER_BONUS = 1.05; // their favourite product

/** The facts about one item for one customer, or null if it is not a product. */
export function appraise(c, key) {
  const p = parseItem(key);
  if (!p) return null;
  const liked = p.effects.filter((e) => c.likes.includes(e));
  const disliked = p.effects.filter((e) => c.dislikes?.includes(e));
  return {
    product: p.product,
    effects: p.effects,
    quality: p.quality,
    liked,
    disliked,
    preferred: c.prefers === p.product,
    gap: p.quality - c.standard, // quality against what they expect
    base: unitPrice(p.product, p.effects, p.quality),
  };
}

/** What one unit of the item is worth to them. */
export function valueOf(c, ap) {
  let v = ap.base * (1 + LIKE_BONUS * ap.liked.length);
  if (ap.disliked.length) v *= DISLIKE_FACTOR;
  if (ap.preferred) v *= PREFER_BONUS;
  if (ap.gap < 0) v *= 1 + Math.max(-0.2, ap.gap * 0.6);
  return Math.round(v);
}

/** How much a deal pleases them: a multiplier (0.4 .. 1.6) on the trust it earns. */
export function satisfaction(ap) {
  const m = 1 + 0.08 * ap.liked.length - (ap.disliked.length ? 0.35 : 0) + Math.max(-0.15, Math.min(0.15, ap.gap * 0.5)) + (ap.preferred ? 0.05 : 0);
  return Math.max(0.4, Math.min(1.6, m));
}

/** The one thing they react to most (an event of lines.js). */
export function reactionOf(ap, offer) {
  if (ap.disliked.length) return 'hates';
  if (ap.gap < 0) return 'lowq';
  if (offer === 'hoog') return 'pricey';
  if (ap.liked.length >= 2) return 'loves';
  if (offer === 'laag') return 'cheap';
  if (ap.gap >= 0.12) return 'highq';
  if (ap.liked.length === 1) return 'likes';
  return 'plain';
}

/** Mood of a reaction for the face next to the line. */
export const MOOD = {
  loves: '😍', likes: '🙂', plain: '😐', highq: '🤩', cheap: '😄', pricey: '😬', hates: '🤢', lowq: '😕',
  refuse: '😠', retry: '🤨', boycott: '😡', again: '🙂', tier: '🥰', tip: '😊', greet: '👋', request: '🙂',
};

/** Effect to mention in a line: the first liked one, or the disliked one for 'hates'. */
export function fxOf(ap, event) {
  const id = event === 'hates' ? ap.disliked[0] : ap.liked[0] ?? ap.effects[0];
  return id ? EFFECTS[id].name : 'dit';
}
