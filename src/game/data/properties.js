// Places you can own. `slots` = how many staff fit, `stations` = production stations, `storage` = units of stock the place holds
// (the sum over owned places is your stock limit). `rank` unlocks buying. `tier` (1..4) scales the price of upgrades.
export const PROPERTIES = {
  hut: { name: 'Strandhut', price: 0, slots: 1, storage: 40, stations: 1, rank: 0, tier: 1 },
  loods: { name: 'Loods bij de haven', price: 2500, slots: 3, storage: 150, stations: 2, rank: 2, tier: 2 },
  villa: { name: 'Villa in de heuvels', price: 12000, slots: 5, storage: 400, stations: 3, rank: 3, tier: 3 },
  grot: { name: 'Grotkeuken', price: 40000, slots: 8, storage: 900, stations: 4, rank: 4, tier: 4 },
};

/** Upgrade tracks. `costs[level]` is the price to go from that level to the next (x the property's tier). Max level 3. */
export const UPGRADES = {
  security: { name: 'Beveiliging', text: "Sloten en camera's: de politie valt minder vaak binnen.", costs: [300, 1000, 2500] },
  storage: { name: 'Opslag', text: 'Meer ruimte: +25% voorraad en kistruimte per niveau.', costs: [300, 900, 2400] },
  speed: { name: 'Productie', text: 'Stations werken sneller: 15% minder tijd per niveau.', costs: [400, 1200, 3000] },
  comfort: { name: 'Comfort', text: 'Lekker slapen: de bewaking vergeet je sneller en je rust uit.', costs: [200, 600, 1500] },
  decor: { name: 'Decoratie', text: 'Verf en bloemen; vanaf niveau 1 kies je de kleur van de muren.', costs: [150, 450, 1100] },
};

/** Paint colours for the walls (decor level 1 and up). Index 0 is the original colour of the building. */
export const PAINTS = [
  { id: 'origineel', name: 'Origineel', color: '#f4f1ea' },
  { id: 'roze', name: 'Roze', color: '#ffc9d6' },
  { id: 'mint', name: 'Mint', color: '#bfeedb' },
  { id: 'zon', name: 'Zon', color: '#ffe27a' },
];
