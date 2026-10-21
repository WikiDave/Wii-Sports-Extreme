// The arrest, as three short scenes in dialogs: the police take you in (and you choose bail or the
// cell), then the result. The state changes in resolveArrest; the time skip is done by the caller
// (skipTime), once the player leaves the post.

import { arrestPlan, resolveArrest } from './arrest.js';
import { REPEATS, CELL_TEXT, BAIL_TEXT, NO_BAIL_TEXT, bailResult, cellResult, nightsText, opener } from './texts.js';

/**
 * Opens the arrest scenes. onDone(result) runs when the player leaves the post (or closes the last
 * dialog). Returns nothing.
 */
export function openArrestScene({ game, h, modal, onDone }) {
  const s = game.state;
  const plan = arrestPlan(s);
  let chosen = false;
  let done = false;
  const finish = (result) => {
    if (done) return;
    done = true;
    onDone(result);
  };
  const result2 = (result) => {
    const text = result.bail ? bailResult(result) : cellResult(result);
    modal({
      title: result.bail ? 'Vrijgelaten op borg' : 'Politiebureau Havenstad',
      body: h('div', { class: 'pz-scene' }, h('p', {}, text)),
      actions: [{ label: 'Naar buiten', kind: 'primary' }],
      onClose: () => finish(result),
    });
  };
  const choose = (bail) => {
    chosen = true;
    const result = resolveArrest(game, { bail });
    // A moment later, so the first dialog is gone before the next one opens.
    setTimeout(() => result2(result), 0);
  };

  const body = h(
    'div',
    { class: 'pz-scene' },
    h('p', {}, opener(s.day)),
    h('p', {}, `Je tas bevat ${plan.goods} stuks en €${s.cash.toLocaleString('nl-NL')}.`),
    plan.recent ? h('p', {}, REPEATS[Math.min(2, plan.recent)]) : null,
    h('p', {}, CELL_TEXT),
    h('p', { class: 'pz-note' }, plan.canBail ? BAIL_TEXT(plan.bail) : NO_BAIL_TEXT(plan.bail)),
  );
  const actions = [];
  if (plan.canBail) actions.push({ label: `Borg betalen (€${plan.bail})`, kind: 'primary', onClick: () => choose(true) });
  actions.push({ label: `De nacht in de cel (${nightsText(plan.nights)})`, kind: plan.canBail ? undefined : 'primary', onClick: () => choose(false) });
  modal({
    title: 'Gepakt!',
    body,
    actions,
    onClose: () => {
      if (!chosen) choose(false);
    },
  });
  // The scene ends with the result dialog's button; a closed result dialog ends it too.
  return { chosen: () => chosen };
}
