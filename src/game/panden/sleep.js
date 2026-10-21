// Sleeping in one of your beds: the day ends (Game.sleep), with the comfort bonus of that place.
// Pure logic; the morning dialog is in ui/sleepUi.js.

import { comfortBonus } from './upgrades.js';

/** Sleeps in the bed of property id. Returns { heat, xp } (the bonus given) or null if you do not own it. */
export function sleepAt(game, id) {
  const s = game.state;
  if (!s.properties.includes(id)) return null;
  const bonus = comfortBonus(s, id);
  game.sleep();
  if (bonus.heat) {
    s.heat = Math.max(0, s.heat - bonus.heat);
    game.emit('heat', Math.floor(s.heat));
  }
  if (bonus.xp) game.addXp(bonus.xp);
  game.emit('change');
  game.save();
  return bonus;
}
