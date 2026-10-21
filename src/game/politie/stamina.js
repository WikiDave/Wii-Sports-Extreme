// Stamina ("puf"): running drains it, walking and standing still refill it. When it is empty you
// walk until it is back at 30. Pure logic; the state is a small object that is changed in place.

export const STAMINA_MAX = 100;
export const DRAIN = 26; // per second while running on land
export const DRAIN_WATER = 14; // while running through the water
export const REFILL_WALK = 12;
export const REFILL_STILL = 20;
export const WAKE_AT = 30;

export const newStamina = () => ({ value: STAMINA_MAX, out: false });

/** One step of dt seconds. move: { moving, running, swimming } booleans. Returns st. */
export function stepStamina(st, { moving = false, running = false, swimming = false } = {}, dt = 0) {
  let v = st.value;
  if (running && moving) v -= (swimming ? DRAIN_WATER : DRAIN) * dt;
  else v += (moving ? REFILL_WALK : REFILL_STILL) * dt;
  st.value = Math.max(0, Math.min(STAMINA_MAX, v));
  if (st.value <= 0) st.out = true;
  else if (st.out && st.value >= WAKE_AT) st.out = false;
  return st;
}

/** Whether the player may run now. */
export const canRun = (st) => !st.out;
