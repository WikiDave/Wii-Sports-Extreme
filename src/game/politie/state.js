// Save data of the feature "politie" (6.7): everything lives in game.state.ext.politie as plain
// JSON. Pure logic: no DOM, no three.js.
//
//   arrests   days on which you were taken to the police post (sentences grow with repeats)
//   pending   true while the arrest cutscene is waiting to be shown (survives a reload)
//   bribedDay / disguiseDay   the day you last paid the police contact / bought a disguise
//   log       what happened, newest first: { day, minutes, kind, text }
//   inbox     messages from the police (raids): { id, day, title, text, read }
//   raids     how many raids you had in total

export const KEY = 'politie';
export const LOG_MAX = 30;
export const INBOX_MAX = 20;

const DEFAULTS = () => ({ arrests: [], pending: false, bribedDay: 0, disguiseDay: 0, log: [], inbox: [], raids: 0 });

/** The feature's save data, created on first use (the save always holds every field it creates). */
export function pol(state) {
  const have = state.ext?.[KEY];
  if (have) return have;
  state.ext ??= {};
  return (state.ext[KEY] = DEFAULTS());
}

/** Adds a line to the log of what happened (newest first). */
export function logEvent(state, kind, text) {
  const ext = pol(state);
  ext.log.unshift({ day: state.day, minutes: Math.floor(state.minutes), kind, text });
  if (ext.log.length > LOG_MAX) ext.log.length = LOG_MAX;
  return ext.log[0];
}

/** Adds a police message to the inbox (newest first). */
export function addInbox(state, { title, text }) {
  const ext = pol(state);
  const msg = { id: `${state.day}-${ext.raids}-${ext.inbox.length}-${Math.floor(state.minutes)}`, day: state.day, title, text, read: false };
  ext.inbox.unshift(msg);
  if (ext.inbox.length > INBOX_MAX) ext.inbox.length = INBOX_MAX;
  return msg;
}

export const unreadInbox = (state) => pol(state).inbox.filter((m) => !m.read).length;

export function markInboxRead(state) {
  for (const m of pol(state).inbox) m.read = true;
}
