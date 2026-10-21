// What happens to your businesses when a new day starts: the honest takings are wired to your
// bank account (minus wages), reputation grows or drops, old suspicion fades, and the taxman
// plans his rounds. Pure logic; the feature calls onNewDay() on the 'newday' event.

import { BUSINESSES } from './data.js';
import { wState, owned, rollBiz, mail } from './store.js';
import { cover, revenue, isOpen } from './rules.js';
import { wire, collect } from './money.js';
import { flushSource } from './ledger.js';
import { dailyAudit } from './audit.js';

const eur = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;

/** Settles yesterday for every business. Returns lines of text. */
export function closeBooks(game) {
  const w = wState(game);
  const day = game.state.day;
  const prev = day - 1;
  const lines = [];
  for (const id of owned(game)) {
    const b = w.biz[id];
    const d = BUSINESSES[id];
    const washed = b.day === prev ? b.in : 0;
    if (isOpen(b, prev)) {
      const takings = revenue(id, b, prev);
      const net = takings - d.staff;
      if (net >= 0) wire(game, net);
      else {
        const { unpaid } = collect(game, -net);
        if (unpaid > 0) b.closed = day; // cannot pay the wages: closed today
      }
      b.earned += net;
      w.stats.profit += net;
      // Reputation: a fair, busy business grows; one that overshoots its cover loses name.
      const fair = washed <= cover(id, b);
      b.rep = Math.max(0, Math.min(100, b.rep + (fair ? (washed > 0 ? 2 : 1) : -3)));
      lines.push(`${d.short}: ${net >= 0 ? '+' : '−'}${eur(Math.abs(net))}${b.closed === day ? ' (dicht: loon niet betaald)' : ''}`);
    }
    b.pen = Math.max(0, b.pen - 6);
    rollBiz(b, day);
  }
  return lines;
}

/** Everything that happens on a new day. Returns { profit: [lines], taxman: [lines] }. */
export function onNewDay(game, rand = null) {
  flushSource(game, 'personeel');
  const profit = closeBooks(game);
  if (profit.length) mail(game, 'bedrijf', 'Winst van gisteren', profit.join(' · '), true);
  const taxman = dailyAudit(game, rand);
  game.emit('change');
  return { profit, taxman };
}
