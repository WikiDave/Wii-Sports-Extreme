// De Fiscus: the taxman's visits. Pure logic.
//
// Every evening the taxman may plan a visit for the next day to one of your businesses. The chance
// grows with the suspicion of its books. On the day an inspector (a Mii) stands at the business
// from a given hour for two hours. If you talk to him, you can show the books or slip him some
// "coffee money"; if you stay away, the books are looked at without you.
//
// The test is fair: over the last (up to) seven days you may have washed what the books can explain
// (cover x days). A bit over that gets a warning; clearly over that is a fine plus heat.

import { AUDIT, BUSINESSES, INSPECTORS } from './data.js';
import { wState, bizOf, owned, mail, washedWeek, rollBiz } from './store.js';
import { allowedWeek, weekRatio, suspicion } from './rules.js';
import { hash01, dayInfo } from '../weather.js';
import { addHeat } from '../police.js';
import { collect } from './money.js';
import { pickLine, LETTER, RESULT } from './texts.js';

const round10 = (n) => Math.round(n / 10) * 10;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Chance (0..1) that the taxman plans a visit to this business for the day after `day`. */
export function auditChance(id, b, day, event = 'rustig') {
  return AUDIT.baseChance + (AUDIT.suspChance * suspicion(id, b, day)) / 100 + (event === 'inspectie' ? AUDIT.inspectionDay : 0);
}

/** Plans a visit for tomorrow (call every evening). Returns the audit or null. rand: () => 0..1 for tests. */
export function planAudit(game, rand = null) {
  const w = wState(game);
  const day = game.state.day;
  if (w.audit) return null;
  const target = day + 1;
  const event = dayInfo(target).event;
  let best = null;
  owned(game).forEach((id, i) => {
    const b = w.biz[id];
    if (target - b.since <= AUDIT.graceDays || target - (w.last[id] ?? -99) <= AUDIT.cooldown) return;
    const p = auditChance(id, b, day, event);
    const r = rand ? rand() : hash01(target, i * 17 + 5);
    if (r < p && (!best || p > best.p)) best = { id, p };
  });
  if (!best) return null;
  const [from, to] = AUDIT.visitHours;
  w.audit = {
    id: best.id,
    day: target,
    hour: from + Math.floor(hash01(target, 99) * (to - from + 1)),
    who: Math.floor(hash01(target, 77) * INSPECTORS.length),
    status: 'gepland',
  };
  return w.audit;
}

/** Where the visit stands: geen | gepland (a later day) | vandaag (not yet there) | bezig | voorbij | gemist. */
export function auditPhase(a, day, minutes) {
  if (!a) return 'geen';
  if (day < a.day) return 'gepland';
  if (day > a.day) return 'gemist';
  const start = a.hour * 60;
  return minutes < start ? 'vandaag' : minutes < start + AUDIT.stayHours * 60 ? 'bezig' : 'voorbij';
}

/** The books against the test: what the inspector finds on day `day`. */
export function inspect(id, b, day) {
  const washed = washedWeek(b, day);
  const allowed = allowedWeek(id, b, day);
  const ratio = washed / Math.max(1, allowed);
  const excess = Math.max(0, washed - allowed);
  let verdict = 'goed';
  let fine = 0;
  let heat = 0;
  if (ratio > 1 + AUDIT.tolerance) {
    verdict = 'boete';
    fine = Math.max(AUDIT.minFine, round10(excess * AUDIT.fineShare));
    heat = clamp(0.6 + (ratio - 1 - AUDIT.tolerance) * 1.2, 0.6, 1.6);
  } else if (ratio > 1) {
    verdict = 'waarschuwing';
  }
  return { id, day, washed, allowed, ratio, excess, verdict, fine, heat };
}

/** What coffee money costs and how likely the inspector takes it. */
export const bribeCost = (report) => Math.max(50, round10(report.fine * 0.3));
export const bribeOdds = (report) => clamp(AUDIT.bribeBase - (report.ratio - 1 - AUDIT.tolerance) * 0.5, 0.15, 0.6);

/** Can the player offer coffee money right now? Only when a fine is coming and he can pay it. */
export const canBribe = (game, report) => report.verdict === 'boete' && game.state.cash + game.state.bank >= bribeCost(report);

/**
 * Settles the visit. opts: { present, bribe, rand }. present = you talked to the inspector;
 * bribe = you offered coffee money. Returns the result, or null without a visit.
 */
