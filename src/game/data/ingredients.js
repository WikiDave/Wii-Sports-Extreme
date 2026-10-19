// Ingredients from the market in Havenstad. Mixing one in adds its effect and first
// changes effects already there (from -> to), like Schedule I's mixing.
export const INGREDIENTS = {
  suiker: { name: 'Suiker', price: 3, effect: 'zoet', changes: { verkoelend: 'ijzig' } },
  munt: { name: 'Munt', price: 6, effect: 'verkoelend', changes: { zoet: 'bruisend' } },
  kokos: { name: 'Kokos', price: 8, effect: 'tropisch', changes: { fris: 'zonnig', bruisend: 'giechel' } },
  citroenrasp: { name: 'Citroenrasp', price: 5, effect: 'fris', changes: { tropisch: 'zonnig' } },
  bosbes: { name: 'Bosbes', price: 7, effect: 'zoet', changes: { fris: 'bruisend', verkoelend: 'ijzig' } },
  chili: { name: 'Chili', price: 10, effect: 'zonnig', changes: { zoet: 'giechel', ijzig: 'verkoelend' } },
  vanille: { name: 'Vanille', price: 12, effect: 'zoet', changes: { tropisch: 'zonnig' } },
};
