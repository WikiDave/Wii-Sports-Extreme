// The zones of Wahoe-eiland (see docs/ONTWERP.md). x runs east, z runs south, in metres.
// Each zone is a landmass: profile 'plateau' (flat top), 'hill' or 'cone' (the volcano).

export const SEA_LEVEL = 0;

export const ZONES = [
  { id: 'heuvels', name: 'Resort-heuvels', x: -40, z: 10, r: 240, h: 55, profile: 'hill', rank: 3 },
  { id: 'strand', name: 'Strand-Zuid', x: 20, z: 230, r: 150, h: 2.2, profile: 'plateau', rank: 1 },
  { id: 'haven', name: 'Havenstad', x: 250, z: 70, r: 140, h: 5, profile: 'plateau', rank: 1 },
  { id: 'kaap', name: 'Vuurtorenkaap', x: -270, z: -150, r: 110, h: 24, profile: 'plateau', rank: 2 },
  { id: 'vulkaan', name: 'Vulkaanberg', x: 40, z: -230, r: 170, h: 120, profile: 'cone', rank: 4 },
  { id: 'vliegveld', name: 'Vliegveld-eiland', x: 470, z: -300, r: 110, h: 3.5, profile: 'plateau', rank: 5 },
];
