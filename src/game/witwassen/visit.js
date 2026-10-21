// The taxman's visit as an event: when the phase of a planned visit changes, what the world should
// do. Pure: the feature calls visitEvents() every frame with the phase from auditPhase().

/**
 * prev, now: the phases before and now ('geen' | 'gepland' | 'vandaag' | 'bezig' | 'voorbij' | 'gemist').
 * pending: whether the visit is still unsettled (w.audit is set).
 * Returns the events: 'begin' (the inspector arrives) and/or 'absent' (the visit is over and you
 * never talked to him: the books are settled without you).
 */
export function visitEvents(prev, now, pending) {
  if (!pending) return [];
  const out = [];
  if (now === 'bezig' && prev !== 'bezig') out.push('begin');
  if (now === 'voorbij' || now === 'gemist') out.push('absent');
  return out;
}

/** Whether the inspector stands at the business now. */
export const inspectorHere = (phase, pending) => !!pending && phase === 'bezig';
