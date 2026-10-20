// Places you can own. `slots` = how many staff fit, `stations` = production stations, `storage` = units of stock the place holds
// (the sum over owned places is your stock limit). `rank` unlocks buying.
export const PROPERTIES = {
  hut: { name: 'Strandhut', price: 0, slots: 1, storage: 40, stations: 1, rank: 0 },
  loods: { name: 'Loods bij de haven', price: 2500, slots: 3, storage: 150, stations: 2, rank: 2 },
  villa: { name: 'Villa in de heuvels', price: 12000, slots: 5, storage: 400, stations: 3, rank: 3 },
  grot: { name: 'Grotkeuken', price: 40000, slots: 8, storage: 900, stations: 4, rank: 4 },
};
