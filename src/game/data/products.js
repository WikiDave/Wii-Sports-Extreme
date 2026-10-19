// Base products (see docs/ONTWERP.md). A batch uses `needs` from the stock and gives
// `yield` bottles; every mixed-in ingredient costs one unit per batch.
export const PRODUCTS = {
  limonade: { name: 'Limonade', base: 20, effect: 'fris', needs: { citroen: 2 }, yield: 4, rank: 0 },
};

/** Base goods sold at the market (not mixable). */
export const GOODS = {
  citroen: { name: 'Citroen', price: 4 },
};
