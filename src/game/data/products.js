// Base products (see docs/ONTWERP.md). A batch uses `needs` from the stock and gives
// `yield` units, and takes `time` game minutes in a station; every mixed-in ingredient costs one unit per batch. `rank` is the rank
// (see state.js RANKS) that unlocks the product.
export const PRODUCTS = {
  limonade: { name: 'Limonade', base: 20, effect: 'fris', needs: { citroen: 2 }, yield: 4, rank: 0, time: 25 },
  snoep: { name: 'Snoep', base: 45, effect: 'zoet', needs: { suiker: 2 }, yield: 5, rank: 2, time: 45 },
  ijs: { name: 'IJs', base: 80, effect: 'ijzig', needs: { melk: 2 }, yield: 4, rank: 3, time: 70 },
};

/** Base goods sold at the market (not mixable). */
export const GOODS = {
  citroen: { name: 'Citroen', price: 4 },
  melk: { name: 'Melk', price: 9 },
};
