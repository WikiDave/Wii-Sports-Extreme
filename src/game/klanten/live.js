// The world of the customers as the island built it (real front doors and places), shared by the
// customer view and the phone. Before the island exists, or in tests, a default world is used.

import { buildWorld } from './places.js';

let live = null;

export const setLiveWorld = (world) => {
  live = world;
};

export const getLiveWorld = () => (live ??= buildWorld());
