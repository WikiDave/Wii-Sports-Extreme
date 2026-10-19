// Effects a product can carry (max 6). factor adds to the price: price = base x (1 + sum).
export const EFFECTS = {
  fris: { name: 'Fris', factor: 0.1, color: '#f5e04a' },
  zoet: { name: 'Zoet', factor: 0.12, color: '#ff9ec7' },
  verkoelend: { name: 'Verkoelend', factor: 0.2, color: '#7fe0e8' },
  tropisch: { name: 'Tropisch', factor: 0.25, color: '#f2b45a' },
  bruisend: { name: 'Bruisend', factor: 0.32, color: '#bfe8ff' },
  ijzig: { name: 'IJzig', factor: 0.38, color: '#a8d8ff' },
  zonnig: { name: 'Zonnig', factor: 0.44, color: '#ffc93c' },
  giechel: { name: 'Giechel', factor: 0.5, color: '#ff7aa8' },
};
