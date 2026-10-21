// Police cars: how many drive the island at each heat level, how long they wait at a checkpoint,
// and what a checkpoint does to you. Pure logic (the cars themselves are in cars3d.js).

export const CAR_SPEED = 10; // metres per second
export const CHECKPOINT_STOP = 6; // seconds a car waits at a checkpoint
export const CHECKPOINT_NEAR = 16; // metres: the agent talks to you from this close
export const CHECKPOINT_HEAT = 0.6; // heat added when you carry product through it
export const SIREN_RANGE = 90; // metres: the siren is heard from this close

/** Patrol cars on the island at a heat level: none below 3, one at 3, two at 4. */
export const carsFor = (level) => (level >= 4 ? 2 : level >= 3 ? 1 : 0);

/** A roadblock stands across the road from level 4. */
export const roadblockFor = (level) => level >= 4;

/** What a checkpoint does: nothing when you are not near; heat when you carry product. */
export function checkpointOutcome(carriedUnits, near) {
  if (!near) return null;
  return carriedUnits > 0 ? { heat: CHECKPOINT_HEAT, searched: true } : { heat: 0, searched: false };
}