export function resolveAudit(game, opts = {}) {
  const w = wState(game);
  const a = w.audit;
  if (!a) return null;
  const b = bizOf(game, a.id);
  if (!b) {
    w.audit = null;
    return null;
  }
  rollBiz(b, game.state.day);
  const report = inspect(a.id, b, a.day);
  const who = INSPECTORS[a.who % INSPECTORS.length];
  let { verdict, fine, heat } = report;
  let spent = 0;
  let outcome = verdict;
  if (verdict === 'boete' && opts.bribe && canBribe(game, report)) {
    spent = bribeCost(report);
    const r = (opts.rand ?? (() => hash01(a.day, 31, a.who)))();
    collect(game, spent);
    w.stats.bribes++;
    if (r < bribeOdds(report)) {
      outcome = 'omgekocht';
      fine = 0;
      heat = 0.2;
    } else {
      outcome = 'betrapt';
      fine = round10(fine * 1.5);
      heat += 1;
    }
  } else if (verdict === 'boete' && !opts.present) {
    fine = round10(fine * AUDIT.absentSurcharge);
  }
  const { unpaid } = fine ? collect(game, fine) : { unpaid: 0 };
  if (unpaid > 0) heat += 0.5;
  if (heat > 0) addHeat(game, heat);
  // Reputation, lingering suspicion and totals.
  if (outcome === 'goed') {
    b.rep = Math.min(100, b.rep + 6);
    b.pen = 0;
    game.addXp(25);
    w.stats.passed++;
  } else if (outcome === 'waarschuwing') {
    b.pen = Math.min(60, b.pen + 10);
    w.stats.warned++;
  } else if (outcome === 'omgekocht') {
    b.pen = Math.min(60, b.pen + 10);
  } else {
    b.rep = Math.max(0, b.rep - 10);
    b.pen = Math.min(60, b.pen + 25);
    w.stats.failed++;
  }
  w.stats.visits++;
  w.stats.fines += fine - unpaid;
  w.last[a.id] = a.day;
  w.audit = null;
  const result = { id: a.id, who, outcome, report, fine, paid: fine - unpaid, unpaid, heat, spent, present: !!opts.present, text: '' };
  result.text = pickLine(RESULT[outcome], a.day + a.who);
  mail(game, outcome === 'goed' ? 'fiscus-goed' : 'fiscus-slecht', `De Fiscus bij ${BUSINESSES[a.id].short}`, summaryText(result));
  game.emit('witwassen:audit', result);
  game.emit('change');
  return result;
}

function summaryText(r) {
  const eur = (n) => `€${n.toLocaleString('nl-NL')}`;
  const base = `${r.who.name}: ${r.text} Week: ${eur(r.report.washed)} gewassen, ${eur(Math.round(r.report.allowed))} uitlegbaar.`;
  if (r.outcome === 'omgekocht') return `${base} Koffiegeld ${eur(r.spent)}: de boete is vergeten.`;
  if (r.outcome === 'betrapt') return `${base} Omkoping mislukt: koffiegeld ${eur(r.spent)} kwijt en boete ${eur(r.fine)}.`;
  if (r.fine) return `${base} Boete ${eur(r.fine)}${r.unpaid ? ` (${eur(r.unpaid)} kon je niet betalen)` : ''}.`;
  return base;
}

/**
 * The evening round of the taxman, on the 'newday' event: settles a visit you slept through,
 * says whether a visit is today, and plans the next. Returns lines of text for the player.
 */
export function dailyAudit(game, rand = null) {
  const w = wState(game);
  const day = game.state.day;
  const lines = [];
  if (w.audit && day > w.audit.day) {
    const r = resolveAudit(game, { present: false });
    if (r) lines.push(`De Fiscus was bij ${BUSINESSES[r.id].short} terwijl jij er niet was.`);
  }
  if (w.audit && w.audit.day === day) {
    const a = w.audit;
    lines.push(`De Fiscus komt vandaag om ${a.hour}:00 bij ${BUSINESSES[a.id].short}.`);
    mail(game, 'fiscus-afspraak', 'Vandaag: bezoek van de Fiscus', `${INSPECTORS[a.who % INSPECTORS.length].name} staat vanaf ${a.hour}:00 bij ${BUSINESSES[a.id].short}. Zorg dat je erbij bent om de boeken te laten zien.`);
  }
  const next = planAudit(game, rand);
  if (next) {
    lines.push(`Brief van de Fiscus: morgen om ${next.hour}:00 bij ${BUSINESSES[next.id].short}.`);
    mail(game, 'fiscus-afspraak', 'Brief van de Fiscus', pickLine(LETTER, next.day) + ` Bezoek: morgen om ${next.hour}:00 bij ${BUSINESSES[next.id].short}.`);
  } else {
    // A warning when the books look odd, even without a visit.
    const odd = owned(game).find((id) => suspicion(id, w.biz[id], day) >= 60 && weekRatio(id, w.biz[id], day) > 1);
    if (odd && hash01(day, 5) < 0.6) {
      lines.push(`Let op: de boeken van ${BUSINESSES[odd].short} vallen op.`);
      mail(game, 'fiscus-waarschuwing', 'Waarschuwing', `De cijfers van ${BUSINESSES[odd].short} zijn "bijzonder gunstig". Was je niet een beetje te enthousiast met wassen? Houd je aan de dekking, dan blijft het rustig.`);
    }
  }
  return lines;
}
