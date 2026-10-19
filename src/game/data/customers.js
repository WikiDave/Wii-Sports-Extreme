// The customers: Miis from the island. `mii` is the name of an official Mii (their looks),
// `budget` the most they spend per visit, `likes` three effects they love, `schedule` where
// they are when (hours; to < from means past midnight). `unlock`: loyalty of another
// customer that introduces them, or a rank.
export const CUSTOMERS = [
  { id: 'saburo', name: 'Saburo', mii: 'Saburo', budget: 40, likes: ['fris', 'zoet', 'tropisch'], spot: 'strand', schedule: [[8, 18]], unlock: null },
  { id: 'fumiko', name: 'Fumiko', mii: 'Fumiko', budget: 60, likes: ['zoet', 'verkoelend', 'giechel'], spot: 'strand', schedule: [[10, 20]], unlock: null },
  { id: 'daisuke', name: 'Daisuke', mii: 'Daisuke', budget: 90, likes: ['bruisend', 'ijzig', 'fris'], spot: 'haven', schedule: [[9, 17]], unlock: { loyalty: ['saburo', 20] } },
  { id: 'sakura', name: 'Sakura', mii: 'Sakura', budget: 130, likes: ['tropisch', 'zonnig', 'giechel'], spot: 'haven', schedule: [[12, 22]], unlock: { loyalty: ['fumiko', 20] } },
  { id: 'andy', name: 'Andy', mii: 'Andy', budget: 200, likes: ['ijzig', 'zonnig', 'bruisend'], spot: 'strand', schedule: [[18, 28]], unlock: { rank: 1 } },
];
